// 知识岛 · 服务安全重启脚本
// 解决「旧 next 服务占端口 / 边跑边重建导致 webpack-runtime 报错」的坑：
// 任何启动 / 重建动作前，先释放目标端口的占用进程，再执行。
//
// 用法：
//   node scripts/server.mjs                 # 释放 3000 后 next start
//   node scripts/server.mjs 3311            # 释放 3311 后 next start
//   node scripts/server.mjs --dev           # 释放 3000 后 next dev
//   node scripts/server.mjs --build         # 释放端口 → 重新构建 → next start
//   node scripts/server.mjs --stop          # 只释放端口，不启动
//   PORT=3311 node scripts/server.mjs       # 用环境变量指定端口
//
// 对应 npm 命令：start:clean / dev:clean / restart / stop

import { execSync, spawn } from "node:child_process";
import os from "node:os";

const args = process.argv.slice(2);
const stopOnly = args.includes("--stop");
const shouldBuild = args.includes("--build");
const devMode = args.includes("--dev");
const portArg = args.find((a) => /^\d+$/.test(a));
const port = Number(portArg || process.env.PORT || 3000);

/** 释放指定端口的占用进程（跨平台） */
function killPort(p) {
  if (os.platform() === "win32") {
    let out = "";
    try {
      out = execSync("netstat -ano", { encoding: "utf8", shell: true });
    } catch {
      return;
    }
    const pids = new Set();
    for (const line of out.split("\n")) {
      if (!new RegExp(`:${p}(\\s|$)`).test(line)) continue;
      const cols = line.trim().split(/\s+/);
      const pid = cols[cols.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    if (pids.size === 0) {
      console.log(`  ℹ️  端口 ${p} 当前无占用`);
      return;
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F /T`, { shell: true, stdio: "ignore" });
        console.log(`  ✅ 已结束占用端口 ${p} 的进程 PID=${pid}`);
      } catch {
        /* 可能已自行退出 */
      }
    }
  } else {
    try {
      execSync(`fuser -k ${p}/tcp`, { shell: true, stdio: "ignore" });
    } catch {
      /* 无占用 */
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (stopOnly) {
    console.log(`\n🛑 停止端口 ${port} 上的服务...`);
    killPort(port);
    console.log("完成。\n");
    process.exit(0);
  }

  console.log(`\n🔧 准备在端口 ${port} 启动服务（先释放占用）...`);
  killPort(port);
  await sleep(800); // 等端口真正释放，避免立即绑定 EADDRINUSE

  if (shouldBuild) {
    console.log("📦 重新构建（--build）...");
    execSync("npx next build --webpack", {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, NODE_OPTIONS: "" },
    });
  }

  const cmd = devMode
    ? ["next", "dev", "-p", String(port)]
    : ["next", "start", "-p", String(port)];
  console.log(`🚀 启动：${cmd.join(" ")}\n`);
  const child = spawn("npx", cmd, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NODE_OPTIONS: "" },
  });
  child.on("error", (e) => {
    console.error(e);
    process.exit(1);
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main();

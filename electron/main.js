/**
 * 知识岛 · Electron 主进程
 * 职责：启动内置 Next.js standalone 服务 → 等待就绪 → 打开应用窗口。
 * - 随机空闲端口（避免 3000 被占用）
 * - 数据库写入用户目录（KB_DATA_DIR，安装目录可能只读）
 * - 单实例锁：重复启动聚焦已有窗口；关窗退出时服务随主进程结束
 * - 运行日志写 userData/electron.log（桌面版无控制台，启动失败可查此文件）
 * 打包形态：electron-builder portable（便携免安装，双击即用）
 */
const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const net = require("net");
const http = require("http");
const fs = require("fs");

const isDev = !app.isPackaged;
// standalone 服务目录：开发时走 .next/standalone，打包后在 asar 内同一相对路径
const SERVER_DIR = path.join(__dirname, "..", ".next", "standalone");
const SERVER_ENTRY = path.join(SERVER_DIR, "server.js");

// ---------------------------------------------------------------------------
// 运行日志：桌面版没有控制台，关键启动步骤 / 错误写进用户目录，方便排查
// ---------------------------------------------------------------------------
let logFile = null;
function initLog() {
  try {
    const dir = app.getPath("userData");
    fs.mkdirSync(dir, { recursive: true });
    logFile = path.join(dir, "electron.log");
    fs.writeFileSync(logFile, "");
  } catch {
    /* 日志写失败不影响启动 */
  }
}
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map((a) => (a && a.stack ? a.stack : String(a))).join(" ")}`;
  console.log(line);
  if (logFile) {
    try {
      fs.appendFileSync(logFile, line + "\n");
    } catch {
      /* 忽略 */
    }
  }
}

/** 找一个空闲端口 */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

/** 轮询等待服务就绪（HTTP 返回任意响应即认为启动完成） */
function waitForServer(port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 2000 }, (res) => {
        res.resume();
        resolve(port);
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) return reject(new Error("本地服务启动超时"));
        setTimeout(tick, 300);
      });
      req.on("timeout", () => req.destroy());
    };
    tick();
  });
}

let serverStarted = false;

async function startNextServer(port) {
  if (serverStarted) return;
  serverStarted = true;
  // 数据库写用户目录（打包后程序目录可能无写权限）
  process.env.KB_DATA_DIR = app.getPath("userData");
  process.env.PORT = String(port);
  process.env.HOSTNAME = "127.0.0.1";
  process.env.NODE_ENV = "production";
  log("启动内置服务 KB_DATA_DIR=", process.env.KB_DATA_DIR, "PORT=", port);
  // standalone server.js 在加载时即启动 HTTP 监听（Next 16 自包含服务器）
  require(SERVER_ENTRY);
  log("standalone server.js 已加载");
}

let mainWindow = null;
let activePort = null;

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "知识岛 · 驯养你的 AI 伙伴",
    autoHideMenuBar: true,
    show: false, // 先隐藏，等页面可交互再显示，避免白屏闪烁
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // 纯本地服务，允许访问本机端口
      webSecurity: true,
    },
  });
  mainWindow.loadURL(`http://127.0.0.1:${port}`);
  // 页面 ready-to-show 再显示，避免白屏
  mainWindow.once("ready-to-show", () => mainWindow.show());
  // 窗口标题跟随页面
  mainWindow.on("page-title-updated", (e, title) => {
    e.preventDefault();
    mainWindow.setTitle(title || "知识岛");
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  log("窗口已创建 port=", port);
  return mainWindow;
}

/** 聚焦已有窗口（单实例重复启动时调用） */
function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function showStartupError(err) {
  log("启动失败:", err);
  try {
    dialog.showErrorBox("知识岛启动失败", String(err && err.message ? err.message : err));
  } catch {
    /* 忽略 */
  }
}

// 单实例：重复启动时聚焦已有窗口
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    log("检测到重复启动，聚焦已有窗口");
    focusMainWindow();
  });

  app.whenReady().then(async () => {
    initLog();
    log("Electron 就绪 isDev=", isDev);
    try {
      const port = await findFreePort();
      log("取得空闲端口", port);
      await startNextServer(port);
      await waitForServer(port);
      log("本地服务已就绪 http://127.0.0.1:", port);
      activePort = port;
      createWindow(port);
    } catch (err) {
      showStartupError(err);
      app.quit();
    }

    // macOS：Dock 图标点击且无窗口时重建（Windows/Linux 忽略）
    app.on("activate", () => {
      if (activePort && BrowserWindow.getAllWindows().length === 0) {
        createWindow(activePort);
      }
    });
  });
}

// 所有窗口关闭 → 退出（服务随主进程终止）
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resetSparks,
  resetProgress,
  getDifficulty,
  adjustDifficulty,
  setIslandLevelAction,
  bumpAllIslands,
  bumpAllSpirits,
  unlockAllContent,
  getIslandsAction,
  getConfigAction,
  setConfigAction,
} from "@/lib/actions";

/**
 * 测试工具（demo 专用）：浮动在左下角
 * - 🔄 刷新：强制重新拉取服务端数据
 * - ♻️ 清空火花：重置好奇心火花，验证神秘小怪的解锁/消失
 * - 🗑️ 重置全部：岛屿解锁、Boss 净化、精灵进化、火花全部归零
 * - 🏰 岛屿档位：一键设岛档位 / 全岛拉满（模拟守卫打赢 → 解锁进阶练习）
 * - ⚙️ config：参数化数值调节（升级场次 / 难度权重 / 卡关阈值）
 */
export default function TestTools() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null); // null | 'reset' | 'unlock'
  const [diff, setDiff] = useState<number | null>(null);
  const [islands, setIslands] = useState<string[]>([]);
  const [selIsland, setSelIsland] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});

  /** 打开时预载：岛列表 + config 当前值 */
  async function load() {
    const [is, cfg] = await Promise.all([getIslandsAction(), getConfigAction()]);
    setIslands(is);
    setSelIsland((cur) => cur || is[0] || "");
    setConfig(cfg);
  }

  function setIslandLv(level: number) {
    if (!selIsland) return;
    startTransition(async () => {
      await setIslandLevelAction(selIsland, level);
      router.refresh();
      flash(`${selIsland} → Lv.${level}`);
    });
  }

  function allIslands(level: number) {
    startTransition(async () => {
      await bumpAllIslands(level);
      router.refresh();
      flash(`全部岛屿 → Lv.${level}`);
    });
  }

  function pullSpirits() {
    startTransition(async () => {
      await bumpAllSpirits();
      router.refresh();
      flash("精灵等级已拉满，觉醒广播触发！");
    });
  }

  /** 一键解锁全部内容（demo 体验模式：保留进度，补齐 29 精灵 + 30 觉醒 + 全岛满级，两步确认） */
  function unlockAll() {
    if (confirming !== "unlock") {
      setConfirming("unlock");
      flash("再次点击「确认解锁全部」即解锁全部内容（保留当前进度）");
      return;
    }
    setConfirming(null);
    startTransition(async () => {
      await unlockAllContent();
      router.refresh();
      window.location.href = "/";
    });
  }

  function saveConfig(key: string, value: string) {
    startTransition(async () => {
      await setConfigAction(key, value);
      setConfig((c) => ({ ...c, [key]: value }));
      router.refresh();
      flash(`${key} = ${value}`);
    });
  }

  function refresh() {
    router.refresh();
    flash("已刷新服务端数据");
  }

  /** 手动微调难度（±1）：整体难度 = 已解锁岛数 + 偏置 */
  function bump(delta: number) {
    startTransition(async () => {
      try {
        await adjustDifficulty(delta);
        const d = await getDifficulty();
        setDiff(d);
        router.refresh();
        flash(delta > 0 ? `难度已上调 → Lv.${d}` : `难度已下调 → Lv.${d}`);
      } catch {
        flash("调整失败，请重试");
      }
    });
  }

  function clear() {
    startTransition(async () => {
      try {
        await resetSparks();
        router.refresh();
        flash("火花已清零");
      } catch {
        flash("清理失败，请重试");
      }
    });
  }

  function resetAll() {
    // 两步确认：先点一次进入确认态，再点一次才真正执行
    // （避免误触，且不依赖常被内嵌浏览器屏蔽的 window.confirm）
    if (confirming !== "reset") {
      setConfirming("reset");
      flash("再次点击「确认重置」即清空全部进度");
      return;
    }
    setConfirming(null);
    startTransition(async () => {
      try {
        await resetProgress();
        // 硬刷新兜底：绕过一切客户端缓存，确保各页面拿到重置后的最新数据
        router.refresh();
        window.location.href = "/";
      } catch {
        flash("重置失败，请重试");
      }
    });
  }

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 1600);
  }

  return (
    <div className="fixed bottom-24 left-3 z-50 flex flex-col items-start gap-2">
      {msg && (
        <span className="animate-pop rounded-md border-2 border-[#2b3a4a] bg-[#22303f] px-2 py-1 text-xs font-bold text-white shadow-md">
          {msg}
        </span>
      )}
      {open && (
        <div className="flex flex-col gap-2">
          <button
            onClick={refresh}
            className="btn btn-white px-3 py-1.5 text-xs shadow-md"
            title="强制重新拉取服务端数据"
          >
            🔄 刷新数据
          </button>
          <button
            onClick={clear}
            disabled={pending}
            className="btn btn-white px-3 py-1.5 text-xs shadow-md disabled:opacity-60"
            title="清空好奇心火花（神秘小怪会重新锁上）"
          >
            {pending ? "清理中…" : "♻️ 清空火花"}
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => bump(-1)}
              disabled={pending}
              className="btn btn-white px-2 py-1.5 text-xs shadow-md disabled:opacity-60"
              title="整体难度下调一级（已解锁岛数不变，偏置 -1）"
            >
              ➖
            </button>
            <span
              className="min-w-[58px] rounded border-2 border-[#2b3a4a] bg-[#22303f] px-1.5 py-1 text-center text-xs font-black text-white"
              title="本岛难度 = 1 + 已开下游岛数 + 2×(精灵等级−1) + 手动偏置。精灵升级或本岛开了新岛都会让本岛变难"
            >
              难度 Lv.{diff ?? "?"}
            </span>
            <button
              onClick={() => bump(1)}
              disabled={pending}
              className="btn btn-white px-2 py-1.5 text-xs shadow-md disabled:opacity-60"
              title="整体难度上调一级（已解锁岛数不变，偏置 +1）"
            >
              ➕
            </button>
          </div>

          {/* 第二阶段：岛屿档位 + 精灵等级 + config（觉醒系统演示） */}
          <div className="w-56 rounded-lg border-2 border-[#ffb300] bg-[#fff8e1] p-2">
            <p className="mb-1.5 text-[11px] font-black text-[#a66d00]">🏰 岛屿档位（守卫打赢→升级）</p>
            <div className="flex items-center gap-1">
              <select
                value={selIsland}
                onChange={(e) => setSelIsland(e.target.value)}
                className="min-w-0 flex-1 rounded border-2 border-[#2b3a4a] bg-white px-1 py-1 text-xs font-bold text-[#2b3a4a]"
              >
                {islands.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
              {[2, 3, 4].map((lv) => (
                <button
                  key={lv}
                  onClick={() => setIslandLv(lv)}
                  disabled={pending}
                  className="btn btn-white px-1.5 py-1 text-xs shadow disabled:opacity-60"
                >
                  Lv{lv}
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1">
              <button
                onClick={() => allIslands(4)}
                disabled={pending}
                className="btn px-1.5 py-1 text-xs text-white shadow disabled:opacity-60"
                style={{ background: "#e2582e" }}
              >
                🚀 全岛拉满
              </button>
              <button
                onClick={pullSpirits}
                disabled={pending}
                className="btn px-1.5 py-1 text-xs text-white shadow disabled:opacity-60"
                style={{ background: "#185fa5" }}
                title="一键拉满所有精灵等级 → 触发全部觉醒广播"
              >
                ✨ 拉精灵等级
              </button>
            </div>
          </div>

          <div className="w-56 rounded-lg border-2 border-[#8a97a5] bg-[#f1f4f7] p-2">
            <p className="mb-1.5 text-[11px] font-black text-[#5f6b78]">⚙️ 数值调节（config）</p>
            {(
              [
                ["xp_threshold", "升级场次"],
                ["diff_a", "难度·下游岛权重"],
                ["diff_b", "难度·精灵等级权重"],
                ["boss_stuck_attempts", "卡关阈值"],
                ["step_max", "每场上限"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="mb-1 flex items-center gap-1">
                <span className="w-28 truncate text-[10px] font-bold text-[#7a8a9a]">{label}</span>
                <input
                  type="number"
                  value={config[key] ?? ""}
                  onChange={(e) => saveConfig(key, e.target.value)}
                  className="w-16 rounded border-2 border-[#2b3a4a] bg-white px-1 py-0.5 text-xs font-bold text-[#2b3a4a]"
                />
              </div>
            ))}
          </div>
          <button
            onClick={resetAll}
            disabled={pending}
            className={`btn px-3 py-1.5 text-xs text-white shadow-md disabled:opacity-60 ${confirming === "reset" ? "animate-pulse" : ""}`}
            style={{ background: confirming === "reset" ? "#c62828" : "#e2582e" }}
            title="岛屿/Boss/精灵/火花全部归零，回到计数岛"
          >
            {confirming === "reset" ? "⚠️ 确认重置？" : "🗑️ 重置全部进度"}
          </button>
          <button
            onClick={unlockAll}
            disabled={pending}
            className={`btn px-3 py-1.5 text-xs text-white shadow-md disabled:opacity-60 ${confirming === "unlock" ? "animate-pulse" : ""}`}
            style={{ background: confirming === "unlock" ? "#185fa5" : "#1d9e75" }}
            title="不动当前进度，直接补齐全部内容（29 精灵 + 30 觉醒 + 全岛满级），demo 体验模式"
          >
            {confirming === "unlock" ? "⚠️ 确认解锁全部？" : "🔓 一键解锁全部"}
          </button>
        </div>
      )}
      <button
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) {
              getDifficulty().then(setDiff);
              load();
            }
            return next;
          });
          setConfirming(null);
        }}
        className="rounded-lg border-2 border-dashed border-[#7a8a9a] bg-white/80 px-2.5 py-1 text-xs font-black text-[#7a8a9a] shadow-md backdrop-blur hover:bg-white"
        title="测试工具"
      >
        {open ? "× 关闭" : "🧪 测试"}
      </button>
    </div>
  );
}

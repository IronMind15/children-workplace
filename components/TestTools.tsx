"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetSparks, resetProgress, getDifficulty, adjustDifficulty } from "@/lib/actions";

/**
 * 测试工具（demo 专用）：浮动在左下角
 * - 🔄 刷新：强制重新拉取服务端数据
 * - ♻️ 清空火花：重置好奇心火花，验证神秘小怪的解锁/消失
 * - 🗑️ 重置全部：岛屿解锁、Boss 净化、精灵进化、火花全部归零
 */
export default function TestTools() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [diff, setDiff] = useState<number | null>(null);

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
    if (!confirming) {
      setConfirming(true);
      flash("再次点击「确认重置」即清空全部进度");
      return;
    }
    setConfirming(false);
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
            className="pixel-btn pixel-btn-white px-3 py-1.5 text-xs shadow-md"
            title="强制重新拉取服务端数据"
          >
            🔄 刷新数据
          </button>
          <button
            onClick={clear}
            disabled={pending}
            className="pixel-btn pixel-btn-white px-3 py-1.5 text-xs shadow-md disabled:opacity-60"
            title="清空好奇心火花（神秘小怪会重新锁上）"
          >
            {pending ? "清理中…" : "♻️ 清空火花"}
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => bump(-1)}
              disabled={pending}
              className="pixel-btn pixel-btn-white px-2 py-1.5 text-xs shadow-md disabled:opacity-60"
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
              className="pixel-btn pixel-btn-white px-2 py-1.5 text-xs shadow-md disabled:opacity-60"
              title="整体难度上调一级（已解锁岛数不变，偏置 +1）"
            >
              ➕
            </button>
          </div>
          <button
            onClick={resetAll}
            disabled={pending}
            className={`pixel-btn px-3 py-1.5 text-xs text-white shadow-md disabled:opacity-60 ${confirming ? "animate-pulse" : ""}`}
            style={{ background: confirming ? "#c62828" : "#e2582e" }}
            title="岛屿/Boss/精灵/火花全部归零，回到计数岛"
          >
            {confirming ? "⚠️ 确认重置？" : "🗑️ 重置全部进度"}
          </button>
        </div>
      )}
      <button
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) getDifficulty().then(setDiff);
            return next;
          });
          setConfirming(false);
        }}
        className="rounded-lg border-2 border-dashed border-[#7a8a9a] bg-white/80 px-2.5 py-1 text-xs font-black text-[#7a8a9a] shadow-md backdrop-blur hover:bg-white"
        title="测试工具"
      >
        {open ? "× 关闭" : "🧪 测试"}
      </button>
    </div>
  );
}

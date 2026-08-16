"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

const LONG_PRESS_MS = 800;

/**
 * 设置入口（REQ-PARENT-01 隐藏入口）：
 * - 点击 → 大脑编辑器（/brain）
 * - 长按 800ms → 家长端·伙伴日记（/parent）
 * 触控目标 ≥44px（需求 9.5）。
 */
export default function SettingsEntry() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);

  function start() {
    longFired.current = false;
    timer.current = setTimeout(() => {
      longFired.current = true;
      router.push("/parent");
    }, LONG_PRESS_MS);
  }

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  return (
    <button
      type="button"
      aria-label="设置（长按进入伙伴日记）"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (!longFired.current) router.push("/brain");
      }}
      className="flex h-11 w-11 select-none items-center justify-center rounded-full bg-white/90 text-2xl shadow-card transition-transform active:scale-95"
      style={{ touchAction: "manipulation" }}
    >
      ⚙️
    </button>
  );
}

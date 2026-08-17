"use client";

/**
 * AskPanel：右侧常驻 AI 聊面板（取代 AskInline）
 *  - 内嵌 AskFlow 的全部能力（输入框 / 推荐问题 / 火花 / AI 状态 / 对话气泡 / 费曼小课堂）
 *  - 无需跳转 /ask（旧 /ask 路由仍保留为深链）
 *  - 行为：
 *    · 宽屏（≥1024px）：默认展开为右栏
 *    · 窄屏：默认最小化成右下角「小狐狸浮标」，点击展开
 *  - 浮标可拖动到屏幕任意位置（localStorage 记忆位置）
 *  - 拖动手柄：面板标题栏 + 浮标本身都可拖
 */

import { useEffect, useRef, useState } from "react";
import AskFlow from "@/components/AskFlow";

type Q = { id: string; emoji: string; label: string; category: string; badge?: string };
type Reward = { name: string; required: number };

const POS_KEY = "askpanel:pos";
const MIN_KEY = "askpanel:minimized";

type Pos = { x: number; y: number };

function readPos(): Pos | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pos;
    if (typeof p.x === "number" && typeof p.y === "number") return p;
  } catch {}
  return null;
}

function savePos(p: Pos) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(p));
  } catch {}
}

function readMin(): boolean {
  if (typeof window === "undefined") return false;
  // 窄屏默认收起；宽屏默认展开
  if (window.innerWidth < 1024) return true;
  try {
    return localStorage.getItem(MIN_KEY) === "1";
  } catch {
    return false;
  }
}

export default function AskPanel({
  questions,
  sparks,
  todayCount,
  rewards,
  aiConfigured,
  recentMetas,
}: {
  questions: Q[];
  sparks: number;
  todayCount: number;
  rewards: Reward[];
  aiConfigured: boolean;
  recentMetas: { id: string; name: string }[];
}) {
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 }); // 仅在 minimized 时使用
  const [ready, setReady] = useState(false);

  // 客户端 hydration 后读取 localStorage
  useEffect(() => {
    setMinimized(readMin());
    const p = readPos();
    if (p) setPos(p);
    setReady(true);
  }, []);

  function toggleMin() {
    const next = !minimized;
    setMinimized(next);
    try {
      localStorage.setItem(MIN_KEY, next ? "1" : "0");
    } catch {}
  }

  // 拖动（仅 minimized 时使用，浮标可拖到屏幕任意位置）
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (!minimized) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const nx = d.px + (e.clientX - d.ox);
    const ny = d.py + (e.clientY - d.oy);
    setPos({ x: nx, y: ny });
  }

  function onPointerUp() {
    if (dragRef.current) {
      dragRef.current = null;
      // 限制到视口内
      setPos((p) => {
        const w = typeof window === "undefined" ? 0 : window.innerWidth - 64;
        const h = typeof window === "undefined" ? 0 : window.innerHeight - 64;
        const cx = Math.max(8, Math.min(w, p.x));
        const cy = Math.max(8, Math.min(h, p.y));
        const out = { x: cx, y: cy };
        savePos(out);
        return out;
      });
    }
  }

  if (!ready) {
    // SSR 占位（避免 hydration mismatch）
    return <div className="hidden lg:block lg:w-[36%] lg:min-w-0" />;
  }

  // === 浮标态（最小化）===
  if (minimized) {
    return (
      <button
        type="button"
        onClick={toggleMin}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title="拖动到任意位置；点击展开「跟小狐狸聊」"
        className="ask-floating fixed z-40 flex h-14 w-14 select-none items-center justify-center rounded-full border-3 border-[#2b3a4a] bg-[#fff8e1] text-3xl shadow-card transition-transform hover:scale-110 active:scale-95"
        style={{ left: pos.x || undefined, top: pos.y || undefined, right: pos.x ? undefined : 16, bottom: pos.y ? undefined : 16, touchAction: "none" }}
      >
        🦊
        <span className="absolute -top-1 -right-1 rounded-full bg-[#ffb300] px-1.5 text-[10px] font-black text-white shadow-card">
          ✨{sparks}
        </span>
      </button>
    );
  }

  // === 展开态 ===
  return (
    <div className="ask-panel-shell relative flex h-full flex-col">
      {/* 浮标态的「最小化」按钮：仅在浮标位置为空时显示（默认右下角） */}
      <button
        type="button"
        onClick={toggleMin}
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#2b3a4a] bg-white text-base shadow-card transition-transform hover:scale-110"
        title="最小化为小狐狸浮标（可拖动）"
      >
        🦊
      </button>
      <div className="h-full min-h-0 overflow-hidden rounded-2xl border-3 border-[#2b3a4a] bg-[#fffdf5] shadow-card">
        <AskFlow
          questions={questions}
          sparks={sparks}
          todayCount={todayCount}
          rewards={rewards}
          aiConfigured={aiConfigured}
          recentMetas={recentMetas}
          embedded
        />
      </div>
    </div>
  );
}

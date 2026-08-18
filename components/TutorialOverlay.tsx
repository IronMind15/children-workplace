"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * 新手引导（高亮引导版 v2）
 * - 圈出界面上真实按钮的位置（聚光灯挖洞 + 箭头气泡），非常明显
 * - 逐步带着用户真实操作：点岛 → 点小怪 → 派精灵 → 答题 → 回地图 → 找小狐狸 → 毕业
 * - 不再「一个按钮传送过去自己操作」；跨视图（地图/岛/战斗）自动接续（sessionStorage）
 * - 修复旧版「去和小怪打之后没有下一步」：引导在岛/战斗视图也保持显示，并按视图自动推进
 */

export type TourStage = "map" | "island" | "battle" | "other";

type Step = {
  who: "fox" | "explorer";
  text: string;
  /** 高亮目标（data-tour 选择器）；null = 纯对话弹窗 */
  target?: string;
  /** 目标所在视图；进入该视图后自动推进（跨视图接续的核心） */
  waitFor?: TourStage[];
};

const STEP_KEY = "tour:step";

export function readTourStep(): number {
  try {
    const v = parseInt(sessionStorage.getItem(STEP_KEY) || "0", 10);
    return isNaN(v) || v < 0 ? 0 : v;
  } catch {
    return 0;
  }
}

/** 构造步骤：islandName 用于「点开你所在的岛」步骤的动态选择器 */
function buildSteps(islandName: string): Step[] {
  return [
    {
      who: "fox",
      text: "嘿，小小探险家！欢迎来到知识岛🌟 海上漂着好多小岛，岛上全是等着被你驯服的数学小怪！",
    },
    {
      who: "explorer",
      text: "看！这就是你的冒险群岛地图，按 7 大知识主题分页。下面我会一步步带你去冒险～",
      target: '[data-tour="map"]',
    },
    {
      who: "explorer",
      text: `先点开你所在的那座岛「${islandName}」吧！看这个闪光的圈圈，点它就行👇`,
      target: `[data-tour-island="${islandName}"]`,
      waitFor: ["island"],
    },
    {
      who: "fox",
      text: "岛上住着小怪！点一只小怪，开始战斗（选它会高亮的那个）",
      target: '[data-tour="minion"]',
      waitFor: ["battle"],
    },
    {
      who: "fox",
      text: "先派出本领最配的精灵！就是圈出来的这些，点一下就出战啦",
      target: '[data-tour="battle-pick"]',
    },
    {
      who: "fox",
      text: "答对这道题就能驯服小怪！别急，慢慢算，圈里就是选项",
      target: '[data-tour="battle-answer"]',
    },
    {
      who: "fox",
      text: "打完点「回到海图」🏝️，我们回地图继续",
      target: '[data-tour="battle-exit"]',
      waitFor: ["island", "map"],
    },
    {
      who: "explorer",
      text: "点左上角「返回群岛」，回到冒险地图",
      target: '[data-tour="back-map"]',
      waitFor: ["map"],
    },
    {
      who: "explorer",
      text: "右边一直陪着你的就是我——小狐狸 AI 伙伴！点开它，随时问问题",
      target: '[data-tour="ask"]',
    },
    {
      who: "fox",
      text: "答错的题会自动进错题本、打赢 Boss 能发现新本领…剩下的冒险就交给你啦！毕业快乐🎓",
    },
  ];
}

export default function TutorialOverlay({
  avatarSrc,
  initialIsland,
  stage,
  onClose,
  onStepChange,
  reset = false,
}: {
  avatarSrc?: string;
  initialIsland: string;
  /** 当前视图：map / island / battle / other */
  stage: TourStage;
  onClose: () => void;
  onStepChange?: (n: number) => void;
  /** 设置里「重看教程」(?tutorial=1) 时从头开始 */
  reset?: boolean;
}) {
  const [steps] = useState(() => buildSteps(initialIsland || "计数岛"));
  const [i, setI] = useState<number>(() => (reset ? 0 : readTourStep()));
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [viewH, setViewH] = useState(0);
  const [viewW, setViewW] = useState(0);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const step = steps[Math.min(i, steps.length - 1)];
  const isLast = i >= steps.length - 1;
  const isFox = step.who === "fox";
  const selector = step.target ?? null;

  useEffect(() => {
    if (reset) {
      try {
        sessionStorage.removeItem(STEP_KEY);
      } catch {}
    } else {
      try {
        sessionStorage.setItem(STEP_KEY, String(i));
      } catch {}
    }
    onStepChange?.(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, reset]);

  // 聚光灯跟随目标元素（300ms 轮询 + 滚动/缩放监听）
  useEffect(() => {
    setViewH(window.innerHeight);
    setViewW(window.innerWidth);
    if (!selector) {
      setRect(null);
      return;
    }
    const compute = () => {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        setRect(null);
        return;
      }
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    compute();
    const t = setInterval(compute, 300);
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      clearInterval(t);
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [selector, stage]);

  // 跨视图自动推进：进入目标视图后下一步
  useEffect(() => {
    const s = steps[i];
    if (s.waitFor && s.waitFor.includes(stage)) {
      setI((v) => Math.min(v + 1, steps.length - 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, i]);

  const advance = () => {
    if (isLast) finish();
    else setI((v) => v + 1);
  };

  function back() {
    setI((v) => Math.max(0, v - 1));
  }

  function finish() {
    try {
      sessionStorage.removeItem(STEP_KEY);
    } catch {}
    onClose();
  }

  // 气泡位置：有目标 → 在目标下方/上方 + 尽量横向偏移避开目标本体；无目标 → 居中弹窗
  let bubbleStyle: CSSProperties | undefined;
  let arrow: "up" | "down" | "none" = "none";
  if (rect) {
    const bw = Math.min(viewW - 24, 300);
    const bh = 170; // 估算气泡高度
    const centerX = rect.left + rect.width / 2;
    const rectBottom = rect.top + rect.height;
    const rectRight = rect.left + rect.width;
    // 横向：气泡与目标有较大横向重叠时，偏向空间大的一侧（避免盖住目标本身/其文字）
    const overlapX =
      Math.max(0, Math.min(rectRight, centerX + bw / 2) - Math.max(rect.left, centerX - bw / 2));
    let left = Math.max(12, Math.min(centerX - bw / 2, viewW - bw - 12));
    if (overlapX > 48 && rect.width < bw - 60) {
      const roomRight = viewW - rectRight - 12;
      const roomLeft = rect.left - 12;
      const tryLeft = roomRight >= bw - 60 ? rectRight + 12 : rect.left - bw - 12;
      if (tryLeft >= 12 && tryLeft + bw <= viewW - 12) left = tryLeft;
    }
    const spaceBelow = viewH - rectBottom - 26;
    const spaceAbove = rect.top - 26;
    if (spaceBelow >= bh && spaceBelow >= spaceAbove) {
      bubbleStyle = { left, top: rectBottom + 14, width: bw };
      arrow = "up";
    } else if (spaceAbove >= bh) {
      bubbleStyle = { left, top: Math.max(12, rect.top - bh - 14), width: bw };
      arrow = "down";
    } else {
      // 两侧都不够：放空间更大的一侧（允许轻微出界，浏览器会滚动）
      if (spaceBelow >= spaceAbove) {
        bubbleStyle = { left, top: Math.max(12, rectBottom + 14), width: bw };
        arrow = "up";
      } else {
        bubbleStyle = { left, top: Math.max(12, rect.top - bh - 14), width: bw };
        arrow = "down";
      }
    }
  } else {
    bubbleStyle = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }

  return (
    <div className="fixed inset-0 z-[70]" style={{ pointerEvents: "none" }}>
      {/* 聚光灯挖洞：目标外全部变暗，目标本身点亮 */}
      {rect && (
        <div
          className="absolute rounded-2xl"
          style={{
            left: rect.left - 8,
            top: rect.top - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: "0 0 0 9999px rgba(10,15,25,0.55)",
            border: "4px solid #ffd54f",
            borderRadius: 18,
          }}
        />
      )}
      {/* 小箭头 */}
      {rect && arrow !== "none" && (
        <div
          className="absolute h-3 w-3 rotate-45 border-l-2 border-t-2 border-[#ffd54f] bg-[#fffdf5]"
          style={
            arrow === "up"
              ? { left: rect.left + rect.width / 2 - 6, top: rect.top + rect.height + 6, zIndex: 2 }
              : { left: rect.left + rect.width / 2 - 6, top: rect.top - 16, zIndex: 2 }
          }
        />
      )}

      {/* 对话气泡 */}
      <div
        ref={bubbleRef}
        className="animate-pop w-full max-w-md rounded-3xl border-4 border-[#2b3a4a] bg-[#fffdf5] p-4 shadow-[0_8px_0_rgba(43,58,74,0.3)]"
        style={{ pointerEvents: "auto", ...bubbleStyle, position: "absolute" }}
      >
        <div className="flex items-end gap-3">
          {isFox ? (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-4 border-[#2b3a4a] bg-[#fff8e1] text-4xl shadow-card">
              🦊
            </div>
          ) : avatarSrc ? (
            <img src={avatarSrc} alt="小小探险家" className="h-14 w-14 shrink-0 rounded-2xl border-4 border-[#2b3a4a] bg-white object-cover shadow-card" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-4 border-[#2b3a4a] bg-[#dff1ff] text-4xl shadow-card">
              🧭
            </div>
          )}
          <div className="relative flex-1 rounded-2xl rounded-bl-none border-2 border-[#f79228] bg-white p-3 shadow-md">
            <p className="text-sm font-black text-[#e2582e]">{isFox ? "🦊 小狐狸" : "🧭 小小探险家"}</p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-[#2b3a4a]">{step.text}</p>
          </div>
        </div>

        {/* 进度点 */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {steps.map((_, idx) => (
            <span key={idx} className={`h-2 w-2 rounded-full ${idx === i ? "bg-[#f79228]" : "bg-[#e8edf2]"}`} />
          ))}
        </div>

        {/* 操作 */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <button onClick={finish} className="rounded-xl px-3 py-2 text-sm font-bold text-[#7a8a9a] transition-colors hover:bg-[#e8edf2]">
            跳过
          </button>
          <div className="flex gap-2">
            {i > 0 && !step.waitFor && (
              <button onClick={back} className="rounded-xl border-2 border-[#2b3a4a] bg-white px-4 py-1.5 text-sm font-black text-[#2b3a4a] transition-transform active:scale-95">
                上一步
              </button>
            )}
            {!step.waitFor && (
              <button
                onClick={advance}
                className="rounded-xl bg-[#f79228] px-5 py-1.5 text-sm font-black text-white shadow-[0_3px_0_#d97a12] transition-transform active:scale-95"
              >
                {isLast ? "毕业啦 🎓" : "继续 →"}
              </button>
            )}
            {step.waitFor && (
              <span className="animate-pulse rounded-xl bg-[#fde9d0] px-4 py-1.5 text-sm font-black text-[#a66d00]">
                按上面圈的地方点一下～
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type ActionKind = "none" | "battle" | "boss" | "mistakes" | "ask" | "finish";

type Step = {
  who: "fox" | "explorer";
  text: string;
  /** 大图标卡片：点它进入对应功能 / 推进学习路径 */
  big?: { icon: string; label: string; hint: string; action: ActionKind };
};

/**
 * 新手教程（重做版）：小狐狸 🦊 × 小小探险家 🧭 对话串讲，
 * 配「大图标」引导卡，明确指向学习路径，一步一步跟着操作走完主要功能：
 *   地图 → 打小怪 → 净化 Boss → 唤醒小狐狸 → 看错题本 → 毕业
 * - 默认只教一次（localStorage tutorial:done）；设置里可重看（?tutorial=1）
 * - 回到主界面自动接着教（步骤存 sessionStorage，跨跳转不丢）
 * - 第一次用某功能（如小狐狸助手）另有 FeatureCoach 单点教学
 */
const STEPS: Step[] = [
  {
    who: "fox",
    text: "嘿，小小探险家！欢迎来到知识岛🌟 海上漂着好多小岛，岛上全是等着被你驯服的数学小怪！",
  },
  {
    who: "explorer",
    text: "我看到地图上星星点点全是岛…每座岛上都住着数学小怪，点开一座岛就能去打怪、把本领收进精灵！",
    big: { icon: "🗺️", label: "认识群岛地图", hint: "下方就是你的冒险地图，点点看～", action: "none" },
  },
  {
    who: "fox",
    text: "先去打一只小怪试试！派出克制的精灵，用对的本领就能驯服它，精灵还会越练越强～",
    big: { icon: "⚔️", label: "去打一只小怪", hint: "点「去体验」直接开打", action: "battle" },
  },
  {
    who: "explorer",
    text: "驯服岛上的 Boss 就能「发现新本领」、解锁下一座岛！打赢知识守卫，精灵还能觉醒成完全体👑",
    big: { icon: "👑", label: "去净化一个 Boss", hint: "点「去体验」挑战 Boss", action: "boss" },
  },
  {
    who: "fox",
    text: "右边一直陪着你的就是我——小狐狸 AI 伙伴！不懂就问我，提问还能攒 ✨火花，攒够神秘小怪就出现啦～",
    big: { icon: "🦊", label: "唤醒小狐狸", hint: "看右边，随时点开问我", action: "ask" },
  },
  {
    who: "explorer",
    text: "答错的题会自动进错题本，按知识点归类，还能让小狐狸给综合解析和练习方法📒",
    big: { icon: "📒", label: "看看错题本", hint: "点「去体验」看看你的错题", action: "mistakes" },
  },
  {
    who: "fox",
    text: "记住：回到主界面会自动接着教，走完一遍就毕业啦！准备好出发了吗？🚀",
    big: { icon: "🚀", label: "完成教程 · 开始冒险", hint: "点「开始冒险」毕业", action: "finish" },
  },
];

const STEP_KEY = "tutorial:step";

function readStep(): number {
  try {
    const v = parseInt(localStorage.getItem(STEP_KEY) || "0", 10);
    return isNaN(v) || v < 0 || v >= STEPS.length ? 0 : v;
  } catch {
    return 0;
  }
}
function saveStep(n: number) {
  try {
    localStorage.setItem(STEP_KEY, String(n));
  } catch {}
}
function clearStep() {
  try {
    localStorage.removeItem(STEP_KEY);
  } catch {}
}

const ACTION_LABEL: Record<ActionKind, string> = {
  none: "明白了，继续",
  battle: "去打小怪 →",
  boss: "去净化 Boss →",
  mistakes: "去看错题本 →",
  ask: "看右边的小狐狸 →",
  finish: "开始冒险 🚀",
};

export default function TutorialOverlay({
  avatarSrc,
  firstMinion,
  firstBoss,
  onBattle,
  onBoss,
  onMistakes,
  onOpenAsk,
  onClose,
  reset = false,
}: {
  avatarSrc?: string;
  firstMinion?: string;
  firstBoss?: string;
  onBattle: (id: string) => void;
  onBoss: (id: string) => void;
  onMistakes: () => void;
  onOpenAsk: () => void;
  onClose: () => void;
  /** 设置里「重看教程」(?tutorial=1) 时从头开始 */
  reset?: boolean;
}) {
  const [i, setI] = useState<number>(() => (reset ? 0 : readStep()));
  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;
  const isFox = step.who === "fox";

  useEffect(() => {
    if (reset) clearStep();
    else saveStep(i);
  }, [i, reset]);

  function advance() {
    if (isLast) onClose();
    else setI((v) => v + 1);
  }

  function doAction(kind: ActionKind) {
    if (kind === "finish") {
      onClose();
      return;
    }
    if (kind === "none" || kind === "ask") {
      if (kind === "ask") onOpenAsk();
      advance();
      return;
    }
    // battle / boss / mistakes：跳转去体验（浮层会随视图切换卸载），先把下一步存好，回来接着教
    saveStep(i + 1);
    if (kind === "battle" && firstMinion) onBattle(firstMinion);
    else if (kind === "boss" && firstBoss) onBoss(firstBoss);
    else if (kind === "mistakes") onMistakes();
    else advance();
  }

  function finish() {
    clearStep();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <div className="animate-pop w-full max-w-md rounded-3xl border-4 border-[#2b3a4a] bg-[#fffdf5] p-5 shadow-[0_8px_0_rgba(43,58,74,0.3)]">
        {/* 头像 + 对话 */}
        <div className="flex items-end gap-3">
          {isFox ? (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-4 border-[#2b3a4a] bg-[#fff8e1] text-4xl shadow-card">
              🦊
            </div>
          ) : avatarSrc ? (
            <img
              src={avatarSrc}
              alt="小小探险家"
              className="h-16 w-16 shrink-0 rounded-2xl border-4 border-[#2b3a4a] bg-white object-cover shadow-card"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-4 border-[#2b3a4a] bg-[#dff1ff] text-4xl shadow-card">
              🧭
            </div>
          )}
          <div className="relative flex-1 rounded-2xl rounded-bl-none border-2 border-[#f79228] bg-white p-3 shadow-md">
            <p className="text-sm font-black text-[#e2582e]">{isFox ? "🦊 小狐狸" : "🧭 小小探险家"}</p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-[#2b3a4a]">{step.text}</p>
          </div>
        </div>

        {/* 大图标引导卡 */}
        {step.big && (
          <button
            type="button"
            onClick={() => doAction(step.big!.action)}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl border-4 border-[#f79228] bg-[#fff8e1] p-3 text-left shadow-[0_4px_0_rgba(217,122,18,0.35)] transition-transform active:scale-[0.98] hover:-translate-y-0.5"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-[#2b3a4a] bg-white text-4xl shadow-card">
              {step.big.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black text-[#2b3a4a]">{step.big.label}</span>
              <span className="mt-0.5 block text-xs font-bold text-[#7a8a9a]">{step.big.hint}</span>
            </span>
            <span className="shrink-0 rounded-xl bg-[#f79228] px-3 py-2 text-sm font-black text-white shadow-[0_3px_0_#d97a12]">
              {ACTION_LABEL[step.big.action]}
            </span>
          </button>
        )}

        {/* 进度点 */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {STEPS.map((_, idx) => (
            <span key={idx} className={`h-2 w-2 rounded-full ${idx === i ? "bg-[#f79228]" : "bg-[#e8edf2]"}`} />
          ))}
        </div>

        {/* 操作 */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            onClick={finish}
            className="rounded-xl px-3 py-2 text-sm font-bold text-[#7a8a9a] transition-colors hover:bg-[#e8edf2]"
          >
            跳过
          </button>
          <div className="flex gap-2">
            {i > 0 && !step.big && (
              <button
                onClick={() => setI((v) => v - 1)}
                className="rounded-xl border-2 border-[#2b3a4a] bg-white px-4 py-2 text-sm font-black text-[#2b3a4a] transition-transform active:scale-95"
              >
                上一步
              </button>
            )}
            {!step.big && (
              <button
                onClick={advance}
                className="rounded-xl bg-[#f79228] px-5 py-2 text-sm font-black text-white shadow-[0_3px_0_#d97a12] transition-transform active:scale-95"
              >
                {isLast ? "完成 🎉" : "下一步"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

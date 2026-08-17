"use client";

import { useState } from "react";

type Step = { who: "fox" | "explorer"; text: string };

/** 新手引导：小狐狸 🦊 与小小探险家 🧭 的对话，串讲核心玩法 */
const STEPS: Step[] = [
  { who: "fox", text: "嘿，小小探险家！欢迎来到知识岛🌟 这是你的冒险地图，海上漂着好多小岛，岛上全是等着被你驯服的数学小怪！" },
  { who: "explorer", text: "我看到地图上星星点点全是岛…我们要去岛上打小怪，把它们变成我的「本领精灵」对不对？" },
  { who: "fox", text: "答对啦！点开一座岛，派出「克制」它的精灵出战，用对的本领就能驯服它～ 先想想这题要哪个本领！" },
  { who: "explorer", text: "打怪还能让精灵越来越熟练，进化成更帅的形态！练得越多越强。" },
  { who: "fox", text: "驯服岛上的渡海 Boss，就能「发现新本领」、解锁下一座岛！遇到知识守卫打赢它，精灵还能觉醒成完全体👑" },
  { who: "explorer", text: "还有右边的小狐狸 AI 伙伴！有不懂的随时问它，每次提问都能攒 ✨火花，火花够了神秘小怪就出现啦～" },
  { who: "fox", text: "准备好啦吗？出发吧，去成为最棒的数学探险家！🚀" },
];

export default function TutorialOverlay({
  avatarSrc,
  onClose,
}: {
  avatarSrc?: string;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;
  const isFox = step.who === "fox";

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

        {/* 进度点 */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-2 w-2 rounded-full ${idx === i ? "bg-[#f79228]" : "bg-[#e8edf2]"}`}
            />
          ))}
        </div>

        {/* 操作 */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-bold text-[#7a8a9a] transition-colors hover:bg-[#e8edf2]"
          >
            跳过
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button
                onClick={() => setI((v) => v - 1)}
                className="rounded-xl border-2 border-[#2b3a4a] bg-white px-4 py-2 text-sm font-black text-[#2b3a4a] transition-transform active:scale-95"
              >
                上一步
              </button>
            )}
            <button
              onClick={() => (isLast ? onClose() : setI((v) => v + 1))}
              className="rounded-xl bg-[#f79228] px-5 py-2 text-sm font-black text-white shadow-[0_3px_0_#d97a12] transition-transform active:scale-95"
            >
              {isLast ? "开始冒险 🚀" : "下一步"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

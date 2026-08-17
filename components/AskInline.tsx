"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * AskInline：内联版 AI 聊面板（用于 L1 地图右侧 ≥1280px 分屏）。
 * 简化版：列 3 个推荐问题 + 输入框 + 跳转 /ask 完整页。
 */
export default function AskInline({
  questions,
  sparks,
}: {
  questions: { id: string; emoji: string; label: string; category: string; badge?: string }[];
  sparks: number;
}) {
  const [text, setText] = useState("");
  return (
    <div className="card flex h-full flex-col gap-3 overflow-hidden p-4">
      <header className="flex items-center justify-between border-b-2 border-[#fde9d0] pb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <span className="font-story text-lg font-black text-[#2b3a4a]">跟小狐狸聊</span>
        </div>
        <span className="rounded-full bg-[#fff3c4] px-2.5 py-0.5 text-xs font-black text-[#e2582e]">
          ✨ {sparks}
        </span>
      </header>
      <p className="text-sm font-bold text-[#7a8a9a]">会提问的孩子最厉害！</p>

      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="想问点什么？"
          className="w-full rounded-2xl border-3 border-[#2b3a4a] bg-white px-3 py-2 text-base font-bold text-[#2b3a4a] outline-none focus:border-[#f79228]"
        />
        <Link
          href={text ? `/ask?q=${encodeURIComponent(text)}` : "/ask"}
          className="btn btn-pink py-2 text-base"
        >
          🚀 去问伙伴
        </Link>
      </div>

      <div className="mt-1 flex-1 overflow-y-auto">
        <p className="text-xs font-bold text-[#7a8a9a]">推荐问题：</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {questions.slice(0, 4).map((q) => (
            <Link
              key={q.id}
              href={`/ask?q=${encodeURIComponent(q.label)}`}
              className="rounded-xl border-2 border-[#d7dee4] bg-white px-3 py-2 text-sm font-bold text-[#2b3a4a] transition-colors hover:border-[#f79228] hover:bg-[#fff3c4]"
            >
              {q.emoji} {q.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
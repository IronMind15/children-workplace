"use client";

import { useState } from "react";
import Link from "next/link";
import { askQuestion, askFree } from "@/lib/actions";
import FeynmanChat from "@/components/FeynmanChat";

type Q = { id: string; emoji: string; label: string; category: string; badge?: string };
type Reward = { name: string; required: number };

const CATEGORY_COLOR: Record<string, string> = {
  "AI 好奇": "#6ec6ff",
  "数学好奇": "#8fd14f",
  "岛屿秘密": "#ff8fb1",
  "AI 小贴士": "#b39ddb",
};

const BADGE_COLOR: Record<string, string> = {
  今日推荐: "#e2582e",
  "AI 小贴士": "#7e57c2",
};

export default function AskFlow({
  questions,
  sparks,
  todayCount,
  rewards,
  aiConfigured,
  recentMetas,
  embedded = false,
}: {
  questions: Q[];
  sparks: number;
  todayCount: number;
  rewards: Reward[];
  aiConfigured: boolean;
  recentMetas: { id: string; name: string }[];
  /** 内嵌到地图右栏（AskPanel）时为 true：去掉返回地图头、改紧凑 padding */
  embedded?: boolean;
}) {
  const [total, setTotal] = useState(sparks);
  const [today, setToday] = useState(todayCount);
  const [answer, setAnswer] = useState<string | null>(null);
  const [askedLabel, setAskedLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [gainSpark, setGainSpark] = useState<number | null>(null);

  // 自由提问
  const [freeText, setFreeText] = useState("");

  const nextReward = rewards.find((r) => r.required > total);
  const lastReward = nextReward ?? rewards[rewards.length - 1];

  async function ask(q: Q) {
    if (loading) return;
    setLoading(q.id);
    setAskedLabel(q.label);
    setAnswer(null);
    const r = await askQuestion(q.id);
    setLoading(null);
    setAnswer(r.answer);
    setTotal(r.total);
    setToday(r.todayCount);
    if (r.ok) setGainSpark(Date.now());
  }

  async function askFreeQuestion() {
    if (loading || !freeText.trim()) return;
    setLoading("free");
    setAskedLabel(freeText.trim());
    setAnswer(null);
    const r = await askFree(freeText);
    setLoading(null);
    setAnswer(r.answer);
    setTotal(r.total);
    setToday(r.todayCount);
    if (r.ok) {
      setGainSpark(Date.now());
      setFreeText("");
    }
  }

  return (
    <div className={embedded ? "flex h-full min-h-0 flex-col gap-2 overflow-hidden p-3" : "mx-auto max-w-3xl px-4 pt-5 lg:px-8"}>
      {/* 顶部 */}
      <header className={`flex flex-wrap items-center justify-between gap-2 ${embedded ? "" : "gap-3"}`}>
        <div className="card px-3 py-2">
          <h1 className="font-story text-lg font-black text-[#2b3a4a] lg:text-xl">💬 跟小狐狸聊</h1>
          {!embedded && (
            <p className="mt-0.5 text-xs font-bold text-[#7a8a9a]">会提问的孩子最厉害！问问伙伴，赢取火花</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="card px-3 py-2 text-sm font-black text-[#e2582e]">
            ✨ {total} · 今日已问 {today} 次
          </span>
          <Link
            href="/brain"
            className={`btn px-3 py-2 text-sm text-white ${aiConfigured ? "" : "animate-pulse"}`}
            style={{ background: aiConfigured ? "#3fb984" : "#7e57c2" }}
            title="AI 在「设置 ⚙️」里连接（仅支持 DeepSeek）"
          >
            {aiConfigured ? "🤖 AI 已连接" : "🔑 连接 AI"}
          </Link>
          {!embedded && (
            <Link href="/" className="btn btn-white px-4 py-2 text-sm">
              ← 地图
            </Link>
          )}
        </div>
      </header>

      {/* 伙伴 + 回答区 */}
      <div className="mt-2 flex items-start gap-3">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-4 border-[#2b3a4a] bg-[#fff8e1] text-4xl shadow-[0_5px_0_rgba(43,58,74,0.25)]">
          🦊
          {gainSpark && (
            <span key={gainSpark} className="animate-spark pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-xl font-black text-[#ffb300]">
              +1 ✨
            </span>
          )}
        </div>
        <div className="card-dark relative min-h-[90px] flex-1 p-3">
          {loading ? (
            <div className="flex items-center gap-2 pt-3">
              <span className="text-base text-white">🦊 正在想一想</span>
              <span className="typing-dot inline-block h-2 w-2 rounded-full bg-white" />
              <span className="typing-dot inline-block h-2 w-2 rounded-full bg-white" />
              <span className="typing-dot inline-block h-2 w-2 rounded-full bg-white" />
            </div>
          ) : answer ? (
            <div className="animate-pop">
              <p className="text-xs font-bold text-[#ffd54f]">你问：{askedLabel}</p>
              <p className="mt-1 text-sm font-bold leading-relaxed text-white">{answer}</p>
              <p className="mt-1.5 text-[11px] font-semibold text-white/60">🦊 想知道更多？继续问我，或者把答案讲给爸爸妈妈听！</p>
            </div>
          ) : (
            <p className="text-sm font-bold text-white">
              嘿嘿，我是你的伙伴🦊！点下面的问题来问我，或者自己打字提问，每次提问都能收集 ✨火花，
              火花够了，神秘小怪就会出现在岛上！
            </p>
          )}
        </div>
      </div>

      {/* 自由提问 */}
      <div className="card mt-3 flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center">
        <input
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && askFreeQuestion()}
          placeholder={aiConfigured ? "自己想问什么？打字问我吧～" : "自由提问需要先在「设置 ⚙️ → AI 伙伴连接」配置 DeepSeek Key"}
          disabled={!aiConfigured}
          className="min-w-0 flex-1 rounded-md border-2 border-[#2b3a4a] px-3 py-2 text-sm font-bold text-[#2b3a4a] disabled:bg-[#e8edf2] disabled:text-[#7a8a9a]"
        />
        <button onClick={askFreeQuestion} disabled={!aiConfigured || !!loading || !freeText.trim()} className="btn btn-blue px-4 py-2 text-sm disabled:opacity-50">
          🚀 问伙伴
        </button>
      </div>

      {/* 问题卡片（可滚动） */}
      {embedded ? (
        <div className="ask-embedded-scroll mt-2 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-2">
            {questions.map((q) => (
              <button
                key={q.id}
                onClick={() => ask(q)}
                disabled={!!loading}
                className="btn btn-white flex items-center gap-2 p-2.5 text-left disabled:opacity-60"
              >
                <span className="text-2xl">{q.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-[#2b3a4a]">{q.label}</span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: CATEGORY_COLOR[q.category] ?? "#7a8a9a" }}
                    >
                      {q.category}
                    </span>
                    {q.badge && (
                      <span
                        className="inline-block rounded px-1.5 py-0.5 text-[10px] font-black text-white"
                        style={{ background: BADGE_COLOR[q.badge] }}
                      >
                        ⭐ {q.badge}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {questions.map((q) => (
              <button
                key={q.id}
                onClick={() => ask(q)}
                disabled={!!loading}
                className="btn btn-white flex items-center gap-3 p-3 text-left disabled:opacity-60"
              >
                <span className="text-3xl">{q.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-[#2b3a4a]">{q.label}</span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <span
                      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: CATEGORY_COLOR[q.category] ?? "#7a8a9a" }}
                    >
                      {q.category}
                    </span>
                    {q.badge && (
                      <span
                        className="inline-block rounded px-1.5 py-0.5 text-[10px] font-black text-white"
                        style={{ background: BADGE_COLOR[q.badge] }}
                      >
                        ⭐ {q.badge}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* 火花奖励进度 */}
          <div className="card mt-5 p-4">
            <p className="text-sm font-black text-[#2b3a4a]">🎁 火花能换什么？</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {rewards.map((r) => {
                const unlocked = total >= r.required;
                return (
                  <span
                    key={r.name}
                    className={`rounded-lg border-2 border-[#2b3a4a] px-2.5 py-1 text-xs font-bold ${
                      unlocked ? "bg-[#d9f2e5] text-[#2b3a4a]" : "bg-[#e8edf2] text-[#7a8a9a]"
                    }`}
                  >
                    {unlocked ? "✅" : "🔒"} {r.name}（✨{r.required}）
                  </span>
                );
              })}
            </div>
            {nextReward && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-bold text-[#7a8a9a]">
                  <span>距离【{nextReward.name}】出现还差</span>
                  <span>
                    ✨{total} / {nextReward.required}
                  </span>
                </div>
                <div className="mt-1 h-3.5 overflow-hidden rounded-sm border-2 border-[#2b3a4a] bg-[#d3d1c7]">
                  <div
                    className="h-full bg-gradient-to-r from-[#ffd54f] to-[#ffb300] transition-all duration-500"
                    style={{ width: `${Math.min(100, (total / (lastReward?.required || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {!nextReward && <p className="mt-2 text-xs font-bold text-[#3fb984]">所有神秘小怪都被你的好奇心唤醒啦！🎉</p>}
            <p className="mt-2 text-[10px] font-bold text-[#7a8a9a]">
              每次提问 +1 ✨火花（推荐问题和小贴士也一样），保持爱提问的好习惯！
            </p>

            {/* 费曼小课堂：当小老师，教 AI 学数学 */}
            {recentMetas.length > 0 && (
              <div className="mt-6">
                <FeynmanChat metas={recentMetas} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

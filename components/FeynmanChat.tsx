"use client";

import { useState } from "react";
import { feynmanTeach } from "@/lib/actions";

type Msg = { role: "kid" | "ai"; content: string };

/**
 * 费曼小课堂：AI 扮演「似懂非懂的小同学」，孩子当小老师教它。
 * 学以致用 —— 能讲清楚，才是真的会。
 */
export default function FeynmanChat({ metas }: { metas: { id: string; name: string }[] }) {
  const [metaId, setMetaId] = useState(metas[0]?.id ?? "");
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  async function start() {
    if (!metaId || loading) return;
    setLoading(true);
    setStarted(true);
    setHistory([]);
    const ai = await feynmanTeach(metaId, []);
    if (ai) setHistory([{ role: "ai", content: ai }]);
    else setHistory([{ role: "ai", content: "🦊 我还没连上 AI 大脑…请大人先在设置里配置 AI 伙伴哦。" }]);
    setLoading(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading || !started) return;
    setInput("");
    const next: Msg[] = [...history, { role: "kid", content: text }];
    setHistory(next);
    setLoading(true);
    const ai = await feynmanTeach(metaId, next);
    if (ai) setHistory([...next, { role: "ai", content: ai }]);
    setLoading(false);
  }

  const curMeta = metas.find((m) => m.id === metaId);

  return (
    <div className="rounded-2xl border-2 border-[#b39ddb] bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🧑‍🏫</span>
        <div>
          <p className="text-sm font-black text-ink">费曼小课堂</p>
          <p className="text-[11px] font-bold text-ink-soft">当小老师，教 AI 学数学 —— 能讲清楚才是真的会</p>
        </div>
      </div>

      {/* 选题（默认最近学的） */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {metas.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setMetaId(m.id);
              setStarted(false);
              setHistory([]);
            }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-black transition-colors ${
              m.id === metaId ? "bg-[#b39ddb] text-white" : "bg-[#f3eefb] text-[#7e57c2]"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {!started ? (
        <button
          onClick={start}
          disabled={!metaId || loading}
          className="mt-3 w-full rounded-xl bg-[#7e57c2] py-2.5 text-sm font-black text-white transition-colors hover:bg-[#6a48b0] disabled:opacity-50"
        >
          {loading ? "小同学正在想问题…" : `开始教「${curMeta?.name ?? "数学"}」`}
        </button>
      ) : (
        <div className="mt-3">
          {/* 对话区 */}
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl bg-[#faf8f3] p-3">
            {history.map((m, i) => (
              <div key={i} className={`flex ${m.role === "kid" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === "kid" ? "rounded-br-none bg-[#7e57c2] text-white" : "rounded-bl-none bg-white text-ink shadow-sm"
                  }`}
                >
                  {m.role === "ai" && <span className="mr-1">🦊</span>}
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-none bg-white px-3 py-2 text-xs text-ink-soft shadow-sm">🦊 正在想…</div>
              </div>
            )}
          </div>

          {/* 输入区 */}
          <div className="mt-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="你来讲讲看…"
              className="min-w-0 flex-1 rounded-xl border-2 border-[#e3e0d8] px-3 py-2 text-sm outline-none focus:border-[#b39ddb]"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-xl bg-[#7e57c2] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

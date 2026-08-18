"use client";

import { useState } from "react";
import { feynmanTeach } from "@/lib/actions";
import { getUiIcon } from "@/lib/uiIcons";

type Msg = { role: "kid" | "ai"; content: string };

/**
 * 费曼小课堂：AI 扮演「似懂非懂的小同学」，孩子当小老师教它。
 * 学以致用 —— 能讲清楚，才是真的会。
 * compact：右栏嵌入模式用，缩小卡片高度，让图标靠近顶部、下方空间更紧凑。
 */
export default function FeynmanChat({
  metas,
  defaultMetaId,
  tier,
  compact = false,
}: {
  metas: { id: string; name: string }[];
  /** 分岛费曼：默认选中某岛元认知（如当前岛） */
  defaultMetaId?: string;
  /** 分层徽章：基础篇 / 进阶篇👑 */
  tier?: "base" | "practicing" | "advanced";
  /** 紧凑模式（右栏嵌入）：缩小内边距与对话高度 */
  compact?: boolean;
}) {
  const [metaId, setMetaId] = useState(defaultMetaId ?? metas[0]?.id ?? "");
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
    else setHistory([{ role: "ai", content: "🦊 我的小脑瓜刚才卡住啦～点一下「再试一次」或者换个知识点教我吧！" }]);
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
  const cardPad = compact ? "p-2.5" : "p-4";
  const iconSize = compact ? "text-xl" : "text-2xl";
  // 儿童友好：放大字号（紧凑模式也保底 text-sm，非紧凑到 text-base）
  const titleSize = compact ? "text-sm" : "text-base";
  const subSize = compact ? "text-[11px]" : "text-xs";
  const chipPy = compact ? "py-1" : "py-1.5";
  const chipSize = compact ? "text-[11px]" : "text-sm";
  const btnPy = compact ? "py-2.5" : "py-3";
  const dialogMax = compact ? "max-h-56" : "max-h-80";
  const inputPy = compact ? "py-2" : "py-2.5";

  return (
    <div className={`rounded-2xl border-2 border-[#b39ddb] bg-white ${cardPad}`}>
      <div className="flex items-center gap-2">
        <img src={getUiIcon("feynman")} alt="" className={`shrink-0 object-contain ${compact ? "h-7 w-7" : "h-8 w-8"}`} />
        <div className="min-w-0 flex-1">
          <p className={`${titleSize} font-black text-ink`}>费曼小课堂</p>
          {!compact && <p className={`${subSize} font-bold text-ink-soft`}>当小老师，教 AI 学数学 —— 能讲清楚才是真的会</p>}
        </div>
        {tier && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
              tier === "advanced" ? "bg-[#fff3d6] text-[#c98a12]" : "bg-[#eaf7e4] text-[#3a8f2f]"
            }`}
          >
            {tier === "advanced" ? "进阶篇👑" : "基础篇"}
          </span>
        )}
      </div>

      {/* 选题（默认最近学的） */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {metas.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setMetaId(m.id);
              setStarted(false);
              setHistory([]);
            }}
            className={`rounded-full px-2.5 ${chipPy} ${chipSize} font-black transition-colors ${
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
            className={`mt-2 w-full rounded-xl bg-[#7e57c2] ${btnPy} text-base font-black text-white transition-colors hover:bg-[#6a48b0] disabled:opacity-50`}
          >
            {loading ? "小同学正在想问题…" : `开始教「${curMeta?.name ?? "数学"}」`}
          </button>
        ) : (
          <div className="mt-2">
            {/* 对话区 */}
            <div className={`${dialogMax} space-y-2 overflow-y-auto rounded-xl bg-[#faf8f3] p-3`}>
              {history.map((m, i) => (
                <div key={i} className={`flex ${m.role === "kid" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
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
                  <div className="rounded-2xl rounded-bl-none bg-white px-3 py-2 text-sm text-ink-soft shadow-sm">🦊 正在想…</div>
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
                className={`min-w-0 flex-1 rounded-xl border-2 border-[#e3e0d8] px-3 ${inputPy} text-[15px] outline-none focus:border-[#b39ddb]`}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="shrink-0 rounded-xl bg-[#7e57c2] px-4 py-2.5 text-base font-black text-white disabled:opacity-50"
              >
                发送
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

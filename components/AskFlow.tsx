"use client";

import { useState, useEffect, useRef } from "react";
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
  rewards,
  aiConfigured,
  recentMetas,
  currentMeta,
  embedded = false,
}: {
  questions: Q[];
  sparks: number;
  todayCount: number;
  rewards: Reward[];
  aiConfigured: boolean;
  recentMetas: { id: string; name: string }[];
  /** 分岛费曼学习：当前探险家化身所在岛的元认知上下文（领域/等级/觉醒/分层） */
  currentMeta?: {
    metaId: string;
    name: string;
    domain: string;
    island: string;
    internalized: boolean;
    level: number;
    awakened: boolean;
    tier: "base" | "practicing" | "advanced";
  } | null;
  /** 内嵌到地图右栏（AskPanel）时为 true：去掉返回地图头、改紧凑 padding */
  embedded?: boolean;
}) {
  const [total, setTotal] = useState(sparks);
  const [answer, setAnswer] = useState<string | null>(null);
  const [askedLabel, setAskedLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [gainSpark, setGainSpark] = useState<number | null>(null);

  // 接收战斗界面推来的伙伴讲解（跨组件事件：BattleFlow → 右侧 AI 对话区）
  const [partnerMsgs, setPartnerMsgs] = useState<{ text: string; key: number }[]>([]);
  useEffect(() => {
    function onMsg(e: Event) {
      const detail = (e as CustomEvent<{ text: string }>).detail;
      if (detail?.text) {
        // 上限保护：只保留最近 8 条，配合滚动窗可回看，不会无限撑高
        setPartnerMsgs((prev) => [...prev.slice(-7), { text: detail.text, key: Date.now() + Math.random() }]);
      }
    }
    window.addEventListener("partner-message", onMsg);
    return () => window.removeEventListener("partner-message", onMsg);
  }, []);

  // 聊天窗自动滚到最新（讲解累计时也能看到最新一条）
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [partnerMsgs, answer]);

  const sparkBadge = gainSpark ? (
    <span key={gainSpark} className="animate-spark pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-base font-black text-[#ffb300]">
      +1 ✨
    </span>
  ) : null;

  // 自由提问
  const [freeText, setFreeText] = useState("");
  // 窗口内分段：聊天 / 费曼（二合一，不再把费曼单独甩到下方）
  const [tab, setTab] = useState<"chat" | "feynman">("chat");

  // 语音输入（Web Speech API，仅浏览器支持时显示麦克风）
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);
  const voiceTextRef = useRef("");
  useEffect(() => {
    const w = window as any;
    if (w.SpeechRecognition || w.webkitSpeechRecognition) setVoiceSupported(true);
  }, []);
  function toggleVoice() {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    voiceTextRef.current = "";
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      voiceTextRef.current = txt;
      setFreeText(txt);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      const t = voiceTextRef.current.trim();
      // 说完自动发送（类主流 AI 软件的语音输入体验）；空内容不发送
      if (t) askFreeQuestion(t);
    };
    recogRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  const nextReward = rewards.find((r) => r.required > total);
  const lastReward = nextReward ?? rewards[rewards.length - 1];

  // 分岛费曼：以「当前岛元认知」为首选费曼题，去重合并最近学的
  const feynmanMetas = currentMeta
    ? [{ id: currentMeta.metaId, name: currentMeta.name }, ...recentMetas.filter((m) => m.id !== currentMeta.metaId)]
    : recentMetas;

  // 分层引导文案 + 岛域专属提问（按 tier 解锁进阶）
  const tierGuidance: Record<string, string> = {
    base: `这岛的本领还没收成精灵～先去驯服岛上的小怪，把「${currentMeta?.name ?? ""}」练熟，再来教小狐狸吧！`,
    practicing: `「${currentMeta?.name ?? ""}」已经是你的精灵啦（Lv.${currentMeta?.level ?? 1}）！用费曼法讲给小狐狸听；打知识守卫觉醒后还能解锁进阶关联知识👑。`,
    advanced: `「${currentMeta?.name ?? ""}」已觉醒完全体👑！可以挑战进阶关联知识，把这座岛和别岛的本领串起来🌟。`,
  };
  const tierBadge: Record<string, { label: string; cls: string }> = {
    base: { label: "未解锁 · 基础篇", cls: "bg-[#e8edf2] text-[#7a8a9a]" },
    practicing: { label: "已内化 · 基础篇", cls: "bg-[#d9f2e5] text-[#2f8f5b]" },
    advanced: { label: "已觉醒 · 进阶篇👑", cls: "bg-[#fff3d6] text-[#c98a12]" },
  };
  const islandQuestions = currentMeta
    ? [
        `什么是${currentMeta.name}？举个例子`,
        `${currentMeta.name}在生活里哪里用得到？`,
        ...(currentMeta.awakened
          ? [
              `${currentMeta.name}和别的岛的本领有什么关系？`,
              `为什么${currentMeta.name}能帮我们解决更难的问题？`,
            ]
          : []),
      ]
    : [];

  async function ask(q: Q) {
    if (loading) return;
    setLoading(q.id);
    setAskedLabel(q.label);
    setAnswer(null);
    const r = await askQuestion(q.id);
    setLoading(null);
    setAnswer(r.answer);
    setTotal(r.total);
    if (r.ok) setGainSpark(Date.now());
  }

  async function askFreeQuestion(prefill?: string) {
    const text = (prefill ?? freeText).trim();
    if (loading || !text) return;
    setLoading("free");
    setAskedLabel(text);
    setAnswer(null);
    setFreeText("");
    const r = await askFree(text);
    setLoading(null);
    setAnswer(r.answer);
    setTotal(r.total);
    if (r.ok) {
      setGainSpark(Date.now());
    }
  }

  return (
    <div className={embedded ? "flex h-full min-h-0 flex-col gap-2 overflow-hidden p-3" : "mx-auto max-w-3xl px-4 pt-5 lg:px-8"}>
      {/* 顶部 */}
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-story text-base font-black text-[#2b3a4a]">💬 跟小狐狸聊</h1>
        <div className="flex items-center gap-2">
          {!aiConfigured && (
            <Link
              href="/brain"
              className="rounded-full bg-[#7e57c2] px-3 py-1 text-xs font-black text-white"
              title="在「设置 ⚙️」里连接 AI 伙伴（仅需 DeepSeek）"
            >
              🔑 连接 AI
            </Link>
          )}
          {!embedded && (
            <Link href="/" className="btn btn-white px-3 py-1 text-xs">
              ← 地图
            </Link>
          )}
        </div>
      </header>

      {/* 分段切换：聊天 / 费曼（二合一窗口） */}
      {feynmanMetas.length > 0 && (
        <div className="mt-1 flex gap-1 rounded-full bg-[#efe7da] p-1">
          <button
            type="button"
            onClick={() => setTab("chat")}
            className={`flex-1 rounded-full py-1.5 text-sm font-black transition-colors ${
              tab === "chat" ? "bg-white text-[#2b3a4a] shadow-[0_2px_0_rgba(43,58,74,0.15)]" : "text-[#7a8a9a]"
            }`}
          >
            💬 聊天
          </button>
          <button
            type="button"
            onClick={() => setTab("feynman")}
            className={`flex-1 rounded-full py-1.5 text-sm font-black transition-colors ${
              tab === "feynman" ? "bg-white text-[#7e57c2] shadow-[0_2px_0_rgba(43,58,74,0.15)]" : "text-[#7a8a9a]"
            }`}
          >
            📚 费曼小课堂
          </button>
        </div>
      )}

      {tab === "chat" ? (
        <>
          {/* 分岛费曼 · 岛上小课堂（化身在某岛时聚焦该岛领域，按觉醒/等级分层） */}
          {currentMeta && (
            <div className="card mt-2 border-2 border-[#8fd14f] p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏝️</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#2b3a4a]">岛上小课堂 · {currentMeta.island}</p>
                  <p className="truncate text-[11px] font-bold text-[#7a8a9a]">领域：{currentMeta.domain} · {currentMeta.name}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${tierBadge[currentMeta.tier].cls}`}>
                  {tierBadge[currentMeta.tier].label}
                </span>
              </div>
              <p className="mt-2 text-xs font-bold leading-relaxed text-[#2b3a4a]">{tierGuidance[currentMeta.tier]}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {islandQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => askFreeQuestion(q)}
                    disabled={!aiConfigured || !!loading}
                    className="rounded-full bg-[#eaf7e4] px-2.5 py-1 text-[11px] font-black text-[#3a8f2f] transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 伙伴聊天窗口：可滚动回看；战斗讲解累计时不再无限撑高，可一键清空 */}
          <div className={embedded ? "mt-2 flex min-h-0 flex-1 flex-col" : "mt-2 flex items-start gap-2.5"}>
            {!embedded && (
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-4 border-[#2b3a4a] bg-[#fff8e1] text-3xl shadow-[0_5px_0_rgba(43,58,74,0.25)]">
                🦊
                {sparkBadge}
              </div>
            )}
            <div className={embedded ? "min-h-0 flex-1" : "relative min-h-[60px] flex-1"}>
              {embedded && (
                <div className="mb-1 flex items-center justify-between px-1 pr-10">
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border-4 border-[#2b3a4a] bg-[#fff8e1] text-2xl shadow-[0_4px_0_rgba(43,58,74,0.25)]">
                      🦊
                      {sparkBadge}
                    </div>
                    <span className="font-story text-sm font-black text-[#2b3a4a]">小狐狸的聊天</span>
                  </div>
                  {partnerMsgs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPartnerMsgs([])}
                      className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-black text-[#7a8a9a] shadow-[0_2px_0_rgba(43,58,74,0.18)] transition-transform active:translate-y-0.5 hover:scale-105"
                      title="清空战斗讲解历史"
                    >
                      🧹 清空讲解
                    </button>
                  )}
                </div>
              )}
              {!embedded && partnerMsgs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPartnerMsgs([])}
                  className="absolute right-2 top-2 z-10 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black text-[#7a8a9a] transition-transform hover:scale-105"
                  title="清空战斗讲解历史"
                >
                  🧹
                </button>
              )}
              <div
                ref={chatScrollRef}
                className={
                  embedded
                    ? "card-dark flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5"
                    : "card-dark max-h-[55vh] min-h-[60px] overflow-y-auto p-2.5"
                }
              >
                {loading ? (
                  <div className="flex items-center gap-2 pt-3">
                    <span className="text-base text-white">🦊 正在想一想</span>
                    <span className="typing-dot inline-block h-2 w-2 rounded-full bg-white" />
                    <span className="typing-dot inline-block h-2 w-2 rounded-full bg-white" />
                    <span className="typing-dot inline-block h-2 w-2 rounded-full bg-white" />
                  </div>
                ) : answer ? (
                  <div className="animate-pop rounded-xl bg-white/5 px-3 py-2">
                    <p className="text-xs font-bold text-[#ffd54f]">你问：{askedLabel}</p>
                    <p className="mt-1 break-words whitespace-pre-wrap text-[15px] font-bold leading-relaxed text-white">{answer}</p>
                    <p className="mt-1.5 text-[11px] font-semibold text-white/60">🦊 想知道更多？继续问我，或者把答案讲给爸爸妈妈听！</p>
                  </div>
                ) : (
                  <p className="text-[15px] font-bold text-white">
                    {currentMeta ? (
                      <>
                        🏝️ 小小探险家现在在「{currentMeta.island}」！这一带属于「{currentMeta.domain}」领域，
                        我们正好可以聊聊「{currentMeta.name}」～ 点下面的岛域问题，或自己打字问我都可以，每次提问都能收集 ✨火花！
                      </>
                    ) : (
                      <>
                        嘿嘿，我是你的伙伴🦊！点下面的问题来问我，或者自己打字提问，每次提问都能收集 ✨火花，
                        火花够了，神秘小怪就会出现在岛上！
                      </>
                    )}
                  </p>
                )}
                {partnerMsgs.length > 0 && (
                  <div className="mt-1 space-y-2 border-t border-white/10 pt-2">
                    {partnerMsgs.map((m) => (
                      <div key={m.key} className="animate-pop rounded-xl border border-[#f79228]/40 bg-[#fff3e0] px-3 py-2 text-sm font-bold leading-relaxed text-[#7a4a2a]">
                        {m.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 自由提问 */}
          <div className="card mt-2 flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                disabled={!aiConfigured}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#2b3a4a] text-xl transition-transform active:scale-95 disabled:opacity-50 ${
                  listening ? "animate-breathe bg-[#ff8c8c] text-white" : "bg-white"
                }`}
                title={listening ? "正在听…点击停止" : "语音输入"}
                aria-label="语音输入"
              >
                🎤
              </button>
            )}
            <input
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askFreeQuestion()}
              placeholder={listening ? "🎤 正在聆听…" : aiConfigured ? "自己想问什么？打字或语音问我吧～" : "自由提问需要先在「设置 ⚙️ → AI 伙伴连接」配置 DeepSeek Key"}
              disabled={!aiConfigured}
              className="min-w-0 flex-1 rounded-md border-2 border-[#2b3a4a] px-3 py-2 text-[15px] font-bold text-[#2b3a4a] disabled:bg-[#e8edf2] disabled:text-[#7a8a9a]"
            />
            <button onClick={() => askFreeQuestion()} disabled={!aiConfigured || !!loading || !freeText.trim()} className="btn btn-blue px-4 py-2 text-sm disabled:opacity-50">
              {listening ? "…" : "🚀 问伙伴"}
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
          </div>
        </>
      )}

      </>) : null}

      {/* 费曼小课堂标签：与聊天同一窗口，点顶部「📚 费曼小课堂」切换 */}
      {feynmanMetas.length > 0 && tab === "feynman" && (
        <div className={embedded ? "mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto" : "mt-3"}>
          <FeynmanChat
            metas={feynmanMetas}
            defaultMetaId={currentMeta?.metaId}
            tier={currentMeta?.tier}
            key={currentMeta?.metaId ?? "recent"}
            compact={embedded}
          />
        </div>
      )}
    </div>
  );
}

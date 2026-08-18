"use client";

/**
 * MistakeGroups：错题本「按知识点分组」的客户端交互版
 *  - 每组默认收起（避免列表过长），点标题展开
 *  - 展开后可设定每组显示的题数（3/5/10/20/全部），选择记忆在 localStorage
 *  - 每组「🦊 让小狐狸综合解析」：结果推送到右侧小狐狸助手（partner-message），
 *    不再在组底部展示大段气泡
 */

import { useEffect, useState } from "react";
import { foxAnalyzeMistakes } from "@/lib/actions";

export type MistakeItemData = {
  id: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  wrongCount: number;
  resolved: boolean;
  resolvedAt: string | null;
  reviewCount: number;
  createdAt: string;
};

export type MistakeGroupData = {
  kp: string;
  metaId: string;
  proficiency: { score: number; level: string; color: string };
  retryHref: string;
  wrongCount: number;
  unresolvedCount: number;
  items: MistakeItemData[];
  analysisQuestions: string[];
};

const EXPAND_KEY = "mistakes:expanded";
const LIMIT_KEY = "mistakes:limit";
const DEFAULT_LIMIT = 5;
const LIMIT_OPTIONS = [3, 5, 10, 20] as const;

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function MistakeGroups({ groups }: { groups: MistakeGroupData[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  // 读取本地记忆：展开状态 + 每类显示条数
  useEffect(() => {
    setExpanded(readJSON<Record<string, boolean>>(EXPAND_KEY, {}));
    setLimits(readJSON<Record<string, number>>(LIMIT_KEY, {}));
    setReady(true);
  }, []);

  function toggle(kp: string) {
    setExpanded((cur) => {
      const next = { ...cur, [kp]: !cur[kp] };
      writeJSON(EXPAND_KEY, next);
      return next;
    });
  }

  function setLimit(kp: string, value: number) {
    setLimits((cur) => {
      const next = { ...cur, [kp]: value };
      writeJSON(LIMIT_KEY, next);
      return next;
    });
  }

  return (
    <>
      {groups.map((g) => {
        const isOpen = ready ? !!expanded[g.kp] : false;
        const limit = ready ? (limits[g.kp] ?? DEFAULT_LIMIT) : DEFAULT_LIMIT;
        const shown = g.items.slice(0, limit);
        const hasMore = g.items.length > shown.length;
        return (
          <section key={g.kp} className="card mt-5 overflow-hidden p-0">
            {/* 组头：点击整条可展开/收起 */}
            <button
              onClick={() => toggle(g.kp)}
              className="flex w-full items-center justify-between gap-2 bg-[#faf8f3] px-4 py-3 text-left transition-colors hover:bg-[#f5f0e6]"
              aria-expanded={isOpen}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-base font-black text-[#2b3a4a]">
                  📚 {g.kp}
                </span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black text-white"
                  style={{ background: g.proficiency.color }}
                  title={`掌握度 ${g.proficiency.score} 分`}
                >
                  熟练度·{g.proficiency.level}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] font-bold text-[#7a8a9a]">
                  {g.items.length} 道 · 错 {g.wrongCount} 次
                </span>
                <span
                  className={`text-sm font-black text-[#f79228] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  ▼
                </span>
              </div>
            </button>

            {/* 展开区：题目列表 + 显示条数控制 + 综合解析 */}
            {isOpen && (
              <>
                <div className="flex flex-wrap gap-x-4 gap-y-1 bg-[#fffdf8] px-4 py-1.5 text-[11px] font-bold text-[#7a8a9a]">
                  <span className="text-[#3fb984]">已订正 {g.items.length - g.unresolvedCount} 道</span>
                  <span className="text-[#e2582e]">待复习 {g.unresolvedCount} 道</span>
                  <span className="ml-auto flex items-center gap-1">
                    每类显示
                    <select
                      value={limit}
                      onChange={(e) => setLimit(g.kp, Number(e.target.value))}
                      className="rounded-lg border-2 border-[#d7dee4] bg-white px-1.5 py-0.5 text-[11px] font-black text-[#2b3a4a]"
                      aria-label={`${g.kp} 每类显示条数`}
                    >
                      {LIMIT_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n} 条</option>
                      ))}
                      <option value={g.items.length}>全部</option>
                    </select>
                  </span>
                </div>

                <div className="divide-y divide-[#eee7da]">
                  {shown.map((m) => (
                    <div key={m.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold leading-relaxed text-[#2b3a4a]">{m.question}</p>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className="rounded-full bg-[#fff1e0] px-2 py-0.5 text-[10px] font-black text-[#e2582e]"
                            title="同一道题累计做错的次数"
                          >
                            错 {m.wrongCount} 次
                          </span>
                          {m.resolved ? (
                            <span className="rounded-full bg-[#e6f6ec] px-2 py-0.5 text-[10px] font-black text-[#2f9e6e]">✅ 已订正</span>
                          ) : (
                            <span className="rounded-full bg-[#fff1e0] px-2 py-0.5 text-[10px] font-black text-[#e2582e]">⏳ 待复习</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold">
                        <span className="text-[#e2582e]">你的答案：{m.userAnswer}</span>
                        <span className="text-[#2f9e6e]">正确答案：{m.correctAnswer}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[10px] font-semibold text-[#9aa7b2]">
                        <span>{m.createdAt.slice(0, 10)}</span>
                        {m.resolvedAt && <span>订正于 {m.resolvedAt.slice(0, 10)}</span>}
                        {m.reviewCount ? <span>已重做 {m.reviewCount} 次</span> : null}
                      </div>
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div className="bg-[#fffdf8] px-4 py-2 text-center text-[11px] font-bold text-[#9aa7b2]">
                    还有 {g.items.length - shown.length} 道没显示 —— 用上面的「每类显示」调多些吧
                  </div>
                )}

                <GroupAnalysis kp={g.kp} questions={g.analysisQuestions} />

                {g.unresolvedCount > 0 && (
                  <div className="bg-[#fffdf8] px-4 py-2 text-[11px] font-bold text-[#e2582e]">
                    还有 {g.unresolvedCount} 道待复习 —— 去「再挑战」更容易碰到它们，作对就自动订正啦！
                  </div>
                )}

                <div className="border-t border-[#eee7da] bg-[#fffdf8] px-4 py-2">
                  <a
                    href={g.retryHref}
                    className="inline-block rounded-full bg-[#f79228] px-3 py-1 text-xs font-black text-white shadow-[0_2px_0_rgba(43,58,74,0.18)] transition-transform active:translate-y-0.5 hover:bg-[#d97a12]"
                  >
                    🔁 再挑战
                  </a>
                </div>
              </>
            )}
          </section>
        );
      })}
    </>
  );
}

/** 综合解析：结果推送到右侧小狐狸助手，不在组底部展示大段气泡 */
function GroupAnalysis({ kp, questions }: { kp: string; questions: string[] }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function run() {
    if (loading) return;
    setLoading(true);
    setSent(false);
    const r = await foxAnalyzeMistakes(kp, questions);
    setLoading(false);
    if (r.ok && r.answer) {
      window.dispatchEvent(
        new CustomEvent("partner-message", {
          detail: { text: `🦊 小狐狸讲「${kp}」：\n${r.answer}` },
        })
      );
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    }
  }

  return (
    <div className="mt-2 border-t border-[#eee7da] px-4 py-2">
      <div className="flex items-center gap-2">
        <button
          onClick={run}
          disabled={loading}
          className="rounded-full bg-[#7e57c2] px-3 py-1 text-xs font-black text-white shadow-[0_2px_0_rgba(43,58,74,0.18)] transition-transform active:translate-y-0.5 hover:bg-[#6a48b0] disabled:opacity-60"
        >
          {loading ? "🦊 正在想一想…" : "🦊 让小狐狸综合解析 + 练习方法"}
        </button>
        {sent && (
          <span className="animate-pop text-[11px] font-black text-[#2f9e6e]">
            ✅ 已发到右侧小狐狸
          </span>
        )}
      </div>
      {sent && (
        <p className="mt-1 text-[10px] font-semibold text-[#9a8ab0]">
          点开右边的🦊小狐狸，就能看到「{kp}」的易错点与练习方法啦
        </p>
      )}
    </div>
  );
}

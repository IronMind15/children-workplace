import { seedIfEmpty } from "@/lib/seed";
import { requireUser } from "@/lib/session";
import { getExplorer, getMistakes, getMinionByMeta, getMeta, getInternalizedMetas, getMetas } from "@/lib/repo";
import { evaluateMetaProficiency, getSparkStats } from "@/lib/game";
import { QUESTIONS, AI_TIPS, RECOMMEND_BY_META } from "@/lib/askBank";
import { getAiConfig } from "@/lib/ai";
import PageHeader from "@/components/PageHeader";
import TestTools from "@/components/TestTools";
import AskSidebar from "@/components/AskSidebar";
import MistakeGroupAnalysis from "@/components/MistakeGroupAnalysis";
import FeatureCoach from "@/components/FeatureCoach";
import { getUiIcon } from "@/lib/uiIcons";

export const dynamic = "force-dynamic";

/**
 * 错题集（全栈打通 · 按知识点分组）
 * - 真实读取 mistake 表：累计错题 / 已订正 / 待复习
 * - 同一道题只记一行（错次累加）；按「知识点 kp」聚合（比元认知更细，如「加法·20以内」），
 *   每题右侧标「错 N 次」，每组显示题数 / 总错次
 * - 每组底部「🦊 综合解析」让小狐狸给出易错点 + 讲解 + 练习方法
 * - 右侧常驻小狐狸助手（AskSidebar），随时可唤醒
 */
export default async function MistakesPage() {
  await requireUser();
  seedIfEmpty();
  const explorer = getExplorer();
  const kidName = explorer?.name.split(" ")[0] ?? "小小探险家";

  const mistakes = getMistakes(500);
  const total = mistakes.length;
  const resolvedCount = mistakes.filter((m) => m.resolved).length;
  const unresolved = total - resolvedCount;
  const totalWrong = mistakes.reduce((s, m) => s + (m.wrong_count ?? 1), 0);

  // 按知识点（kp）聚合；kp 缺省回退元认知名
  type Group = {
    kp: string;
    metaId: string;
    items: typeof mistakes;
    proficiency: ReturnType<typeof evaluateMetaProficiency>;
  };
  const map = new Map<string, Group>();
  for (const m of mistakes) {
    const kp = (m.kp && m.kp.trim()) || getMeta(m.meta_id)?.name || m.meta_id;
    let g = map.get(kp);
    if (!g) {
      g = {
        kp,
        metaId: m.meta_id,
        items: [],
        proficiency: evaluateMetaProficiency(m.meta_id),
      };
      map.set(kp, g);
    }
    g.items.push(m);
  }
  const groups = [...map.values()].sort((a, b) => b.items.length - a.items.length);

  // ===== AskSidebar 所需数据 =====
  const sparks = getSparkStats();
  const metas = getInternalizedMetas();
  const recIds = new Set(metas.flatMap((m) => RECOMMEND_BY_META[m.id] ?? []));
  const askQuestions = [...QUESTIONS, ...AI_TIPS]
    .filter((q) => recIds.has(q.id))
    .slice(0, 6)
    .map((q) => ({ id: q.id, emoji: q.emoji, label: q.label, category: q.category as string }));
  const aiConfigured = !!getAiConfig();
  const recentMetas = getInternalizedMetas().slice(-3).reverse().map((m) => ({ id: m.id, name: getMeta(m.id)?.name ?? m.id }));

  return (
    <AskSidebar
      questions={askQuestions}
      sparks={sparks.total}
      todayCount={sparks.todayCount}
      rewards={[]}
      aiConfigured={aiConfigured}
      recentMetas={recentMetas}
      currentIslandMeta={null}
    >
      <div className="sky-bg pb-6 pt-2">
        <PageHeader
          icon={getUiIcon("mistakeBook")}
          title="错题集"
          subtitle="按知识点整理做错的题，小狐狸帮你复盘薄弱环节"
          backHref="/"
        />

        {/* 第一次进错题本：自动小课堂（默认只教一次） */}
        <FeatureCoach
          storageKey="coach:mistakes"
          title="🦊 错题本小课堂"
          message={
            <>
              错题按「知识点」自动归类（比元认知更细，比如「加法·20以内」）。点每组底部的「🦊 综合解析」，我能帮你讲易错点 + 练习方法！
            </>
          }
        />

        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          {/* 统计卡 */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="card p-4 text-center">
              <div className="text-3xl font-black text-[#2b3a4a]">{total}</div>
              <div className="text-xs font-bold text-[#7a8a9a]">错题条目</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-black text-[#e2582e]">{totalWrong}</div>
              <div className="text-xs font-bold text-[#7a8a9a]">累计错次</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-black text-[#3fb984]">{resolvedCount}</div>
              <div className="text-xs font-bold text-[#7a8a9a]">已订正</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-black text-[#f79228]">{unresolved}</div>
              <div className="text-xs font-bold text-[#7a8a9a]">待复习</div>
            </div>
          </div>

          {/* 空态 */}
          {total === 0 && (
            <div className="card mt-6 p-8 text-center">
              <img src={getUiIcon("mistakeBook")} alt="错题集" className="mx-auto h-20 w-20 object-contain opacity-80" />
              <p className="mt-4 text-base font-black text-[#2b3a4a]">{kidName} 的错题本还是空的</p>
              <p className="mt-2 text-sm font-bold text-[#7a8a9a]">在岛上战斗时答错的题目会自动收录到这里，按知识点帮你归类复习。</p>
            </div>
          )}

          {/* 按知识点分组 */}
          {groups.map((g) => {
            const minion = getMinionByMeta(g.metaId);
            const retryHref = minion ? `/?battle=${minion.id}` : "/";
            const groupUnresolved = g.items.filter((m) => !m.resolved).length;
            const groupWrong = g.items.reduce((s, m) => s + (m.wrong_count ?? 1), 0);
            return (
              <section key={g.kp} className="card mt-5 overflow-hidden p-0">
                <div className="flex items-center justify-between gap-2 bg-[#faf8f3] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-[#2b3a4a]">📚 {g.kp}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-black text-white"
                      style={{ background: g.proficiency.color }}
                      title={`掌握度 ${g.proficiency.score} 分`}
                    >
                      熟练度·{g.proficiency.level}
                    </span>
                  </div>
                  <a
                    href={retryHref}
                    className="rounded-full bg-[#f79228] px-3 py-1 text-xs font-black text-white shadow-[0_2px_0_rgba(43,58,74,0.18)] transition-transform active:translate-y-0.5 hover:bg-[#d97a12]"
                  >
                    🔁 再挑战
                  </a>
                </div>

                {/* 组统计条 */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 bg-[#fffdf8] px-4 py-1.5 text-[11px] font-bold text-[#7a8a9a]">
                  <span>本知识点 {g.items.length} 道错题</span>
                  <span className="text-[#e2582e]">累计错 {groupWrong} 次</span>
                  <span className="text-[#3fb984]">已订正 {g.items.length - groupUnresolved} 道</span>
                </div>

                <div className="divide-y divide-[#eee7da]">
                  {g.items.map((m) => (
                    <div key={m.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold leading-relaxed text-[#2b3a4a]">{m.question}</p>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className="rounded-full bg-[#fff1e0] px-2 py-0.5 text-[10px] font-black text-[#e2582e]"
                            title="同一道题累计做错的次数"
                          >
                            错 {(m.wrong_count ?? 1)} 次
                          </span>
                          {m.resolved ? (
                            <span className="rounded-full bg-[#e6f6ec] px-2 py-0.5 text-[10px] font-black text-[#2f9e6e]">✅ 已订正</span>
                          ) : (
                            <span className="rounded-full bg-[#fff1e0] px-2 py-0.5 text-[10px] font-black text-[#e2582e]">⏳ 待复习</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold">
                        <span className="text-[#e2582e]">你的答案：{m.user_answer}</span>
                        <span className="text-[#2f9e6e]">正确答案：{m.correct_answer}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[10px] font-semibold text-[#9aa7b2]">
                        <span>{m.created_at?.slice(0, 10)}</span>
                        {m.resolved_at && <span>订正于 {m.resolved_at.slice(0, 10)}</span>}
                        {m.review_count ? <span>已重做 {m.review_count} 次</span> : null}
                      </div>
                    </div>
                  ))}
                </div>

                <MistakeGroupAnalysis kp={g.kp} questions={g.items.map((m) => m.question)} />

                {groupUnresolved > 0 && (
                  <div className="bg-[#fffdf8] px-4 py-2 text-[11px] font-bold text-[#e2582e]">
                    还有 {groupUnresolved} 道待复习 —— 去「再挑战」更容易碰到它们，作对就自动订正啦！
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <TestTools />
      </div>
    </AskSidebar>
  );
}

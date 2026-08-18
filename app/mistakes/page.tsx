import { seedIfEmpty } from "@/lib/seed";
import { requireUser } from "@/lib/session";
import { getExplorer, getMistakes, getMinionByMeta, getMeta, getInternalizedMetas } from "@/lib/repo";
import { evaluateMetaProficiency, getSparkStats } from "@/lib/game";
import { QUESTIONS, AI_TIPS, RECOMMEND_BY_META } from "@/lib/askBank";
import { getAiConfig } from "@/lib/ai";
import PageHeader from "@/components/PageHeader";
import TestTools from "@/components/TestTools";
import AskSidebar from "@/components/AskSidebar";
import MistakeGroups, { type MistakeGroupData } from "@/components/MistakeGroups";
import FeatureCoach from "@/components/FeatureCoach";
import { getUiIcon } from "@/lib/uiIcons";

export const dynamic = "force-dynamic";

/**
 * 错题集（全栈打通 · 按知识点分组）
 * - 真实读取 mistake 表：累计错题 / 已订正 / 待复习
 * - 同一道题只记一行（错次累加）；按「知识点 kp」聚合（比元认知更细，如「加法·20以内」），
 *   每题右侧标「错 N 次」，每组显示题数 / 总错次
 * - 每组默认收起（避免太长），展开后可设定显示条数（3/5/10/20/全部）
 * - 每组「🦊 综合解析」结果推送到右侧小狐狸助手（不占组底部空间）
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

  // 序列化给客户端组件（node:sqlite 行对象不能直接进 Client Props）
  const groupsData: MistakeGroupData[] = groups.map((g) => {
    const minion = getMinionByMeta(g.metaId);
    return {
      kp: g.kp,
      metaId: g.metaId,
      proficiency: {
        score: g.proficiency.score,
        level: g.proficiency.level,
        color: g.proficiency.color,
      },
      retryHref: minion ? `/?battle=${minion.id}` : "/",
      wrongCount: g.items.reduce((s, m) => s + (m.wrong_count ?? 1), 0),
      unresolvedCount: g.items.filter((m) => !m.resolved).length,
      items: g.items.map((m) => ({
        id: m.id,
        question: m.question,
        userAnswer: m.user_answer,
        correctAnswer: m.correct_answer,
        wrongCount: m.wrong_count ?? 1,
        resolved: !!m.resolved,
        resolvedAt: m.resolved_at ?? null,
        reviewCount: m.review_count ?? 0,
        createdAt: m.created_at ?? "",
      })),
      analysisQuestions: g.items.map((m) => m.question),
    };
  });

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
              错题按「知识点」自动归类（比元认知更细，比如「加法·20以内」）。每组默认收起，点标题展开；
              展开后还能设「每类显示」条数。点「🦊 综合解析」，小狐狸会在右侧窗口帮你讲易错点 + 练习方法！
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

          {/* 按知识点分组（客户端折叠 + 显示条数 + 右侧解析） */}
          <MistakeGroups groups={groupsData} />
        </div>

        <TestTools />
      </div>
    </AskSidebar>
  );
}

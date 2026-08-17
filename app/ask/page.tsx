import { seedIfEmpty } from "@/lib/seed";
import { getSparkStats } from "@/lib/game";
import { QUESTIONS, AI_TIPS, RECOMMEND_BY_META } from "@/lib/askBank";
import { getMonstersByIsland, getExplorer, getInternalizedMetas, getIslands, getMeta } from "@/lib/repo";
import { getAiConfig } from "@/lib/ai";
import { redirect } from "next/navigation";
import AskFlow from "@/components/AskFlow";
import TopShell from "@/components/TopShell";
import TestTools from "@/components/TestTools";

export const dynamic = "force-dynamic";

export default function Ask() {
  seedIfEmpty();
  const explorer = getExplorer();
  if (!explorer?.name) redirect("/onboarding");

  const stats = getSparkStats();
  const ai = getAiConfig();
  const avatar = explorer.name.split(" ").pop() ?? "🧭";

  // ---- 每日推荐：按闯关进度挑问题 + AI 小贴士 ----
  const mastered = getInternalizedMetas().map((m) => m.id);
  const recIds = new Set(mastered.flatMap((id) => RECOMMEND_BY_META[id] ?? []));
  const all = [...QUESTIONS, ...AI_TIPS];
  const recommended = all.filter((q) => recIds.has(q.id)).slice(0, 3);
  const tips = AI_TIPS.slice(0, 2);
  const rest = all.filter((q) => !recommended.includes(q) && !tips.includes(q));
  const questions: { id: string; emoji: string; label: string; category: string; badge?: string }[] = [
    ...recommended.map((q) => ({ id: q.id, emoji: q.emoji, label: q.label, category: q.category as string, badge: "今日推荐" })),
    ...tips.map((q) => ({ id: q.id, emoji: q.emoji, label: q.label, category: q.category as string, badge: "AI 小贴士" })),
    ...rest.map((q) => ({ id: q.id, emoji: q.emoji, label: q.label, category: q.category as string })),
  ];

  // 神秘小怪奖励表（跟随群岛实际岛屿）
  const rewards = getIslands()
    .flatMap((isl) => getMonstersByIsland(isl.name))
    .filter((m) => m.type === "hidden")
    .map((m) => {
      let required = 999;
      try {
        required = (JSON.parse(m.options ?? "{}") as { required_sparks?: number }).required_sparks ?? 999;
      } catch {}
      return { name: m.name, required };
    })
    .sort((a, b) => a.required - b.required);

  return (
    <div className="sky-bg min-h-screen pb-6 pt-20">
      <TopShell avatar={avatar} sparks={stats.total} />
      <AskFlow
        questions={questions}
        sparks={stats.total}
        todayCount={stats.todayCount}
        rewards={rewards}
        aiConfigured={!!ai}
        recentMetas={getInternalizedMetas()
          .slice(-3)
          .reverse()
          .map((m) => ({ id: m.id, name: getMeta(m.id)?.name ?? m.id }))}
      />
      <TestTools />
    </div>
  );
}

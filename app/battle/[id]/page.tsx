import { seedIfEmpty } from "@/lib/seed";
import { getMonster, getSpiritsForInternalized, getMeta, getBrainSettings } from "@/lib/repo";
import { getIslandDifficulty } from "@/lib/game";
import { notFound } from "next/navigation";
import BattleFlow from "@/components/BattleFlow";
import { generateSteps } from "@/lib/questions";
import type { SolveStep } from "@/lib/types";

// 每次进入战斗都重新生成随机题目
export const dynamic = "force-dynamic";

export default async function Battle({ params }: { params: Promise<{ id: string }> }) {
  seedIfEmpty();
  const { id } = await params;
  const monster = getMonster(id);
  if (!monster || !["minion", "hidden"].includes(monster.type) || !monster.correct_meta || !monster.steps) notFound();

  const spirits = getSpiritsForInternalized().map((s) => {
    const meta = getMeta(s.meta_id);
    return { meta_id: s.meta_id, emoji: s.emoji, nickname: s.nickname ?? "", meta_name: meta?.name ?? "" };
  });

  // 本岛难度：随「本岛开启的下游岛数」+「本岛精灵等级」上升，再叠加全局偏置
  const level = getIslandDifficulty(monster.correct_meta);

  // 普通小怪：按知识点现场随机出题（每次都不重样）；神秘小怪保留剧情题
  const steps: SolveStep[] =
    monster.type === "minion"
      ? generateSteps(monster.correct_meta, undefined, level)
      : (JSON.parse(monster.steps) as SolveStep[]);

  return (
    <BattleFlow
      monsterId={monster.id}
      name={monster.name}
      question={monster.question}
      correctMeta={monster.correct_meta}
      steps={steps}
      spirits={spirits}
      brain={getBrainSettings()}
    />
  );
}
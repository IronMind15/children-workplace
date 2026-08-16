import { seedIfEmpty } from "@/lib/seed";
import { getMonster, getBrainSettings, getMetas, getEvolutionEdges, getSpirit, isInternalized, getBossByTarget, getMeta } from "@/lib/repo";
import { notFound } from "next/navigation";
import BossFlow from "@/components/BossFlow";
import type { ChainNode, ChainEdge } from "@/components/EvolutionModal";
import type { SolveStep } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Boss({ params }: { params: Promise<{ id: string }> }) {
  seedIfEmpty();
  const { id } = await params;
  const monster = getMonster(id);
  if (!monster || monster.type !== "boss" || !monster.steps) notFound();

  const steps = JSON.parse(monster.steps) as SolveStep[];

  const nodes: ChainNode[] = getMetas().map((m) => {
    const boss = getBossByTarget(m.id);
    return {
      metaId: m.id,
      name: m.name,
      meaning: m.meaning,
      domain: m.domain,
      emoji: getSpirit(m.id)?.emoji ?? "❓",
      unlocked: isInternalized(m.id),
      hint: boss
        ? `在${boss.island}净化「${boss.name}」`
        : m.id === "MK-01"
          ? "🌟 数与运算的起点，天生掌握"
          : m.id === "MK-15"
            ? "🌟 几何线的起点，天生掌握"
            : "🌀 神秘的待解锁知识",
    };
  });
  const edges: ChainEdge[] = getEvolutionEdges().map((e) => ({
    from: e.from_meta,
    to: e.to_meta,
    operator: e.operator,
  }));

  return (
    <BossFlow
      monsterId={monster.id}
      name={monster.name}
      question={monster.question}
      steps={steps}
      brain={getBrainSettings()}
      nodes={nodes}
      edges={edges}
      targetMeta={monster.target_meta ?? undefined}
      metaName={monster.target_meta ? (getMeta(monster.target_meta)?.name ?? monster.name) : monster.name}
    />
  );
}

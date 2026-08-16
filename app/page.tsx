import { seedIfEmpty } from "@/lib/seed";
import { getWorldLayout } from "@/lib/worldLayout";
import {
  getExplorer,
  getMonstersByIsland,
  getBossesByIsland,
  getInternalizedMetas,
  getBrainSettings,
  getMetas,
  getEvolutionEdges,
  getSpirit,
  isInternalized,
  getIslands,
  getBossByTarget,
} from "@/lib/repo";
import { welcomeGuide } from "@/lib/brain";
import { getSparkStats } from "@/lib/game";
import { redirect } from "next/navigation";
import Link from "next/link";
import Guide from "@/components/Guide";
import BottomNav from "@/components/BottomNav";
import SettingsEntry from "@/components/SettingsEntry";
import TestTools from "@/components/TestTools";
import WorldMap from "@/components/WorldMap";
import EvolutionPathButton from "@/components/EvolutionPathButton";
import type { ChainNode, ChainEdge } from "@/components/EvolutionModal";
import type { WorldNode, IslandBattleData } from "@/components/WorldMap";

// 数据全部来自 SQLite（会随游戏进程变化），禁用静态缓存，保证 server action 后页面即时更新
export const dynamic = "force-dynamic";

export default function Home() {
  seedIfEmpty();
  const explorer = getExplorer();
  if (!explorer?.name) redirect("/onboarding");

  const island = explorer.current_island ?? "计数岛";
  const sparks = getSparkStats();

  // 全部元认知 + 世界地图坐标（按进化谱系定位：父岛在下、子岛在上）
  const allMetas = getMetas();
  const islands = getIslands();
  const layout = getWorldLayout();
  const worldEdges = getEvolutionEdges().map((e) => ({ from: e.from_meta, to: e.to_meta }));
  const worldNodes: WorldNode[] = allMetas.map((m) => {
    const iname = `${m.name}岛`;
    const c = layout[m.id];
    return {
      metaId: m.id,
      island: iname,
      x: c?.x ?? 50,
      y: c?.y ?? 50,
      depth: c?.depth ?? 0,
      unlocked: islands.find((i) => i.name === iname)?.unlocked ?? false,
      isCurrent: iname === island,
    };
  });

  // 每座岛的战斗数据（小怪 / 神秘小怪 / Boss），供聚焦态渲染
  const islandData: Record<string, IslandBattleData> = {};
  for (const it of islands) {
    const all = getMonstersByIsland(it.name);
    const minions = all
      .filter((m) => m.type === "minion")
      .map((m) => ({ id: m.id, name: m.name, question: m.question }));
    const hiddenMonsters = all
      .filter((m) => m.type === "hidden")
      .filter((m) => {
        try {
          const req = (JSON.parse(m.options ?? "{}") as { required_sparks?: number }).required_sparks;
          return req != null && sparks.total >= req;
        } catch {
          return false;
        }
      })
      .map((m) => ({ id: m.id, name: m.name, question: m.question }));
    const bosses = getBossesByIsland(it.name).map((b) => ({
      id: b.id,
      name: b.name,
      question: b.question,
      purified: b.target_meta ? isInternalized(b.target_meta) : false,
    }));
    islandData[it.name] = { minions, hiddenMonsters, bosses };
  }

  const metas = getInternalizedMetas();
  const brain = getBrainSettings();
  const avatar = explorer.name.split(" ").pop() ?? "🧭";

  // 进化路线数据（谱系树）：锁定的本领写清去哪里解锁
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
    <div className="sky-bg min-h-screen pb-24">
      {/* 顶部 HUD：像素面板 */}
      <div className="mx-auto max-w-6xl px-4 pt-5 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="pixel-panel px-4 py-2.5">
            <h1 className="text-xl font-black text-[#2b3a4a] lg:text-2xl">🏝️ {island}</h1>
            <p className="mt-0.5 text-xs font-bold text-[#7a8a9a]">
              ⭐ 已掌握 {metas.length} 个本领 ·🏝️ 已点亮 {islands.filter((i) => i.unlocked).length} 座岛
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EvolutionPathButton nodes={nodes} edges={edges} />
            <Link
              href="/ask"
              className="pixel-btn pixel-btn-pink px-4 py-2 text-sm"
              title="去好奇心营地提问，赢取火花解锁神秘小怪"
            >
              ✨ 火花 {sparks.total}
            </Link>
            <SettingsEntry />
            <span className="pixel-panel flex h-12 w-12 items-center justify-center text-2xl">{avatar}</span>
          </div>
        </header>
      </div>

      {/* 像素地图 */}
      <main className="mx-auto mt-4 max-w-6xl px-4 lg:px-8">
        <WorldMap
          nodes={worldNodes}
          edges={worldEdges}
          islandData={islandData}
          avatar={avatar}
          initialIsland={island}
        />

        {/* 伙伴引导 */}
        <div className="mt-5">
          <Guide message={welcomeGuide(explorer.name.split(" ")[0], island, brain)} />
        </div>
      </main>

      <BottomNav />
      <TestTools />
    </div>
  );
}

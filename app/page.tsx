import { seedIfEmpty } from "@/lib/seed";
import { getWorldLayout } from "@/lib/worldLayout";
import {
  getExplorer,
  getMonsters,
  getInternalizedMetas,
  getBrainSettings,
  getMetas,
  getEvolutionEdges,
  getSpirit,
  isInternalized,
  getIslands,
  getBossByTarget,
  getIslandLevel,
  getConfig,
} from "@/lib/repo";
import { getSparkStats, getVisibleGuardsByIsland, checkAwakenings } from "@/lib/game";
import { welcomeGuide } from "@/lib/brain";
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
  const allEdges = getEvolutionEdges(); // 复用：世界图连线 + 谱系树
  const allMonsters = getMonsters(); // 一次拉全量，分组出小怪/守卫/Boss，避免逐岛查询
  const worldEdges = allEdges.map((e) => ({ from: e.from_meta, to: e.to_meta }));
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

  // 每座岛的战斗数据（小怪 / 守卫 / 神秘小怪 / Boss / 岛等级），供聚焦态渲染
  const islandData: Record<string, IslandBattleData> = {};
  const byIsland = new Map<string, ReturnType<typeof getMonsters>>();
  for (const m of allMonsters) {
    const list = byIsland.get(m.island) ?? [];
    list.push(m);
    byIsland.set(m.island, list);
  }
  for (const it of islands) {
    const all = byIsland.get(it.name) ?? [];
    const minions = all
      .filter((m) => m.type === "minion")
      .map((m) => ({ id: m.id, name: m.name, question: m.question }));
    const guards = all
      .filter((m) => m.type === "guard")
      .filter((m) => {
        // 守卫：达标且未打赢才显示（多精灵守卫按 spawn_islands 决定是否在本岛现身）
        const info = getVisibleGuardsByIsland(it.name);
        return info.some((g) => g.id === m.id);
      })
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
    const bosses = all
      .filter((m) => m.type === "boss")
      .map((b) => ({
        id: b.id,
        name: b.name,
        question: b.question,
        purified: b.target_meta ? isInternalized(b.target_meta) : false,
      }));
    islandData[it.name] = { minions, guards, hiddenMonsters, bosses, islandLevel: getIslandLevel(it.name) };
  }

  // 觉醒广播：有守卫达标待挑战时，首页提示「有些奇妙的事情发生了……」
  const awakenings = checkAwakenings();

  const metas = getInternalizedMetas();
  const brain = getBrainSettings();
  const avatar = explorer.name.split(" ").pop() ?? "🧭";

  // 进化路线数据（谱系树）：锁定的本领写清去哪里解锁
  const nodes: ChainNode[] = allMetas.map((m) => {
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
  const edges: ChainEdge[] = allEdges.map((e) => ({
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
            <Link
              href="/parent"
              className="pixel-btn pixel-btn-white px-3 py-2 text-sm"
              title="家长窗口：查看学习进度、错题和每日总结"
            >
              👨‍👩‍👧 家长
            </Link>
            <SettingsEntry />
            <span className="pixel-panel flex h-12 w-12 items-center justify-center text-2xl">{avatar}</span>
          </div>
        </header>
      </div>

      {/* 觉醒广播：有守卫达标待挑战（config.broadcast 可关） */}
      {awakenings.length > 0 && getConfig("broadcast", "1") === "1" && (
        <div className="mx-auto mt-3 max-w-6xl px-4 lg:px-8">
          <div className="animate-pop rounded-xl border-2 border-[#ffd54f] bg-gradient-to-r from-[#fff8e1] to-[#fdf6e0] px-4 py-3 shadow-[0_4px_0_rgba(43,58,74,0.2)]">
            <p className="text-sm font-black text-[#2b3a4a]">
              ✨ 有些奇妙的事情发生了…… 知识守卫现身了！
            </p>
            <p className="mt-0.5 text-xs font-bold text-[#7a8a9a]">
              {awakenings
                .map((g) => `${g.property_name}（${g.spawn_mode === "random" ? "找找它在哪座岛" : g.island}）`)
                .join(" · ")}
              —— 打败它，让精灵觉醒！
            </p>
          </div>
        </div>
      )}

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

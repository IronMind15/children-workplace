import { seedIfEmpty } from "@/lib/seed";
import { getWorldLayout, getWorldPages } from "@/lib/worldLayout";
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
  getAllIslandLevels,
  getConfig,
} from "@/lib/repo";
import { getSparkStats, checkAwakenings } from "@/lib/game";
import { welcomeGuide } from "@/lib/brain";
import { redirect } from "next/navigation";
import Link from "next/link";
import Guide from "@/components/Guide";
import TopShell from "@/components/TopShell";
import SettingsEntry from "@/components/SettingsEntry";
import TestTools from "@/components/TestTools";
import WorldMap from "@/components/WorldMap";
import AwakeningToast from "@/components/AwakeningToast";
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
  // 性能：守卫可见性与岛等级都在循环外一次性拉全量（内存过滤），避免 29 岛 × 2 次 SQLite 查询
  const awakenings = checkAwakenings(); // 达标守卫（广播 + 岛内现身共用）
  const islandLevels = getAllIslandLevels();
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
        // 守卫：达标且未打赢才显示（单精灵守卫在本岛必现，多精灵守卫按 spawn_islands 随机池）
        const info = awakenings.find((g) => g.id === m.id);
        if (!info) return false;
        return info.spawn_mode === "fixed" ? info.island === it.name : info.spawn_islands.includes(it.name);
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
    islandData[it.name] = { minions, guards, hiddenMonsters, bosses, islandLevel: islandLevels[it.name] ?? 1 };
  }

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
    <div className="sky-bg min-h-screen pb-6 pt-20">
      {/* 顶栏：TopShell（含 logo 占位 + 主 tab + 火花 + 我的头像菜单） */}
      <TopShell avatar={avatar} sparks={sparks.total} />

      {/* 觉醒广播 Toast：右下角浮动通知（可关闭，8 秒自动收起，不占地图空间） */}
      <AwakeningToast
        awakenings={awakenings.map((g) => ({
          propertyName: g.property_name,
          island: g.island,
          spawnMode: g.spawn_mode,
        }))}
        broadcastOn={getConfig("broadcast", "1") === "1"}
      />

      {/* 世界地图：全宽（充分利用屏幕，tab 已在顶部） */}
      <main className="mx-auto mt-3 max-w-[1500px] px-2 lg:px-4">
        <WorldMap
          nodes={worldNodes}
          edges={worldEdges}
          islandData={islandData}
          avatar={avatar}
          initialIsland={island}
          pageLabels={getWorldPages(layout).map((p) => p.label)}
        />

        {/* 伙伴引导 */}
        <div className="mt-4">
          <Guide message={welcomeGuide(explorer.name.split(" ")[0], island, brain)} />
        </div>
      </main>

      {/* 设置入口：长按进入家长端·伙伴日记（REQ-PARENT-01 隐藏入口） */}
      <div className="fixed bottom-4 right-4 z-30">
        <SettingsEntry />
      </div>

      <TestTools />
    </div>
  );
}

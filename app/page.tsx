import { seedIfEmpty } from "@/lib/seed";
import { requireUser } from "@/lib/session";
import { getWorldLayout, getWorldPages, pageOf, pageOfIsland } from "@/lib/worldLayout";
import { QUESTIONS, AI_TIPS, RECOMMEND_BY_META } from "@/lib/askBank";
import {
  getExplorer,
  getMonsters,
  getInternalizedMetas,
  getInternalized,
  getBrainSettings,
  getMetas,
  getEvolutionEdges,
  getSpirit,
  isInternalized,
  getIslands,
  getBossByTarget,
  getAllIslandLevels,
  getConfig,
  getMeta,
  getMonster,
  getSpiritsForInternalized,
  getIslandLevel,
  getAwakenedPropertyIds,
  getExplorerAvatarSrc,
  getExplorerRankInfo,
  getMetaAwakened,
  getGuardsByIsland,
} from "@/lib/repo";
import { getSparkStats, checkAwakenings, getIslandDifficulty } from "@/lib/game";
import { getAiConfig } from "@/lib/ai";
import { generateSteps, guardSteps } from "@/lib/questions";
import { pickGuardStyle } from "@/lib/guardStyles";
import { getMinionBattleBg, GUARD_BATTLE_BG, BOSS_BATTLE_BG } from "@/lib/battleArt";
import { redirect } from "next/navigation";
import TopShell from "@/components/TopShell";
import SettingsEntry from "@/components/SettingsEntry";
import TestTools from "@/components/TestTools";
import AwakeningToast from "@/components/AwakeningToast";
import HomeClient, { type View } from "@/components/HomeClient";
import type { ChainNode, ChainEdge } from "@/components/EvolutionModal";
import type { SolveStep } from "@/lib/types";

// 数据全部来自 SQLite（会随游戏进程变化），禁用静态缓存
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ battle?: string; boss?: string; island?: string }> }) {
  // 先完成全部 await（searchParams / cookie 会话），此后主体保持同步执行，
  // 避免异步点让出事件循环导致并发请求覆盖「当前用户上下文」。
  const sp = await searchParams;
  const uid = await requireUser();
  seedIfEmpty();
  const explorer = getExplorer();
  if (!explorer?.name) redirect("/onboarding");
  const island = explorer.current_island ?? "计数岛";
  const sparks = getSparkStats();
  const brain = getBrainSettings();

  // 全部元认知 + 世界地图坐标
  const allMetas = getMetas();
  const islands = getIslands();
  const layout = getWorldLayout();
  const allEdges = getEvolutionEdges();
  const allMonsters = getMonsters();
  const worldEdges = allEdges.map((e) => ({ from: e.from_meta, to: e.to_meta }));
  const worldNodes = allMetas.map((m) => {
    const iname = `${m.name}岛`;
    const c = layout[m.id];
    return {
      metaId: m.id,
      island: iname,
      x: c?.x ?? 50,
      y: c?.y ?? 50,
      depth: c?.depth ?? 0,
      page: pageOf(m.id),
      unlocked: islands.find((i) => i.name === iname)?.unlocked ?? false,
      isCurrent: iname === island,
    };
  });
  const pageLabels = getWorldPages(layout).map((p) => p.label);

  // 单岛战斗数据
  const awakenings = checkAwakenings();
  const islandLevels = getAllIslandLevels();
  const islandData: Record<string, { minions: { id: string; name: string; question: string }[]; guards: { id: string; name: string; question: string }[]; hiddenMonsters: { id: string; name: string; question: string }[]; bosses: { id: string; name: string; question: string; purified: boolean }[]; islandLevel: number }> = {};
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

  // AskPanel 数据
  const metas = getInternalizedMetas();
  const masteredIds = new Set(metas.map((m) => m.id));
  const recIds = new Set(metas.flatMap((m) => RECOMMEND_BY_META[m.id] ?? []));
  const askQuestions = [...QUESTIONS, ...AI_TIPS]
    .filter((q) => recIds.has(q.id))
    .slice(0, 6)
    .map((q) => ({ id: q.id, emoji: q.emoji, label: q.label, category: q.category as string }));
  if (askQuestions.length < 3) {
    askQuestions.push(
      ...QUESTIONS.slice(0, 3 - askQuestions.length).map((q) => ({
        id: q.id, emoji: q.emoji, label: q.label, category: q.category as string,
      })),
    );
  }
  const rewards = islands
    .flatMap((isl) => allMonsters.filter((m) => m.island === isl.name))
    .filter((m) => m.type === "hidden")
    .map((m) => {
      let required = 999;
      try {
        required = (JSON.parse(m.options ?? "{}") as { required_sparks?: number }).required_sparks ?? 999;
      } catch {}
      return { name: m.name, required };
    })
    .sort((a, b) => a.required - b.required);
  const aiConfigured = !!getAiConfig();

  // 当前岛（探险家化身所在）→ 分岛费曼学习上下文：领域 / 等级 / 觉醒 / 分层
  const islandMeta = allMetas.find((m) => `${m.name}岛` === island) ?? null;
  const curMetaId = islandMeta?.id ?? null;
  const curInternalized = curMetaId ? getInternalized(curMetaId) : null;
  const curAwakened = curMetaId ? getMetaAwakened(curMetaId) : false;
  const currentIslandMeta = curMetaId && islandMeta
    ? {
        metaId: curMetaId,
        name: islandMeta.name,
        domain: islandMeta.domain,
        island,
        internalized: !!curInternalized,
        level: curInternalized?.mastery_level ?? 0,
        awakened: curAwakened,
        tier: (curAwakened ? "advanced" : curInternalized ? "practicing" : "base") as
          | "base"
          | "practicing"
          | "advanced",
      }
    : null;

  // 进化链节点（EvolutionModal 用）
  const chainNodes: ChainNode[] = allMetas.map((m) => {
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
  const chainEdges: ChainEdge[] = allEdges.map((e) => ({
    from: e.from_meta,
    to: e.to_meta,
    operator: e.operator,
  }));

  // 守卫战样式：与该岛在群岛地图上的样式一致（按群岛页号 + 岛内守卫序号链式避重复）
  function computeGuardStyleIndex(guardId: string, islandName: string): number {
    const guards = getGuardsByIsland(islandName); // 该岛全部守卫（与地图渲染顺序一致）
    const idx = guards.findIndex((g) => g.id === guardId);
    if (idx < 0) return 1;
    const page = pageOfIsland(islandName); // v1.2.11：按岛名查群岛页（此前误用 pageOf(MK id) 恒为 1）
    let prev: number | undefined;
    let style = 1;
    for (let i = 0; i <= idx; i++) {
      style = pickGuardStyle(page, i, prev);
      prev = style;
    }
    return style;
  }

  // ===== 决策 view 状态 =====
  let view: View = { kind: "map" };
  const spiritsAll = getSpiritsForInternalized().map((s) => {
    const meta = getMeta(s.meta_id);
    const im = getInternalized(s.meta_id);
    return {
      meta_id: s.meta_id,
      emoji: s.emoji,
      nickname: s.nickname ?? "",
      meta_name: meta?.name ?? "",
      level: im?.mastery_level ?? 1,
      awakened: getMetaAwakened(s.meta_id),
    };
  });
  let battleData: {
    monsterId: string;
    name: string;
    question: string;
    correctMeta: string;
    steps: SolveStep[];
    mode: "train" | "guard";
    propertyName?: string;
    returnIsland: string;
    spirits: { meta_id: string; emoji: string; nickname: string; meta_name: string; level: number; awakened: boolean }[];
    /** 守卫外观样式索引（1~6），守卫战渲染对应形象用；非守卫忽略 */
    guardStyleIndex?: number;
    /** v1.2.10 战斗背景图（群岛小怪按 page / 守卫统一） */
    battleBg: string;
  } | undefined;
  let bossData: {
    monsterId: string;
    name: string;
    question: string;
    steps: SolveStep[];
    targetMeta?: string;
    metaName: string;
    returnIsland: string;
    battleBg: string;
  } | undefined;

  if (sp.battle) {
    const m = getMonster(sp.battle);
    if (m && ["minion", "hidden", "guard"].includes(m.type) && m.correct_meta && m.steps) {
      let steps: SolveStep[];
      let mode: "train" | "guard" = "train";
      let propertyName: string | undefined;
      if (m.type === "guard") {
        mode = "guard";
        const propertyId = m.id.replace(/^guard-/, "").toUpperCase();
        const gs = guardSteps(propertyId);
        steps = gs.length > 0 ? gs : (JSON.parse(m.steps) as SolveStep[]);
        propertyName = getMeta(m.correct_meta)?.name ?? "";
      } else if (m.type === "minion") {
        const metaName = getMeta(m.correct_meta)?.name ?? "";
        const level = getIslandDifficulty(m.correct_meta);
        steps = generateSteps(m.correct_meta, undefined, level, {
          islandLevel: getIslandLevel(`${metaName}岛`),
          awakened: getAwakenedPropertyIds(),
        });
      } else {
        steps = JSON.parse(m.steps) as SolveStep[];
      }
      battleData = {
        monsterId: m.id,
        name: m.name,
        question: m.question,
        correctMeta: m.correct_meta,
        steps,
        mode,
        propertyName,
        returnIsland: m.island,
        spirits: spiritsAll,
        // 守卫战：算好该守卫的外观样式索引（与岛上一致：按群岛页号 + 岛内守卫序号链式避重复）
        guardStyleIndex: mode === "guard" ? computeGuardStyleIndex(m.id, m.island) : undefined,
        // v1.2.10 战斗背景：守卫统一 guard_bg，小怪按群岛 page 选 arch_XX_bg
        battleBg: mode === "guard" ? GUARD_BATTLE_BG : getMinionBattleBg(pageOfIsland(m.island)),
      };
      view = { kind: "battle", monsterId: m.id };
    }
  } else if (sp.boss) {
    const m = getMonster(sp.boss);
    if (m && m.type === "boss" && m.steps) {
      bossData = {
        monsterId: m.id,
        name: m.name,
        question: m.question,
        steps: JSON.parse(m.steps) as SolveStep[],
        targetMeta: m.target_meta ?? undefined,
        metaName: m.target_meta ? (getMeta(m.target_meta)?.name ?? m.name) : m.name,
        returnIsland: m.island,
        // v1.2.10 Boss 战斗背景统一 boss.png
        battleBg: BOSS_BATTLE_BG,
      };
      view = { kind: "boss", monsterId: m.id };
    }
  } else if (sp.island) {
    if (islandData[sp.island]) {
      view = { kind: "island", island: sp.island };
    }
  }

  const avatarSrc = getExplorerAvatarSrc(explorer);
  const rank = getExplorerRankInfo();
  const rankForUi = {
    level: rank.level,
    title: rank.title,
    sparks: rank.sparks,
    nextTitle: rank.next?.title ?? null,
    nextCondition: rank.next?.condition ?? null,
    progressPct: rank.progressPct,
  };

  return (
    <div className="sky-bg min-h-screen pb-6 pt-20">
      <TopShell avatarSrc={avatarSrc} sparks={sparks.total} rank={rankForUi} />
      <AwakeningToast
        awakenings={awakenings.map((g) => ({
          propertyName: g.property_name,
          island: g.island,
          spawnMode: g.spawn_mode,
        }))}
        broadcastOn={getConfig("broadcast", "1") === "1"}
      />
      <main className="mt-3">
        <HomeClient
          view={view}
          worldNodes={worldNodes}
          worldEdges={worldEdges}
          avatarSrc={avatarSrc}
          initialIsland={island}
          pageLabels={pageLabels}
          islandData={islandData}
          sparks={sparks.total}
          todayCount={sparks.todayCount}
          questions={askQuestions}
          rewards={rewards}
          aiConfigured={aiConfigured}
          recentMetas={getInternalizedMetas().slice(-3).reverse().map((m) => ({ id: m.id, name: getMeta(m.id)?.name ?? m.id }))}
          currentIslandMeta={currentIslandMeta}
          battleData={battleData}
          bossData={bossData}
          brain={brain}
          chainNodes={chainNodes}
          chainEdges={chainEdges}
        />
      </main>
      <div className="fixed bottom-4 right-4 z-30">
        <SettingsEntry />
      </div>
      <TestTools />
    </div>
  );
}

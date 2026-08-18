import { seedIfEmpty } from "@/lib/seed";
import { requireUser } from "@/lib/session";
import fs from "node:fs";
import path from "node:path";
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
import { getSparkStats, checkAwakenings, getIslandDifficulty, getReviewSteps, getUnresolvedMistakeCountByMeta, getMysteryState } from "@/lib/game";
import { getHiddenMonsterMeta } from "@/lib/content";
import { getAiConfig } from "@/lib/ai";
import { generateSteps, guardSteps } from "@/lib/questions";
import { pickGuardStyle } from "@/lib/guardStyles";
import { getMinionBattleBg, GUARD_BATTLE_BG, BOSS_BATTLE_BG } from "@/lib/battleArt";
import { redirect } from "next/navigation";
import TopShell from "@/components/TopShell";
import TestTools from "@/components/TestTools";
import AwakeningToast from "@/components/AwakeningToast";
import HomeClient, { type View } from "@/components/HomeClient";
import type { ChainNode, ChainEdge } from "@/components/EvolutionModal";
import type { SolveStep } from "@/lib/types";

// 数据全部来自 SQLite（会随游戏进程变化），禁用静态缓存
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ battle?: string; boss?: string; island?: string; finalboss?: string }> }) {
  // 先完成全部 await（searchParams / cookie 会话），此后主体保持同步执行，
  // 避免异步点让出事件循环导致并发请求覆盖「当前用户上下文」。
  const sp = await searchParams;
  await requireUser();
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
  const mysteryState = getMysteryState();
  const islandData: Record<string, { minions: { id: string; name: string; question: string }[]; guards: { id: string; name: string; question: string }[]; hiddenMonsters: { id: string; name: string; question: string; rarity: string; emoji: string; color: string; newBadge: boolean }[]; bosses: { id: string; name: string; question: string; purified: boolean }[]; islandLevel: number }> = {};
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
    // 神秘小怪：火花门槛常驻现身 OR 保底邂逅可见（带"新出现"角标）
    const hiddenMonsters = all
      .filter((m) => m.type === "hidden")
      .filter((m) => {
        const visible = mysteryState.visibleIds.includes(m.id);
        if (visible) return true;
        try {
          const req = (JSON.parse(m.options ?? "{}") as { required_sparks?: number }).required_sparks;
          return req != null && sparks.total >= req;
        } catch {
          return false;
        }
      })
      .map((m) => {
        const meta = getHiddenMonsterMeta(m);
        return {
          id: m.id,
          name: m.name,
          question: m.question,
          rarity: meta.rarity,
          emoji: meta.emoji,
          color: meta.color,
          newBadge: mysteryState.visibleIds.includes(m.id),
        };
      });
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
    correctMeta: string | null;
    steps: SolveStep[];
    mode: "train" | "guard" | "fun";
    propertyName?: string;
    returnIsland: string;
    spirits: { meta_id: string; emoji: string; nickname: string; meta_name: string; level: number; awakened: boolean }[];
    /** fun 模式：神秘小怪专属形象（emoji + 稀有度配色） */
    hiddenEmoji?: string;
    hiddenColor?: string;
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
    if (m && ["minion", "hidden", "guard"].includes(m.type) && m.steps && (m.type === "hidden" || m.correct_meta)) {
      let steps: SolveStep[];
      let mode: "train" | "guard" | "fun" = "train";
      let propertyName: string | undefined;
      if (m.type === "guard") {
        mode = "guard";
        const propertyId = m.id.replace(/^guard-/, "").toUpperCase();
        const gs = guardSteps(propertyId);
        steps = gs.length > 0 ? gs : (JSON.parse(m.steps) as SolveStep[]);
        propertyName = getMeta(m.correct_meta!)?.name ?? "";
      } else if (m.type === "hidden") {
        // 神秘小怪：fun 模式（不选精灵、无知识奖励，答对=收集进图鉴）
        mode = "fun";
        steps = JSON.parse(m.steps) as SolveStep[];
      } else if (m.type === "minion") {
        const cm = m.correct_meta!; // 已由外层条件保证（非 hidden 必有 correct_meta）
        const metaName = getMeta(cm)?.name ?? "";
        const level = getIslandDifficulty(cm);
        const baseSteps = generateSteps(cm, undefined, level, {
          islandLevel: getIslandLevel(`${metaName}岛`),
          awakened: getAwakenedPropertyIds(),
        });
        // 错题重做：按未掌握错题数加权，把旧错题插进招式之间，让孩子更可能碰到并改对
        const unresolved = getUnresolvedMistakeCountByMeta(cm);
        const reviewSteps =
          unresolved > 0
            ? getReviewSteps(cm, Math.min(3, Math.max(1, Math.ceil(unresolved / 2))))
            : [];
        steps = baseSteps;
        if (reviewSteps.length > 0 && baseSteps.length > 0) {
          steps = [...baseSteps];
          let at = Math.min(1, steps.length);
          for (const rs of reviewSteps) {
            steps.splice(at, 0, rs);
            at += 2;
          }
        }
      } else {
        steps = JSON.parse(m.steps) as SolveStep[];
      }
      // 联手题过滤：requires 里若有还没内化的本领，这题选不出帮手（会卡关/出现未获得精灵）
      // → 跳过该题；若全被过滤（极端）则保留原 steps 兜底，避免 0 招战斗
      const usable = steps.filter(
        (s) => !s.requires || s.requires.length === 0 || s.requires.every((r) => masteredIds.has(r))
      );
      if (usable.length > 0) steps = usable;
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
        // fun 模式：神秘小怪专属形象
        hiddenEmoji: mode === "fun" ? getHiddenMonsterMeta(m).emoji : undefined,
        hiddenColor: mode === "fun" ? getHiddenMonsterMeta(m).color : undefined,
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
  } else if (sp.finalboss) {
    // 终章 · 最终决战新区域（暗影终焉岛入口）
    view = { kind: "finalboss" };
  }

  const avatarSrc = getExplorerAvatarSrc(explorer);

  // 终章「最终决战」：自动识别 public/finalboss 下队友放的互动小游戏 HTML（不只一个）
  let finalbossGames: { name: string; src: string }[] = [];
  try {
    const dir = path.join(process.cwd(), "public", "finalboss");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith(".html") && !f.toLowerCase().startsWith("readme"));
    finalbossGames = files
      .map((f) => ({
        name: f
          .replace(/\.html$/i, "")
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        src: `/finalboss/${f}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    finalbossGames = [];
  }

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
          finalbossGames={finalbossGames}
          chainNodes={chainNodes}
          chainEdges={chainEdges}
        />
      </main>
      <TestTools />
    </div>
  );
}

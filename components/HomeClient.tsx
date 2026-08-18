"use client";

/**
 * HomeClient：主界面左侧 + 右侧 AI 助手的客户端布局
 *  - 左侧三种视图：群岛地图（map）/ 单岛战斗地图（island）/ 战斗流程（battle/boss）
 *  - 切换通过 URL `?island= / ?battle= / ?boss=` 同步（router.replace），刷新/分享可恢复
 *  - 右侧 AI 助手：展开态（占 25% 宽）/ 最小化（变右下角浮标）
 *  - AI 助手最小化时，左侧延伸到 100% 宽（grid-cols-[1fr]）
 *  - 高度等高：CSS Grid + items-stretch，两栏自动等高
 */

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WorldMap from "@/components/WorldMap";
import WorldArchipelago from "@/components/WorldArchipelago";
import IslandBattleMap from "@/components/IslandBattleMap";
import BattleFlow from "@/components/BattleFlow";
import BossFlow from "@/components/BossFlow";
import AskPanel from "@/components/AskPanel";
import TutorialOverlay from "@/components/TutorialOverlay";
import UiButton from "@/components/UiButton";
import FinalBossRegion from "@/components/FinalBossRegion";
import { EVIL_ISLAND_META_ID, EVIL_ISLAND_NAME } from "@/lib/worldMapData";
import type { WorldNode, WorldEdge } from "@/components/WorldMap";
import type { SolveStep } from "@/lib/types";
import type { ChainNode, ChainEdge } from "@/components/EvolutionModal";
import type { BrainSettings } from "@/lib/brain";

// 单岛战斗数据（与 IslandBattleMap 的 MapMonster/MapBoss 兼容）
type IslandData = {
  minions: { id: string; name: string; question: string }[];
  guards: { id: string; name: string; question: string }[];
  hiddenMonsters: { id: string; name: string; question: string }[];
  bosses: { id: string; name: string; question: string; purified: boolean }[];
  islandLevel?: number;
};

export type View =
  | { kind: "map" }
  | { kind: "island"; island: string }
  | { kind: "battle"; monsterId: string }
  | { kind: "boss"; monsterId: string }
  | { kind: "finalboss" };

export default function HomeClient({
  view,
  worldNodes,
  worldEdges,
  avatarSrc,
  initialIsland,
  pageLabels,
  islandData,
  sparks,
  todayCount,
  questions,
  rewards,
  aiConfigured,
  recentMetas,
  currentIslandMeta,
  battleData,
  bossData,
  brain,
  chainNodes,
  chainEdges,
  finalbossGames,
}: {
  view: View;
  worldNodes: WorldNode[];
  worldEdges: WorldEdge[];
  avatarSrc: string;
  initialIsland: string;
  pageLabels: string[];
  islandData: Record<string, IslandData>;
  sparks: number;
  todayCount: number;
  questions: { id: string; emoji: string; label: string; category: string; badge?: string }[];
  rewards: { name: string; required: number }[];
  aiConfigured: boolean;
  recentMetas: { id: string; name: string }[];
  currentIslandMeta?: {
    metaId: string;
    name: string;
    domain: string;
    island: string;
    internalized: boolean;
    level: number;
    awakened: boolean;
    tier: "base" | "practicing" | "advanced";
  } | null;
  battleData?: {
    monsterId: string;
    name: string;
    question: string;
    correctMeta: string;
    steps: SolveStep[];
    mode: "train" | "guard";
    propertyName?: string;
    returnIsland: string;
    spirits: { meta_id: string; emoji: string; nickname: string; meta_name: string; level: number; awakened: boolean }[];
    guardStyleIndex?: number;
    battleBg: string;
  };
  bossData?: {
    monsterId: string;
    name: string;
    question: string;
    steps: SolveStep[];
    targetMeta?: string;
    metaName: string;
    returnIsland: string;
    battleBg: string;
  };
  brain: BrainSettings;
  chainNodes: ChainNode[];
  chainEdges: ChainEdge[];
  finalbossGames: { name: string; src: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [askMinimized, setAskMinimized] = useState(false);
  const [lockedHint, setLockedHint] = useState<string | null>(null);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  // 主界面地图视图：群岛（原有分页）/ 大地图（v1.3.0 统一缩放图）共存切换
  const [mapMode, setMapMode] = useState<"archipelago" | "big">("archipelago");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kb:mapMode");
      if (saved === "archipelago" || saved === "big") setMapMode(saved);
    } catch {}
  }, []);
  function switchMapMode(m: "archipelago" | "big") {
    setMapMode(m);
    try {
      localStorage.setItem("kb:mapMode", m);
    } catch {}
  }

  // 大地图专用：在 29 座学习岛之外，叠加终章「暗影终焉岛」（仅大地图出现，群岛分页不包含）
  const bigMapNodes = useMemo<WorldNode[]>(
    () => [
      ...worldNodes,
      {
        metaId: EVIL_ISLAND_META_ID,
        island: EVIL_ISLAND_NAME,
        x: 50,
        y: 38,
        depth: 0,
        page: 0,
        unlocked: true,
        isCurrent: false,
      },
    ],
    [worldNodes],
  );

  // 点击岛屿：邪恶岛特判 → 进入最终决战新区域；其余照常进入单岛
  function pickIsland(island: string) {
    if (island === EVIL_ISLAND_NAME) goTo({ kind: "finalboss" });
    else goTo({ kind: "island", island });
  }

  // 新手引导：开启后返回主界面自动进入；或手动 ?tutorial=1 重看
  const forceTutorial = searchParams.get("tutorial") === "1";
  useEffect(() => {
    try {
      setTutorialDone(localStorage.getItem("tutorial:done") === "1");
    } catch {}
  }, []);
  const tutorialActive = (brain.tutorial_enabled && !tutorialDone) || forceTutorial;
  const showTutorial = tutorialActive && view.kind === "map" && !tutorialDismissed;
  function closeTutorial() {
    setTutorialDismissed(true);
    if (brain.tutorial_enabled) {
      try {
        localStorage.setItem("tutorial:done", "1");
      } catch {}
    }
  }

  // URL → view 已经在 server 端完成；这里只读 searchParams 保持响应
  useEffect(() => {
    // 保留 searchParams 触发响应（如 ?battle=ID 改变）
  }, [searchParams]);

  function goTo(next: View) {
    if (next.kind === "map") router.replace("/");
    else if (next.kind === "island") router.replace(`/?island=${encodeURIComponent(next.island)}`);
    else if (next.kind === "battle") router.replace(`/?battle=${encodeURIComponent(next.monsterId)}`);
    else if (next.kind === "boss") router.replace(`/?boss=${encodeURIComponent(next.monsterId)}`);
    else router.replace("/?finalboss=1");
  }

  // 教程引导：取第一只可打小怪 / 第一个 Boss，供「新手教程」一键去体验
  const tutMinion = useMemo(() => {
    for (const d of Object.values(islandData)) if (d.minions[0]) return d.minions[0].id;
    return undefined;
  }, [islandData]);
  const tutBoss = useMemo(() => {
    for (const d of Object.values(islandData)) if (d.bosses[0]) return d.bosses[0].id;
    return undefined;
  }, [islandData]);
  const tutBattle = (id: string) => goTo({ kind: "battle", monsterId: id });
  const tutBossGo = (id: string) => goTo({ kind: "boss", monsterId: id });
  const tutMistakes = () => router.push("/mistakes");
  const tutAsk = () => setAskMinimized(false);

  function locked(island: string) {
    setLockedHint(island);
    setTimeout(() => setLockedHint(null), 2200);
  }

  // 渲染左侧内容
  let leftContent: React.ReactNode;
  if (view.kind === "map") {
    leftContent = (
      <div className="flex h-full flex-col">
        {/* 群岛 / 大地图 共存切换（默认群岛，恢复原有分页布局） */}
        <div className="mb-2 flex shrink-0 items-center gap-2">
          <div className="inline-flex rounded-xl border-2 border-[#2b3a4a] bg-white p-0.5 text-sm font-black shadow-card">
            <button
              onClick={() => switchMapMode("archipelago")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                mapMode === "archipelago" ? "bg-[#f79228] text-white" : "text-[#2b3a4a] hover:bg-[#fde9d0]"
              }`}
            >
              🏝️ 群岛
            </button>
            <button
              onClick={() => switchMapMode("big")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                mapMode === "big" ? "bg-[#f79228] text-white" : "text-[#2b3a4a] hover:bg-[#fde9d0]"
              }`}
            >
              🗺️ 大地图
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          {mapMode === "archipelago" ? (
            <WorldArchipelago
              nodes={worldNodes}
              edges={worldEdges}
              avatarSrc={avatarSrc}
              initialIsland={initialIsland}
              pageLabels={pageLabels}
              onPickIsland={pickIsland}
              onLocked={locked}
            />
          ) : (
            <WorldMap
              nodes={bigMapNodes}
              edges={worldEdges}
              avatarSrc={avatarSrc}
              initialIsland={initialIsland}
              pageLabels={pageLabels}
              onPickIsland={pickIsland}
              onLocked={locked}
            />
          )}
        </div>
      </div>
    );
  } else if (view.kind === "island") {
    const d = islandData[view.island] ?? { minions: [], guards: [], hiddenMonsters: [], bosses: [] };
    leftContent = (
      <div className="flex h-full flex-col">
        <div className="mb-2 flex items-center gap-2">
          <UiButton onClick={() => goTo({ kind: "map" })} icon="arrowLeft">
            返回群岛
          </UiButton>
          <span className="text-lg font-black text-[#2b3a4a]">{view.island}</span>
          <span className="text-xs font-bold text-[#7a8a9a]">· 点击小怪开始战斗</span>
        </div>
        <div className="flex-1 min-h-0">
          <IslandBattleMap
            island={view.island}
            minions={d.minions}
            guards={d.guards}
            hiddenMonsters={d.hiddenMonsters}
            bosses={d.bosses}
            islandLevel={d.islandLevel}
            onPickMonster={(id) => goTo({ kind: "battle", monsterId: id })}
            onPickBoss={(id) => goTo({ kind: "boss", monsterId: id })}
          />
        </div>
      </div>
    );
  } else if (view.kind === "battle" && battleData) {
    leftContent = (
      <div className="h-full overflow-y-auto">
        <BattleFlow
          monsterId={battleData.monsterId}
          name={battleData.name}
          question={battleData.question}
          correctMeta={battleData.correctMeta}
          steps={battleData.steps}
          spirits={battleData.spirits}
          brain={brain}
          mode={battleData.mode}
          propertyName={battleData.propertyName}
          returnIsland={battleData.returnIsland}
          guardStyleIndex={battleData.guardStyleIndex}
          bgUrl={battleData.battleBg}
          avatarSrc={avatarSrc}
          embedded
        />
      </div>
    );
  } else if (view.kind === "boss" && bossData) {
    leftContent = (
      <div className="h-full overflow-y-auto">
        <BossFlow
          monsterId={bossData.monsterId}
          name={bossData.name}
          question={bossData.question}
          steps={bossData.steps}
          brain={brain}
          nodes={chainNodes}
          edges={chainEdges}
          targetMeta={bossData.targetMeta}
          metaName={bossData.metaName}
          returnIsland={bossData.returnIsland}
          bgUrl={bossData.battleBg}
          avatarSrc={avatarSrc}
          embedded
        />
      </div>
    );
  } else if (view.kind === "finalboss") {
    leftContent = (
      <FinalBossRegion
        avatarSrc={avatarSrc}
        games={finalbossGames}
        onExit={() => goTo({ kind: "map" })}
      />
    );
  } else {
    leftContent = (
      <div className="card p-8 text-center">
        <p className="text-base font-bold text-[#7a8a9a]">未找到该怪物数据</p>
        <button onClick={() => goTo({ kind: "map" })} className="btn btn-white mt-4 px-4 py-2 text-base">
          返回群岛
        </button>
      </div>
    );
  }

  // 整体 grid：最小化时左侧 1fr（占满），展开时 3fr 1fr
  // min-h：让两栏至少占满「视口 - 顶栏 - 上下边距」，保证地图/背景有足够高度
  const gridClass = askMinimized
    ? "grid-cols-[1fr] gap-3 min-h-[calc(100vh-150px)]"
    : "grid-cols-[3fr_1fr] gap-3 min-h-[calc(100vh-150px)]";

  // 锁岛提示
  const lockedBanner = lockedHint && (
    <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-md border-2 border-[#8a97a5] bg-[#e8edf2] px-3 py-1.5 text-base font-black text-[#7a8a9a] shadow-card animate-pop">
      🔒 {lockedHint} 还在迷雾中，先净化上游 Boss 才能登岛
    </div>
  );

  return (
    <div className="px-3 lg:px-6 xl:max-w-[1700px] xl:mx-auto">
      {lockedBanner}
      <div className={`grid grid-rows-1 items-stretch ${gridClass}`}>
        <div className="min-h-0 h-full">{leftContent}</div>
        {!askMinimized && (
          <div className="min-h-0 h-full">
            <AskPanel
              questions={questions}
              sparks={sparks}
              todayCount={todayCount}
              rewards={rewards}
              aiConfigured={aiConfigured}
              recentMetas={recentMetas}
              currentIslandMeta={currentIslandMeta}
              onMinimizeChange={setAskMinimized}
            />
          </div>
        )}
      </div>
      {/* 浮标态（fixed 定位）放 grid 外，避免参与 grid 布局导致左栏高度塌缩 */}
      {askMinimized && (
        <AskPanel
          questions={questions}
          sparks={sparks}
          todayCount={todayCount}
          rewards={rewards}
          aiConfigured={aiConfigured}
          recentMetas={recentMetas}
          currentIslandMeta={currentIslandMeta}
          onMinimizeChange={setAskMinimized}
        />
      )}

      {/* 新手引导浮层：返回主界面且已开启时自动进入；设置里可重看（reset） */}
      {showTutorial && (
        <TutorialOverlay
          avatarSrc={avatarSrc}
          firstMinion={tutMinion}
          firstBoss={tutBoss}
          onBattle={tutBattle}
          onBoss={tutBossGo}
          onMistakes={tutMistakes}
          onOpenAsk={tutAsk}
          onClose={closeTutorial}
          reset={forceTutorial}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import IslandBattleMap, { type MapMonster, type MapBoss } from "@/components/IslandBattleMap";
import WorldAtlas from "@/components/WorldAtlas";
import { getIslandThumb } from "@/lib/islandArt";
import { getArchipelagoBg, PAGE_COUNT } from "@/lib/worldLayout";
import { travelToIsland } from "@/lib/actions";

export type WorldNode = {
  metaId: string;
  island: string;
  x: number;
  y: number;
  depth: number;
  page: number; // 1~7
  unlocked: boolean;
  isCurrent: boolean;
};

export type WorldEdge = { from: string; to: string };

export type IslandBattleData = {
  minions: MapMonster[];
  guards: MapMonster[];
  hiddenMonsters: MapMonster[];
  bosses: MapBoss[];
  islandLevel?: number;
};

/**
 * 群岛（世界地图 · 按知识主题 7 群岛）
 *  - 7 页分页（1~7），每页独立群岛背景图（public/archipelagos/arch_0N.webp）
 *  - 节点：小圆圈 + 中央点 + 整体亮光 + 岛屿名（未解锁用🔒）
 *  - 主视图移除进化连线（按 2026-08-18 决策③，连线仅保留在全览 WorldAtlas）
 *  - 顶栏：页指示 + 全览按钮
 *  - 主体：群岛背景 + 岛屿节点（按原 x/y 散布其上）
 *  - 底部：横滑关卡卡片（Bug 1 修复：用各岛专属封面，不再复用大群岛背景）
 *  - 点岛 → 聚焦进入单岛战斗（沿用 setFocused 逻辑 + enter() 防卡关）
 */
export default function WorldMap({
  nodes,
  edges,
  islandData,
  avatar,
  initialIsland,
  pageLabels,
}: {
  nodes: WorldNode[];
  edges: WorldEdge[];
  islandData: Record<string, IslandBattleData>;
  avatar: string;
  initialIsland: string;
  /** 来自 worldLayout.getWorldPages 的页标签，7 项 */
  pageLabels: string[];
}) {
  const [page, setPage] = useState(0);
  const [focused, setFocused] = useState<string | null>(null);
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [lockedHint, setLockedHint] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // 默认跳到当前玩家所在群岛（按 pageOf）
  useEffect(() => {
    if (!initialIsland) return;
    const cur = nodes.find((n) => n.island === initialIsland);
    if (!cur) return;
    setPage(Math.max(0, cur.page - 1));
  }, [initialIsland, nodes]);

  // 战斗退出回岛：?focus=islandName → 自动 setFocused
  useEffect(() => {
    const f = searchParams?.get("focus");
    if (f) setFocused(f);
  }, [searchParams]);

  const totalPages = pageLabels.length || PAGE_COUNT;
  const safePage = Math.min(page, totalPages - 1);

  /** 当前页节点（按 ISLAND_PAGE_MAP 归页） */
  const currentPageNodes = useMemo(() => {
    const want = safePage + 1; // 1-based
    return nodes.filter((n) => n.page === want);
  }, [nodes, safePage]);

  const unlockedCount = nodes.filter((n) => n.unlocked).length;
  const bg = getArchipelagoBg(safePage + 1);

  function enter(island: string) {
    const node = nodes.find((n) => n.island === island);
    if (node && !node.unlocked) {
      setLockedHint(island);
      return;
    }
    setLockedHint(null);
    setFocused(island);
    travelToIsland(island);
  }

  function jumpTo(island: string) {
    const node = nodes.find((n) => n.island === island);
    if (!node) return;
    setPage(Math.max(0, node.page - 1));
    setLockedHint(null);
    setFocused(island);
    travelToIsland(island);
  }

  // ===== 聚焦态：放大进入单岛战斗地图 =====
  if (focused) {
    const d = islandData[focused] ?? { minions: [], guards: [], hiddenMonsters: [], bosses: [] };
    const node = nodes.find((n) => n.island === focused);
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button onClick={() => setFocused(null)} className="btn btn-white px-4 py-2 text-base">
            🌍 返回群岛
          </button>
          {!node?.unlocked && (
            <span className="rounded-md border-2 border-[#8a97a5] bg-[#e8edf2] px-2 py-1 text-sm font-bold text-[#7a8a9a]">
              🌫️ 这座岛还在迷雾中（净化上游 Boss 即可点亮）
            </span>
          )}
        </div>
        <IslandBattleMap
          island={focused}
          minions={d.minions}
          guards={d.guards}
          hiddenMonsters={d.hiddenMonsters}
          bosses={d.bosses}
          islandLevel={d.islandLevel}
          avatar={avatar}
        />
      </div>
    );
  }

  // ===== 全览模式 =====
  if (atlasOpen) {
    return (
      <WorldAtlas
        nodes={nodes}
        edges={edges}
        initialIsland={initialIsland}
        onClose={() => setAtlasOpen(false)}
      />
    );
  }

  return (
    <div>
      {lockedHint && (
        <div className="mb-2 flex items-center gap-2 rounded-md border-2 border-[#8a97a5] bg-[#e8edf2] px-3 py-1.5 text-base font-bold text-[#7a8a9a]">
          🔒 {lockedHint} 还在迷雾中，先净化上游 Boss 才能登岛
        </div>
      )}

      <div className="card relative overflow-hidden border-4 border-[#2b3a4a] p-2">
        {/* 顶栏：页指示 + 全览按钮 */}
        <div className="mb-2 flex items-center justify-between gap-2 border-b-2 border-[#fde9d0] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            <span className="text-lg font-black text-[#2b3a4a]">
              {pageLabels[safePage] ?? "地图"}
            </span>
            <span className="text-sm font-bold text-[#7a8a9a]">
              · 已点亮 {unlockedCount}/{nodes.length}
            </span>
          </div>
          <button
            onClick={() => setAtlasOpen(true)}
            className="btn btn-white h-12 px-3 text-base"
            title="查看 29 岛进化总览"
          >
            🔍 全览
          </button>
        </div>

        {/* 主体：群岛背景 + 左右箭头 */}
        <div className="relative">
          {/* 左箭头 */}
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            aria-label="上一页"
            className="absolute left-2 top-1/2 z-10 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full border-3 border-[#2b3a4a] bg-[#78d8d8] text-3xl text-white shadow-[0_4px_0_rgba(16,24,34,0.4)] transition-all hover:scale-110 active:translate-y-1 active:shadow-[0_2px_0_rgba(16,24,34,0.4)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
          >
            ◀
          </button>
          {/* 右箭头 */}
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            aria-label="下一页"
            className="absolute right-2 top-1/2 z-10 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full border-3 border-[#2b3a4a] bg-[#78d8d8] text-3xl text-white shadow-[0_4px_0_rgba(16,24,34,0.4)] transition-all hover:scale-110 active:translate-y-1 active:shadow-[0_2px_0_rgba(16,24,34,0.4)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
          >
            ▶
          </button>

          {/* 群岛背景（整页一张设计稿：1~7 群岛各自一张） */}
          <div
            className="relative h-[60vh] min-h-[480px] w-full overflow-hidden rounded-xl bg-cover bg-center"
            style={{ backgroundImage: `url(${bg})` }}
          >
            {/* 边缘柔化（让节点浮在背景上不显突兀） */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5" />

            {/* 岛屿节点：小圆圈 + 中央点 + 整体亮光 + 岛屿名；未解锁=锁 */}
            {currentPageNodes.map((n) => {
              const locked = !n.unlocked;
              return (
                <button
                  key={n.metaId}
                  onClick={() => enter(n.island)}
                  className="group absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  title={locked ? "🔒 " + n.island : n.island}
                >
                  <span
                    className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-[0_0_12px_rgba(255,225,140,0.85)] transition-transform group-hover:scale-125 ${
                      n.isCurrent
                        ? "island-node island-node-current border-[#ffb300] animate-node-pulse"
                        : locked
                          ? "island-node island-node-locked border-[#8a97a5]"
                          : "island-node island-node-unlocked border-[#2b3a4a]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        n.isCurrent
                          ? "bg-[#ffb300]"
                          : locked
                            ? "bg-[#7a8a9a]"
                            : "bg-[#2b3a4a]"
                      }`}
                    />
                    {locked && (
                      <span className="absolute -top-3 -right-3 text-base drop-shadow">🔒</span>
                    )}
                  </span>
                  <span
                    className={`mt-1 block max-w-[88px] truncate rounded bg-white/85 px-1.5 py-0.5 text-xs font-black ${
                      locked ? "text-[#7a8a9a]" : "text-[#2b3a4a]"
                    }`}
                  >
                    {locked ? "？？？" : n.island}
                  </span>
                </button>
              );
            })}

            {/* 玩家化身：站在当前岛节点上 */}
            {(() => {
              const cur =
                currentPageNodes.find((n) => n.island === initialIsland) ??
                currentPageNodes.find((n) => n.isCurrent);
              if (!cur) return null;
              return (
                <span
                  className="pointer-events-none absolute z-20 -translate-x-1/2 translate-y-7 text-2xl drop-shadow"
                  style={{ left: `${cur.x}%`, top: `${cur.y}%` }}
                >
                  {avatar}
                </span>
              );
            })()}
          </div>
        </div>

        {/* 底部页指示器 */}
        <div className="mt-2 flex items-center justify-center gap-2 py-1">
          {pageLabels.map((_label, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              aria-label={`第 ${i + 1} 页`}
              className={`h-3 rounded-full transition-all ${
                i === safePage ? "w-8 bg-[#f79228]" : "w-3 bg-[#d7dee4] hover:bg-[#9aa6b2]"
              }`}
            />
          ))}
          <span className="ml-3 text-sm font-bold text-[#7a8a9a]">
            {safePage + 1} / {totalPages}
          </span>
        </div>

        {/* 底部横滑关卡卡片（Bug 1 修复：用各岛专属封面图） */}
        <IslandQuickNav
          nodes={nodes}
          currentIsland={initialIsland}
          onPick={jumpTo}
        />
      </div>
    </div>
  );
}

/** 横滑关卡卡片：作为"分页辅助导航"，每张卡显示该岛专属封面（getIslandThumb），不与主背景混淆。 */
function IslandQuickNav({
  nodes,
  currentIsland,
  onPick,
}: {
  nodes: WorldNode[];
  currentIsland: string;
  onPick: (island: string) => void;
}) {
  // 按岛屿名排序：当前岛优先
  const sorted = useMemo(() => {
    return [...nodes].sort((a, b) => {
      if (a.island === currentIsland) return -1;
      if (b.island === currentIsland) return 1;
      return a.page - b.page || a.island.localeCompare(b.island, "zh");
    });
  }, [nodes, currentIsland]);
  return (
    <div className="mt-3 rounded-xl border-2 border-[#fde9d0] bg-[#fffdf5] p-2">
      <div className="mb-1.5 flex items-center gap-1.5 px-1">
        <span className="text-base">🗂️</span>
        <span className="text-sm font-black text-[#2b3a4a]">所有岛屿</span>
        <span className="text-xs font-bold text-[#7a8a9a]">· 左右滑动快速跳岛</span>
      </div>
      <div className="island-quicknav-scroll flex gap-2 overflow-x-auto pb-1">
        {sorted.map((n) => {
          const locked = !n.unlocked;
          const isCur = n.island === currentIsland;
          return (
            <button
              key={n.metaId}
              onClick={() => onPick(n.island)}
              className={`relative shrink-0 transition-transform hover:-translate-y-0.5 ${
                isCur ? "ring-4 ring-[#ffb300] rounded-2xl" : ""
              }`}
              title={locked ? "🔒 " + n.island : n.island}
            >
              <span
                className={`flex h-20 w-24 items-center justify-center overflow-hidden rounded-2xl border-3 bg-cover bg-center ${
                  isCur ? "border-[#ffb300]" : "border-[#2b3a4a]"
                }`}
                style={{ backgroundImage: `url(${getIslandThumb(n.island)})` }}
              >
                {locked && (
                  <>
                    <span className="fog-overlay fog-heavy" />
                    <span className="relative z-10 text-2xl drop-shadow">🔒</span>
                  </>
                )}
                {!locked && isCur && (
                  <span className="absolute -top-1 -right-1 z-10 rounded-full bg-white px-1.5 text-[10px] font-black text-[#e2582e] shadow-card">
                    我在这
                  </span>
                )}
              </span>
              <span
                className={`mt-1 block max-w-[96px] truncate text-center text-[10px] font-black ${
                  locked ? "text-[#7a8a9a]" : "text-[#2b3a4a]"
                }`}
              >
                {locked ? "？？？" : n.island}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

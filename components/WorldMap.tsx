"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import IslandBattleMap, { type MapMonster, type MapBoss } from "@/components/IslandBattleMap";
import WorldAtlas from "@/components/WorldAtlas";
import ImgSprite from "@/components/ImgSprite";
import { getIslandThumb, getWorldSea } from "@/lib/islandArt";
import { travelToIsland } from "@/lib/actions";

export type WorldNode = {
  metaId: string;
  island: string;
  x: number;
  y: number;
  depth: number;
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

/** 海面条纹背景（已弃用：现在用 113背景 图作为 L1 海图） */
const seaStyle = (a: string, b: string): React.CSSProperties => ({
  backgroundImage: `repeating-linear-gradient(180deg, ${a} 0 26px, ${b} 26px 52px)`,
});

/**
 * 地图（PR3 重构）
 *  - 5 页分页（按 DAG depth 自然切：起点 / 第1层 / 第2层 / 第3层 / 顶尖）
 *  - 顶栏：页指示器 + 全览按钮 + 进化路线按钮
 *  - 主体：黑边框包裹 + 左右 64px 大箭头 + 岛屿插画缩略图 + 雾效
 *  - 左下角 🔍 图标 → 切到 WorldAtlas
 *  - 点岛 → 聚焦进入单岛战斗（沿用 setFocused 逻辑）
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
  /** 来自 worldLayout.getWorldPages 的页标签，5 项 */
  pageLabels: string[];
}) {
  const [page, setPage] = useState(0);
  const [focused, setFocused] = useState<string | null>(null);
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [lockedHint, setLockedHint] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // 战斗退出回岛：?focus=islandName → 自动 setFocused
  useEffect(() => {
    const f = searchParams?.get("focus");
    if (f) setFocused(f);
  }, [searchParams]);

  const totalPages = pageLabels.length;
  const safePage = Math.min(page, totalPages - 1);

  /** 当前页节点（按 worldLayout 原 x/y 渲染，仅展示本 depth 范围的岛） */
  const currentPageNodes = useMemo(() => {
    if (nodes.length === 0) return [];
    // 按页切：每页约等于同 depth 的岛，页 0=depth0，页 1=depth1，页 2=depth2，页 3=depth3，页 4=depth4+5
    const depthsByPage = [0, 1, 2, 3, [4, 5]];
    const allowed = depthsByPage[safePage];
    const allow = new Set<number>(Array.isArray(allowed) ? allowed : [allowed as number]);
    return nodes.filter((n) => allow.has(n.depth));
  }, [nodes, safePage]);

  /** 当前页内部的进化边（两端都在本页） */
  const currentPageEdges = useMemo(() => {
    const inPage = new Set(currentPageNodes.map((n) => n.metaId));
    return edges.filter((e) => inPage.has(e.from) && inPage.has(e.to));
  }, [edges, currentPageNodes]);

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

  // ===== 聚焦态：放大进入单岛战斗地图 =====
  if (focused) {
    const d = islandData[focused] ?? { minions: [], guards: [], hiddenMonsters: [], bosses: [] };
    const node = nodes.find((n) => n.island === focused);
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setFocused(null)}
            className="btn btn-white px-4 py-2 text-base"
          >
            🌍 返回世界地图
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
        initialIsland={initialIsland}
        onClose={() => setAtlasOpen(false)}
      />
    );
  }

  // ===== 分页地图主视图 =====
  const unlockedCount = nodes.filter((n) => n.unlocked).length;

  function coordOf(metaId: string) {
    return currentPageNodes.find((n) => n.metaId === metaId);
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
            title="查看 29 岛总览"
          >
            🔍 全览
          </button>
        </div>

        {/* 主体：地图画布 + 左右箭头 */}
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
            className="absolute right-2 top-1/2 z-10 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full border-3 border-[#2b3a4a] bg-[#78d8d8] text-3xl text-white shadow-[0_4px_0_rgba(16,24,34,0.4)] transition-all hover:scale-110 active:translate-y-1 active:shadow-[0_2px_0_rgba(16,24,34,0.4)] disabled:cursor-not-30 disabled:hover:scale-100"
          >
            ▶
          </button>

          {/* 海面：113背景 海图（设计稿 2.5D 俯视图，对齐设计稿风） */}
          <div
            className="relative h-[60vh] min-h-[480px] w-full overflow-hidden rounded-xl bg-cover bg-center"
            style={{ backgroundImage: `url(${getWorldSea(currentPageNodes[0]?.island)})` }}
          >
            {/* 进化连线层 */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {currentPageEdges.map((e, i) => {
                const a = coordOf(e.from);
                const b = coordOf(e.to);
                if (!a || !b) return null;
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#ffffff"
                    strokeOpacity="0.6"
                    strokeWidth={2}
                    strokeDasharray="3 2"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {/* 岛屿节点（插画缩略图 + 雾效） */}
            {currentPageNodes.map((n) => {
              const locked = !n.unlocked;
              const partial =
                !locked && (islandData[n.island]?.bosses.some((b) => !b.purified) ?? false);
              const thumb = getIslandThumb(n.island);
              return (
                <button
                  key={n.metaId}
                  onClick={() => enter(n.island)}
                  className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  title={n.island}
                >
                  <span
                    className={`relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 shadow-[0_3px_0_rgba(16,24,34,0.3)] transition-transform group-hover:scale-110 ${
                      n.isCurrent
                        ? "animate-node-pulse border-[#ffb300]"
                        : locked
                          ? "border-[#9aa6b2]"
                          : "border-[#2b3a4a]"
                    }`}
                  >
                    <ImgSprite src={thumb} size={80} className="h-full w-full" />
                    {/* 动态雾效：未解锁重雾+🔒；部分解锁轻雾 */}
                    {locked && (
                      <>
                        <span className="fog-overlay fog-heavy" />
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl drop-shadow">🔒</span>
                        </span>
                      </>
                    )}
                    {partial && <span className="fog-overlay fog-light" />}
                  </span>
                  <span
                    className={`mt-1 max-w-[88px] truncate rounded bg-white/85 px-1.5 py-0.5 text-xs font-black ${
                      locked ? "text-[#7a8a9a]" : "text-[#2b3a4a]"
                    }`}
                  >
                    {locked ? "？？？" : n.island}
                  </span>
                </button>
              );
            })}

            {/* 玩家化身 */}
            {(() => {
              const cur =
                currentPageNodes.find((n) => n.island === initialIsland) ??
                currentPageNodes.find((n) => n.isCurrent);
              if (!cur) return null;
              return (
                <span
                  className="pointer-events-none absolute z-20 -translate-x-1/2 translate-y-3 text-2xl drop-shadow"
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
                i === safePage
                  ? "w-8 bg-[#f79228]"
                  : "w-3 bg-[#d7dee4a] hover:bg-[#9aa6b2]"
              }`}
            />
          ))}
          <span className="ml-3 text-sm font-bold text-[#7a8a9a]">
            {safePage + 1} / {totalPages}
          </span>
        </div>
      </div>
    </div>
  );
}
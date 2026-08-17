"use client";

import { useEffect, useMemo, useState } from "react";
import WorldAtlas from "@/components/WorldAtlas";
import { getArchipelagoBg, PAGE_COUNT } from "@/lib/archipelagoLayout";
import { travelToIsland } from "@/lib/actions";
import UiButton, { UiTag } from "@/components/UiButton";
import { getUiIcon } from "@/lib/uiIcons";

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

/**
 * 群岛（v1.2.3 纯展示版）
 *  - 7 页分页，每页独立群岛背景图
 *  - 节点：小圆圈 + 中央点 + 整体亮光 + 岛屿名（未解锁=🔒）
 *  - 主视图移除进化连线（决策③）
 *  - 点岛 → 调 onPickIsland(islandName) 回调（由 HomeClient 决定切到单岛/战斗视图）
 *  - 不再有内部 focused 状态、IslandDrawer
 */
export default function WorldMap({
  nodes,
  edges,
  avatarSrc,
  initialIsland,
  pageLabels,
  onPickIsland,
  onLocked,
}: {
  nodes: WorldNode[];
  edges: WorldEdge[];
  avatarSrc: string;
  initialIsland: string;
  pageLabels: string[];
  onPickIsland: (island: string) => void;
  onLocked?: (island: string) => void;
}) {
  const [page, setPage] = useState(0);
  const [atlasOpen, setAtlasOpen] = useState(false);

  // 默认跳到当前玩家所在群岛（按 pageOf）
  useEffect(() => {
    if (!initialIsland) return;
    const cur = nodes.find((n) => n.island === initialIsland);
    if (!cur) return;
    setPage(Math.max(0, cur.page - 1));
  }, [initialIsland, nodes]);

  const totalPages = pageLabels.length || PAGE_COUNT;
  const safePage = Math.min(page, totalPages - 1);

  const currentPageNodes = useMemo(() => {
    const want = safePage + 1;
    return nodes.filter((n) => n.page === want);
  }, [nodes, safePage]);

  const unlockedCount = nodes.filter((n) => n.unlocked).length;
  const bg = getArchipelagoBg(safePage + 1);

  async function enter(island: string) {
    const node = nodes.find((n) => n.island === island);
    if (node && !node.unlocked) {
      onLocked?.(island);
      return;
    }
    // 先落库（server action），再切视图，避免两者竞态互相覆盖
    await travelToIsland(island);
    onPickIsland(island);
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
    <div className="flex h-full flex-col">
      <div className="card relative flex h-full flex-col overflow-hidden border-4 border-[#2b3a4a] p-2">
        {/* 顶栏：页指示 + 全览按钮 */}
        <div className="mb-2 flex items-center justify-between gap-2 border-b-2 border-[#fde9d0] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            <span className="text-xl font-black text-[#2b3a4a]">
              {pageLabels[safePage] ?? "地图"}
            </span>
            <span className="text-base font-bold text-[#7a8a9a]">
              · 已点亮 {unlockedCount}/{nodes.length}
            </span>
          </div>
          <UiButton
            onClick={() => setAtlasOpen(true)}
            size="medium"
            height="lg"
            icon="atlas"
            iconClassName="h-7 w-7"
            className="text-lg"
            title="查看 29 岛进化总览"
          >
            全览
          </UiButton>
        </div>

        {/* 主体：群岛背景 + 左右箭头（flex 居中固定比例地图，避免高列下留出空隙） */}
        <div className="relative flex flex-1 items-center justify-center">
          {/* 左箭头 */}
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            aria-label="上一页"
            className="absolute left-2 top-1/2 z-10 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full border-3 border-[#2b3a4a] bg-white/90 p-2 shadow-[0_4px_0_rgba(16,24,34,0.4)] transition-all hover:scale-110 active:translate-y-1 active:shadow-[0_2px_0_rgba(16,24,34,0.4)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
          >
            <img src={getUiIcon("arrowLeft")} alt="上一页" className="h-full w-full object-contain" />
          </button>
          {/* 右箭头 */}
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            aria-label="下一页"
            className="absolute right-2 top-1/2 z-10 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full border-3 border-[#2b3a4a] bg-white/90 p-2 shadow-[0_4px_0_rgba(16,24,34,0.4)] transition-all hover:scale-110 active:translate-y-1 active:shadow-[0_2px_0_rgba(16,24,34,0.4)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
          >
            <img src={getUiIcon("arrowRight")} alt="下一页" className="h-full w-full object-contain" />
          </button>

          {/* 群岛背景：固定 16:9 宽高比，保证 bg-cover 裁切在「默认 / AI最小化」两种列宽下完全一致
              → 岛屿按钮（x/y% 叠加）相对背景不错位；min-h 兜底防止极端窄列下过小 */}
          <div
            className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-cover bg-center"
            style={{ backgroundImage: `url(${bg})`, minHeight: "300px" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5" />

            {/* 岛屿节点 */}
            {currentPageNodes.map((n) => {
              const locked = !n.unlocked;
              return (
                <button
                  key={n.metaId}
                  onClick={() => enter(n.island)}
                  className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
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
                  <UiTag size="auto" locked={locked} className="mt-1 text-base">
                    {locked ? "？？？" : n.island}
                  </UiTag>
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
                <img
                  src={avatarSrc}
                  alt="我的探险家"
                  className="pointer-events-none absolute z-20 h-10 w-10 -translate-x-1/2 translate-y-6 rounded-full border-2 border-[#2b3a4a] bg-white object-cover drop-shadow"
                  style={{ left: `${cur.x}%`, top: `${cur.y}%` }}
                />
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
      </div>
    </div>
  );
}

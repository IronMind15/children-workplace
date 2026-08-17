"use client";

import { useRouter } from "next/navigation";
import ImgSprite from "@/components/ImgSprite";
import { getIslandThumb } from "@/lib/islandArt";
import { travelToIsland } from "@/lib/actions";
import type { WorldNode } from "./WorldMap";

/**
 * 全览缩略图（PR3 · 地图第三模式）
 * - 一屏塞 29 座岛（按 worldLayout 原坐标缩小到 ~36px）
 * - 当前岛橙色脉冲；已解锁彩色；未解锁灰雾+🔒
 * - 点岛 → 跳回分页地图 + 自动聚焦该岛
 * - 顶栏一个 ✕ 关闭按钮
 */
export default function WorldAtlas({
  nodes,
  initialIsland,
  onClose,
  onJumpToIsland,
}: {
  nodes: WorldNode[];
  initialIsland: string;
  onClose: () => void;
  onJumpToIsland?: (island: string) => void;
}) {
  const router = useRouter();

  function pick(island: string) {
    travelToIsland(island);
    if (onJumpToIsland) onJumpToIsland(island);
    onClose();
    // 触发 page.tsx re-render：直接刷新即可（force-dynamic 页面）
    router.refresh();
  }

  return (
    <div className="card relative h-[70vh] min-h-[520px] overflow-hidden p-3">
      {/* 顶部条：标题 + 关闭 */}
      <div className="mb-2 flex items-center justify-between gap-2 border-b-2 border-[#fde9d0] pb-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🗺️</span>
          <span className="text-xl font-black text-[#2b3a4a]">全岛总览 · 29 座</span>
        </div>
        <button
          onClick={onClose}
          className="btn btn-white h-10 px-3 text-base"
          aria-label="关闭全览"
        >
          ✕ 返回分页
        </button>
      </div>

      {/* 海面底色 */}
      <div className="relative h-[calc(100%-56px)] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[#90d8d8] via-[#78d8d8] to-[#6cc8c8]">
        {/* 跨页连接线（淡淡虚线） */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* 简化：所有 28 个节点画一遍虚线 */}
          {nodes.map((n) =>
            nodes
              .filter((m) => m.metaId === n.metaId)
              .map((_m, _i) => null)
          )}
          {nodes
            .flatMap((n) =>
              nodes
                .filter((m) => Math.abs(m.x - n.x) < 30 && Math.abs(m.y - n.y) < 30 && m !== n)
                .map((m) => ({ from: n, to: m }))
            )
            .slice(0, 80)
            .map((e, i) => (
              <line
                key={i}
                x1={e.from.x}
                y1={e.from.y}
                x2={e.to.x}
                y2={e.to.y}
                stroke="#ffffff"
                strokeOpacity="0.25"
                strokeWidth={0.8}
                strokeDasharray="2 2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
        </svg>

        {/* 迷你岛屿 */}
        {nodes.map((n) => {
          const locked = !n.unlocked;
          return (
            <button
              key={n.metaId}
              onClick={() => pick(n.island)}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              title={locked ? "🔒 " + n.island : n.island}
            >
              <span
                className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border-2 shadow-[0_2px_0_rgba(16,24,34,0.25)] transition-transform group-hover:scale-125 ${
                  n.isCurrent
                    ? "animate-node-pulse border-[#ffb300] ring-4 ring-[#ffd54f]"
                    : locked
                      ? "border-[#9aa6b2]"
                      : "border-[#2b3a4a]"
                }`}
              >
                <ImgSprite src={getIslandThumb(n.island)} size={36} className="h-full w-full" />
                {locked && (
                  <span className="absolute inset-0 flex items-center justify-center bg-white/55 text-xs backdrop-blur-[1px]">
                    🔒
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* 底部图例 */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between rounded-xl bg-white/80 px-3 py-1.5 text-sm font-bold text-[#2b3a4a] backdrop-blur">
        <span>当前：<span className="text-[#f79228]">{initialIsland}</span></span>
        <span className="text-xs text-[#7a8a9a]">点岛 = 跳回该页</span>
      </div>
    </div>
  );
}
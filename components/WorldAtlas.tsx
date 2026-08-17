"use client";

import { useRouter } from "next/navigation";
import ImgSprite from "@/components/ImgSprite";
import { getIslandThumb, getWorldSea } from "@/lib/islandArt";
import { travelToIsland } from "@/lib/actions";
import type { WorldNode } from "./WorldMap";

/**
 * 全览缩略图（PR4 重制）
 * - 底图：113背景 海图（设计稿 2.5D 俯视海面），整图作为统一海图氛围
 * - 岛屿节点：按原有 x/y 坐标定位在底图上，72px 大节点 + 当前岛脉冲
 * - 进化连线：白色虚线 + 半透明（同 L1 风格）
 * - 顶部 X 返回分页
 */
export default function WorldAtlas({
  nodes,
  initialIsland,
  onClose,
}: {
  nodes: WorldNode[];
  initialIsland: string;
  onClose: () => void;
}) {
  const router = useRouter();

  function pick(island: string) {
    travelToIsland(island);
    onClose();
    router.refresh();
  }

  const unlockedCount = nodes.filter((n) => n.unlocked).length;
  const sea = getWorldSea(initialIsland);

  return (
    <div className="card relative overflow-hidden border-4 border-[#2b3a4a] p-2">
      {/* 顶部条 */}
      <div className="mb-2 flex items-center justify-between gap-2 border-b-2 border-[#fde9d0] pb-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🗺️</span>
          <span className="font-story text-xl font-black text-[#2b3a4a]">全岛总览</span>
          <span className="text-sm font-bold text-[#7a8a9a]">
            · 29 座 · 已点亮 {unlockedCount}
          </span>
        </div>
        <button onClick={onClose} className="btn btn-white h-12 px-4 text-base">
          ✕ 返回分页
        </button>
      </div>

      {/* 海图底图（设计稿） */}
      <div
        className="relative h-[70vh] min-h-[520px] w-full overflow-hidden rounded-2xl bg-cover bg-center"
        style={{ backgroundImage: `url(${sea})` }}
      >
        {/* 边缘柔化 */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />

        {/* 进化连线（所有节点） */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {nodes.flatMap((n) =>
            nodes
              .filter((m) => Math.abs(m.x - n.x) < 30 && Math.abs(m.y - n.y) < 30 && m !== n)
              .slice(0, 4)
              .map((m, j) => (
                <line
                  key={`${n.metaId}-${m.metaId}-${j}`}
                  x1={n.x}
                  y1={n.y}
                  x2={m.x}
                  y2={m.y}
                  stroke="#ffffff"
                  strokeOpacity="0.45"
                  strokeWidth={1.4}
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              ))
          )}
        </svg>

        {/* 岛屿节点（72px） */}
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
                className={`relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl border-[3px] shadow-[0_3px_0_rgba(16,24,34,0.35)] transition-transform group-hover:scale-125 ${
                  n.isCurrent
                    ? "animate-node-pulse border-[#ffb300] ring-4 ring-[#ffd54f]"
                    : locked
                      ? "border-[#9aa6b2]"
                      : "border-[#2b3a4a]"
                }`}
              >
                <ImgSprite src={getIslandThumb(n.island)} size={72} className="h-full w-full" />
                {locked && (
                  <>
                    <span className="fog-overlay fog-heavy" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl drop-shadow">🔒</span>
                    </span>
                  </>
                )}
              </span>
              <span
                className={`mt-1 block max-w-[88px] truncate rounded bg-white/85 px-1.5 py-0.5 text-[11px] font-black ${
                  locked ? "text-[#7a8a9a]" : "text-[#2b3a4a]"
                }`}
              >
                {locked ? "？？？" : n.island}
              </span>
            </button>
          );
        })}
      </div>

      {/* 底部图例 */}
      <div className="mt-2 flex items-center justify-between rounded-xl bg-white/80 px-3 py-1.5 text-sm font-bold text-[#2b3a4a]">
        <span>
          当前：<span className="text-[#f79228]">{initialIsland}</span>
        </span>
        <span className="text-xs text-[#7a8a9a]">点岛 = 跳回该岛</span>
      </div>
    </div>
  );
}
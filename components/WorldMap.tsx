"use client";

import { useState } from "react";
import IslandBattleMap, { type MapMonster, type MapBoss } from "@/components/IslandBattleMap";
import ImgSprite from "@/components/ImgSprite";
import { getIslandThumb } from "@/lib/islandArt";
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

/** 海面条纹背景样式（统一青绿海域，对齐设计稿，不按单岛主题） */
const seaStyle = (a: string, b: string): React.CSSProperties => ({
  backgroundImage: `repeating-linear-gradient(180deg, ${a} 0 26px, ${b} 26px 52px)`,
});

/**
 * 大世界地图：
 *  - 整张海图，28 座岛按进化谱系定位（父岛在下、子岛在上），白虚线是本领进化路线。
 *  - 点击任意岛 → 放大聚焦进入该岛的像素战斗地图（IslandBattleMap）。
 *  - 已解锁岛彩色、未解锁岛灰暗带 🔒、当前所在岛脉冲高亮。
 */
export default function WorldMap({
  nodes,
  edges,
  islandData,
  avatar,
  initialIsland,
}: {
  nodes: WorldNode[];
  edges: WorldEdge[];
  islandData: Record<string, IslandBattleData>;
  avatar: string;
  initialIsland: string;
}) {
  const [focused, setFocused] = useState<string | null>(null);
  const [lockedHint, setLockedHint] = useState<string | null>(null);
  const coordOf = (metaId: string) => nodes.find((n) => n.metaId === metaId);

  function enter(island: string) {
    const node = nodes.find((n) => n.island === island);
    // 未点亮的岛（上游 Boss 未净化）不可进入，避免卡关
    if (node && !node.unlocked) {
      setLockedHint(island);
      return;
    }
    setLockedHint(null);
    setFocused(island);
    // 同步服务端 current_island（净化/解锁逻辑依赖它），server action 自带 revalidate
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
            className="btn btn-white px-3 py-1.5 text-sm shadow-md"
          >
            🌍 返回世界地图
          </button>
          {!node?.unlocked && (
            <span className="rounded-md border-2 border-[#8a97a5] bg-[#e8edf2] px-2 py-1 text-xs font-bold text-[#7a8a9a]">
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

  // ===== 世界海图 =====
  const unlockedCount = nodes.filter((n) => n.unlocked).length;
  return (
    <div>
      {lockedHint && (
        <div className="mb-2 flex items-center gap-2 rounded-md border-2 border-[#8a97a5] bg-[#e8edf2] px-3 py-1.5 text-sm font-bold text-[#7a8a9a]">
          🔒 {lockedHint} 还在迷雾中，先净化上游 Boss 才能登岛
        </div>
      )}
      <div className="card relative overflow-hidden p-2">
      <div
        className="relative h-[60vh] min-h-[480px] w-full overflow-hidden rounded-md"
        style={seaStyle("#90d8d8", "#78d8d8")}
      >
        {/* 进化连线层 */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {edges.map((e, i) => {
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

        {/* 岛屿节点：112初版 插画缩略图 + 运行时雾效（未解锁重雾🔒 / 部分解锁轻雾 / 已解锁清晰） */}
        {nodes.map((n) => {
          const locked = !n.unlocked;
          const partial = !locked && (islandData[n.island]?.bosses.some((b) => !b.purified) ?? false);
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
                className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 shadow-[0_3px_0_rgba(16,24,34,0.3)] transition-transform group-hover:scale-110 ${
                  n.isCurrent
                    ? "animate-node-pulse border-[#ffb300]"
                    : locked
                      ? "border-[#9aa6b2]"
                      : "border-[#2b3a4a]"
                }`}
              >
                <ImgSprite src={thumb} size={64} className="h-full w-full" />
                {/* 雾效叠层 */}
                {locked && (
                  <span className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
                    <span className="text-lg">🔒</span>
                  </span>
                )}
                {partial && <span className="absolute inset-0 bg-white/30" />}
              </span>
              <span
                className={`mt-0.5 max-w-[72px] truncate rounded bg-white/80 px-1 text-[10px] font-black ${
                  locked ? "text-[#7a8a9a]" : "text-[#2b3a4a]"
                }`}
              >
                {locked ? "？？？" : n.island}
              </span>
            </button>
          );
        })}

        {/* 玩家化身：站在当前所在岛 */}
        {(() => {
          const cur = nodes.find((n) => n.island === initialIsland) ?? nodes.find((n) => n.isCurrent);
          if (!cur) return null;
          return (
            <span
              className="pointer-events-none absolute z-20 -translate-x-1/2 translate-y-3 text-xl drop-shadow"
              style={{ left: `${cur.x}%`, top: `${cur.y}%` }}
            >
              {avatar}
            </span>
          );
        })()}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-between px-3 py-2 text-sm font-bold text-[#2b3a4a]">
        <span>🗺️ 知识世界地图 · 已点亮 {unlockedCount}/{nodes.length} 座岛</span>
        <span className="hidden text-xs font-semibold text-[#7a8a9a] lg:block">
          点一座岛放大进入，白虚线是本领进化路线
        </span>
      </div>
      </div>
    </div>
  );
}

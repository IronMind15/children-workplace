"use client";

import { useState } from "react";
import IslandBattleMap, { type MapMonster, type MapBoss } from "@/components/IslandBattleMap";
import { themeOf } from "@/lib/islandTheme";
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
  hiddenMonsters: MapMonster[];
  bosses: MapBoss[];
};

/** 海面条纹背景样式（统一海域，不按单岛主题） */
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
  const coordOf = (metaId: string) => nodes.find((n) => n.metaId === metaId);

  function enter(island: string) {
    setFocused(island);
    // 同步服务端 current_island（净化/解锁逻辑依赖它），server action 自带 revalidate
    travelToIsland(island);
  }

  // ===== 聚焦态：放大进入单岛战斗地图 =====
  if (focused) {
    const d = islandData[focused] ?? { minions: [], hiddenMonsters: [], bosses: [] };
    const node = nodes.find((n) => n.island === focused);
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setFocused(null)}
            className="pixel-btn pixel-btn-white px-3 py-1.5 text-sm shadow-md"
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
          hiddenMonsters={d.hiddenMonsters}
          bosses={d.bosses}
          avatar={avatar}
        />
      </div>
    );
  }

  // ===== 世界海图 =====
  const unlockedCount = nodes.filter((n) => n.unlocked).length;
  return (
    <div className="pixel-panel relative overflow-hidden p-2">
      <div
        className="relative h-[60vh] min-h-[480px] w-full overflow-hidden rounded-md"
        style={seaStyle("#bfe9ff", "#a9dcff")}
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

        {/* 岛屿节点 */}
        {nodes.map((n) => {
          const theme = themeOf(n.island);
          const emoji = theme.accents[0]?.emoji ?? "🏝️";
          const locked = !n.unlocked;
          return (
            <button
              key={n.metaId}
              onClick={() => enter(n.island)}
              className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              title={n.island}
            >
              <span
                className={`relative flex h-14 w-14 items-center justify-center rounded-full border-4 text-2xl shadow-[0_3px_0_rgba(16,24,34,0.3)] transition-transform group-hover:scale-110 ${
                  n.isCurrent
                    ? "animate-node-pulse border-[#ffb300] bg-[#fff8e1]"
                    : locked
                      ? "border-[#9aa6b2] bg-[#d7dee4] grayscale"
                      : "border-[#2b3a4a] bg-white"
                }`}
              >
                {emoji}
                {locked && <span className="absolute -right-1 -top-1 text-xs">🔒</span>}
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
  );
}

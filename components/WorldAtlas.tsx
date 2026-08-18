"use client";

import { useRouter } from "next/navigation";
import ImgSprite from "@/components/ImgSprite";
import { getIslandThumb } from "@/lib/islandArt";
import { getArchipelagoBg, pageOf } from "@/lib/archipelagoLayout";
import { travelToIsland } from "@/lib/actions";
import UiButton, { UiTag } from "@/components/UiButton";
import type { WorldNode } from "./WorldMap";

export type WorldEdgeLike = { from: string; to: string };

/**
 * 全览缩略图（决策③：仅画两端都已解锁的边）
 *  - 底图：用节点所在群岛的独立背景图（让 29 岛各归所属群岛氛围）
 *  - 岛屿节点：72px 大节点 + 当前岛脉冲
 *  - 进化连线：按真实 `edges` 画（不再用坐标距离近似）；仅当两端都已解锁时显示
 *  - 顶部 X 返回分页
 */
export default function WorldAtlas({
  nodes,
  edges = [],
  initialIsland,
  onClose,
}: {
  nodes: WorldNode[];
  /** 真实进化边（来自 getEvolutionEdges）；缺省=不画连线 */
  edges?: WorldEdgeLike[];
  initialIsland: string;
  onClose: () => void;
}) {
  const router = useRouter();

  function pick(island: string) {
    // 全览点岛 = 跳回该岛（更新当前岛标记）；失败不阻断返回
    travelToIsland(island).catch((e) => console.error("travelToIsland 失败（全览）:", e));
    onClose();
    router.refresh();
  }

  const unlockedCount = nodes.filter((n) => n.unlocked).length;
  const nodeById = new Map(nodes.map((n) => [n.metaId, n]));

  // 按 7 群岛分组，便于按群岛渲染小背景（替代之前单一海图）
  const byPage = new Map<number, WorldNode[]>();
  for (const n of nodes) {
    const p = pageOf(n.metaId);
    if (!byPage.has(p)) byPage.set(p, []);
    byPage.get(p)!.push(n);
  }

  return (
    <div className="card relative overflow-hidden border-4 border-[#2b3a4a] p-2">
      {/* 顶部条 */}
      <div className="mb-2 flex items-center justify-between gap-2 border-b-2 border-[#fde9d0] pb-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🗺️</span>
          <span className="font-story text-xl font-black text-[#2b3a4a]">全岛总览</span>
          <span className="text-sm font-bold text-[#7a8a9a]">
            · 29 座 · 7 群岛 · 已点亮 {unlockedCount}
          </span>
        </div>
        <UiButton onClick={onClose} icon="arrowLeft" size="medium">
          返回分页
        </UiButton>
      </div>

      {/* 7 群岛分块（每群岛独立背景 + 该群岛节点） */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from(byPage.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([page, group]) => {
            const islandInPage = group.find((n) => n.island === initialIsland) ?? group.find((n) => n.isCurrent);
            return (
              <AtlasArchipelago
                key={page}
                page={page}
                group={group}
                edges={edges}
                nodeById={nodeById}
                initialIsland={islandInPage?.island ?? initialIsland}
                onPick={pick}
              />
            );
          })}
      </div>

      {/* 底部图例 */}
      <div className="mt-2 flex items-center justify-between rounded-xl bg-white/80 px-3 py-1.5 text-sm font-bold text-[#2b3a4a]">
        <span>
          当前：<span className="text-[#f79228]">{initialIsland}</span>
        </span>
        <span className="text-xs text-[#7a8a9a]">
          点岛 = 跳回该岛；连线 = 真实进化边（两端解锁才显示）
        </span>
      </div>
    </div>
  );
}

/** 单个群岛的缩略：群岛背景 + 该群岛节点 + 该群岛内已解锁的进化边 */
function AtlasArchipelago({
  page,
  group,
  edges,
  nodeById,
  initialIsland,
  onPick,
}: {
  page: number;
  group: WorldNode[];
  edges: WorldEdgeLike[];
  nodeById: Map<string, WorldNode>;
  initialIsland: string;
  onPick: (island: string) => void;
}) {
  const bg = getArchipelagoBg(page);
  const labels: Record<number, string> = {
    1: "数与运算 · 整数基础",
    2: "数与运算 · 数的扩充",
    3: "图形几何 · 平面",
    4: "图形几何 · 立体变换",
    5: "统计与概率",
    6: "关系 + 代数",
    7: "量测 + 数学广角",
  };
  return (
    <div className="rounded-2xl border-3 border-[#2b3a4a] bg-white p-1.5 shadow-card">
      <div className="mb-1.5 flex items-center justify-between px-1.5">
        <span className="text-base font-black text-[#2b3a4a]">
          🏝️ 群岛 {page} · {labels[page] ?? ""}
        </span>
        <span className="text-xs font-bold text-[#7a8a9a]">
          {group.filter((n) => n.unlocked).length}/{group.length} 已点亮
        </span>
      </div>
      <div
        className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-cover bg-center"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />

        {/* 该群岛内的进化边：仅画两端都已解锁的边（决策③） */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {edges.map((e, i) => {
            const a = nodeById.get(e.from);
            const b = nodeById.get(e.to);
            if (!a || !b) return null;
            if (a.page !== page || b.page !== page) return null;
            if (!a.unlocked || !b.unlocked) return null; // 决策③：未解锁边不画
            return (
              <line
                key={`${e.from}-${e.to}-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#ffffff"
                strokeOpacity="0.6"
                strokeWidth={1.4}
                strokeDasharray="3 2"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {/* 节点 */}
        {group.map((n) => {
          const locked = !n.unlocked;
          return (
            <button
              key={n.metaId}
              onClick={() => onPick(n.island)}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              title={locked ? "🔒 " + n.island : `${n.island} · 深度 ${n.depth}`}
            >
              <span
                className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-[0_0_8px_rgba(255,225,140,0.7)] transition-transform group-hover:scale-125 ${
                  n.island === initialIsland
                    ? "animate-node-pulse border-[#ffb300]"
                    : locked
                      ? "border-[#9aa6b2]"
                      : "border-[#2b3a4a]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    n.island === initialIsland ? "bg-[#ffb300]" : locked ? "bg-[#7a8a9a]" : "bg-[#2b3a4a]"
                  }`}
                />
                {locked && (
                  <span className="absolute -top-2 -right-2 text-xs drop-shadow">🔒</span>
                )}
              </span>
              <UiTag size="auto" locked={locked} className="mt-1 text-sm">
                {locked ? "？？？" : n.island}
              </UiTag>
            </button>
          );
        })}
      </div>
    </div>
  );
}

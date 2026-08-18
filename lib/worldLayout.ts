import { getMetas, getEvolutionEdges } from "./repo";
import { ISLAND_PAGE_MAP, PAGE_META, pageOf, pageOfIsland, getArchipelagoBg, PAGE_COUNT, ARCHIPELAGO_COORDS } from "./archipelagoLayout";
// 重新导出 archipelagoLayout 里的所有符号，保持外部调用方不变
export { ISLAND_PAGE_MAP, PAGE_META, pageOf, pageOfIsland, getArchipelagoBg, PAGE_COUNT, ARCHIPELAGO_COORDS };

export type WorldCoord = { x: number; y: number; depth: number };

/**
 * 按进化谱系给 29 座岛算世界坐标（纯数据 / 算法，与渲染解耦）：
 *  - 父岛在下、子岛在上（depth 越大越靠上）
 *  - 同层横向均分
 *  - 连线由渲染层按 from/to 的 (x,y) 绘制，呼应「谁的本领进化出谁」
 *
 * 注意：群岛分页（按知识主题 7 群岛）由 archipelagoLayout 的 ISLAND_PAGE_MAP 决定。
 * depth 仅供全览(WorldAtlas)展示「进化层级」用。
 *
 * ⚠️ 本模块依赖 ./repo（含 node:sqlite），仅 server / 异步服务端使用；
 *    client 组件请改用 ./archipelagoLayout（纯数据）。
 */
export function getWorldLayout(): Record<string, WorldCoord> {
  const metas = getMetas();
  const edges = getEvolutionEdges();

  const parentsOf: Record<string, string[]> = {};
  const childrenOf: Record<string, string[]> = {};
  for (const e of edges) {
    (parentsOf[e.to_meta] ??= []).push(e.from_meta);
    (childrenOf[e.from_meta] ??= []).push(e.to_meta);
  }

  const ids = metas.map((m) => m.id);
  const depth: Record<string, number> = {};

  function calcDepth(id: string, stack: Set<string>): number {
    if (id in depth) return depth[id];
    if (stack.has(id)) return 0; // 防环兜底
    const ps = parentsOf[id] ?? [];
    if (ps.length === 0) {
      depth[id] = 0;
      return 0;
    }
    stack.add(id);
    const d = 1 + Math.max(...ps.map((p) => calcDepth(p, stack)));
    stack.delete(id);
    depth[id] = d;
    return d;
  }
  for (const id of ids) calcDepth(id, new Set());

  const maxDepth = Math.max(1, ...Object.values(depth));
  const byDepth: Record<number, string[]> = {};
  for (const id of ids) (byDepth[depth[id]] ??= []).push(id);

  const coord: Record<string, WorldCoord> = {};
  for (let d = 0; d <= maxDepth; d++) {
    const row = byDepth[d] ?? [];
    row.forEach((id, i) => {
      // 优先使用按群岛背景图标定的坐标；缺失时退回到 depth 算法兜底
      const arch = ARCHIPELAGO_COORDS[id];
      const x = arch?.x ?? (row.length <= 1 ? 50 : 8 + (i * 84) / (row.length - 1));
      const y = arch?.y ?? 86 - d * (74 / maxDepth);
      coord[id] = { x, y, depth: d };
    });
  }
  return coord;
}

export type WorldPage = { pageIndex: number; label: string; domain: string; count: number; ids: string[] };

/**
 * 按 ISLAND_PAGE_MAP 归页：
 *  - 7 页固定，每页用 PAGE_META.label / .count
 *  - 顺序：1..7
 */
export function getWorldPages(_coord: Record<string, WorldCoord>): WorldPage[] {
  const byPage: Record<number, string[]> = {};
  for (const [id, p] of Object.entries(ISLAND_PAGE_MAP)) {
    (byPage[p] ??= []).push(id);
  }
  const pages: WorldPage[] = [];
  for (let p = 1; p <= PAGE_COUNT; p++) {
    const meta = PAGE_META[p];
    const ids = (byPage[p] ?? []).slice();
    ids.sort((a, b) => {
      const na = Number(a.replace(/^MK-/, "")) || 0;
      const nb = Number(b.replace(/^MK-/, "")) || 0;
      return na - nb;
    });
    pages.push({
      pageIndex: p,
      label: meta.label,
      domain: meta.domain,
      count: meta.count,
      ids,
    });
  }
  return pages;
}

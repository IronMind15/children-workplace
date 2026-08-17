import { getMetas, getEvolutionEdges } from "./repo";

export type WorldCoord = { x: number; y: number; depth: number };

/**
 * 按进化谱系给 29 座岛算世界坐标（纯数据 / 算法，与渲染解耦）：
 *  - 父岛在下、子岛在上（depth 越大越靠上）
 *  - 同层横向均分
 *  - 连线由渲染层按 from/to 的 (x,y) 绘制，呼应「谁的本领进化出谁」
 *
 * 注意：群岛分页（按知识主题 7 群岛）由 ISLAND_PAGE_MAP 决定，不依赖 depth。
 * depth 仅供全览(WorldAtlas)展示「进化层级」用。
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
      const x = row.length <= 1 ? 50 : 8 + (i * 84) / (row.length - 1);
      const y = 86 - d * (74 / maxDepth);
      coord[id] = { x, y, depth: d };
    });
  }
  return coord;
}

/* ============================================================
 * 7 群岛分页（按知识主题，2026-08-18 拍板）
 *  - 取代按 depth 切 5 页的分法
 *  - 5+5+4+4+4+4+3 = 29，与 29 个 MK 完全吻合
 *  - 7 群岛的页面 ID = 1~7（1-based）
 *  - getWorldLayout() 仍按 depth 算坐标；分页只看 ISLAND_PAGE_MAP
 * ============================================================ */

export const PAGE_COUNT = 7;

/** 显式「MK id → 群岛页(1~7)」映射表（见 docs/08180008-群岛ui说明.md §四） */
export const ISLAND_PAGE_MAP: Record<string, number> = {
  // 1 数与运算 · 整数运算基础（5 岛）
  "MK-01": 1, "MK-02": 1, "MK-03": 1, "MK-04": 1, "MK-05": 1,
  // 2 数与运算 · 数的扩充（5 岛）
  "MK-06": 2, "MK-08": 2, "MK-09": 2, "MK-10": 2, "MK-37": 2,
  // 3 图形与几何 · 平面图形（4 岛）
  "MK-15": 3, "MK-16": 3, "MK-17": 3, "MK-18": 3,
  // 4 图形与几何 · 立体与变换（4 岛；★MK-07 从数与运算调入，与面积/分割关联）
  "MK-19": 4, "MK-20": 4, "MK-21": 4, "MK-07": 4,
  // 5 统计与概率（4 岛）
  "MK-24": 5, "MK-25": 5, "MK-26": 5, "MK-27": 5,
  // 6 数的关系 + 代数初步（4 岛）
  "MK-11": 6, "MK-12": 6, "MK-13": 6, "MK-14": 6,
  // 7 量与测量 + 数学广角（3 岛）
  "MK-22": 7, "MK-23": 7, "MK-28": 7,
};

export const PAGE_META: Record<number, { label: string; domain: string; count: number }> = {
  1: { label: "数与运算 · 整数运算基础", domain: "数与运算", count: 5 },
  2: { label: "数与运算 · 数的扩充",     domain: "数与运算", count: 5 },
  3: { label: "图形与几何 · 平面图形",   domain: "图形与几何", count: 4 },
  4: { label: "图形与几何 · 立体与变换", domain: "图形与几何", count: 4 },
  5: { label: "统计与概率",              domain: "统计与概率", count: 4 },
  6: { label: "数的关系 + 代数初步",      domain: "关系+代数",  count: 4 },
  7: { label: "量与测量 + 数学广角",      domain: "量测+广角",  count: 3 },
};

/** 取一个 MK 所在的群岛页（1~7），未登记的退回 1 */
export function pageOf(metaId: string): number {
  return ISLAND_PAGE_MAP[metaId] ?? 1;
}

/** 群岛背景图（public/archipelagos/arch_01~07.webp）；用户指定：1=1-1, 2=4-(2), 3=7-1, 4=3-1, 5=5-1, 6=6-1, 7=2-1 */
export function getArchipelagoBg(page: number): string {
  const idx = Math.max(1, Math.min(PAGE_COUNT, page));
  return `/archipelagos/arch_${String(idx).padStart(2, "0")}.webp`;
}

export type WorldPage = { pageIndex: number; label: string; domain: string; count: number; ids: string[] };

/**
 * 按 ISLAND_PAGE_MAP 归页（取代按 depth 推导）：
 *  - 7 页固定，每页用 PAGE_META.label / .count
 *  - 顺序：按 ISLAND_PAGE_MAP 中定义的固定页号输出
 */
export function getWorldPages(_coord: Record<string, WorldCoord>): WorldPage[] {
  // 先按 ISLAND_PAGE_MAP 归类
  const byPage: Record<number, string[]> = {};
  for (const [id, p] of Object.entries(ISLAND_PAGE_MAP)) {
    (byPage[p] ??= []).push(id);
  }
  // 顺序：1..7
  const pages: WorldPage[] = [];
  for (let p = 1; p <= PAGE_COUNT; p++) {
    const meta = PAGE_META[p];
    const ids = (byPage[p] ?? []).slice();
    // 让顺序稳定：按 id 数字序（MK-01..MK-37 → CAST(SUBSTR(id,4) AS INTEGER)）
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

/**
 * 群岛纯数据层（无 DB 依赖，安全被 client 组件直接 import）
 *  - ISLAND_PAGE_MAP：MK id → 群岛页(1~7) 显式映射
 *  - PAGE_META：每页的标签 / 领域 / 数量
 *  - pageOf(metaId) / getArchipelagoBg(page) / PAGE_COUNT
 *
 * 注意：本文件不得 import 任何含 node:fs / node:sqlite 的模块（会被 client bundle 拉爆）。
 * lib/worldLayout.ts 的 getWorldLayout() / getWorldPages() 才允许 import repo。
 */

export const PAGE_COUNT = 7;

/** 显式「MK id → 群岛页(1~7)」映射表（见 docs/08180008-群岛ui说明.md §四） */
export const ISLAND_PAGE_MAP: Record<string, number> = {
  // 1 数与运算 · 整数运算基础（5 岛）
  "MK-01": 1, "MK-02": 1, "MK-03": 1, "MK-04": 1, "MK-05": 1,
  // 2 数与运算 · 数的扩充（5 岛）
  "MK-06": 2, "MK-08": 2, "MK-09": 2, "MK-10": 2, "MK-37": 2,
  // 3 图形与几何 · 平面图形（4 岛）
  "MK-15": 3, "MK-16": 3, "MK-17": 3, "MK-18": 3,
  // 4 图形与几何 · 立体与变换（4 岛；★MK-07 从数与运算调入）
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

/**
 * 群岛背景图（public/archipelagos/arch_01~07.webp）
 * 用户指定映射：1=1-1, 2=4-(2), 3=7-1, 4=3-1, 5=5-1, 6=6-1, 7=2-1
 */
export function getArchipelagoBg(page: number): string {
  const idx = Math.max(1, Math.min(PAGE_COUNT, page));
  return `/archipelagos/arch_${String(idx).padStart(2, "0")}.webp`;
}

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

export type ArchipelagoCoord = { x: number; y: number };

/**
 * 群岛分页内坐标（按 arch_01~07.webp 实际岛屿位置标定）
 * - 百分比对应当前页 16:9 容器
 * - 取代旧的 depth 算法布局，避免标记漂在海上
 */
export const ARCHIPELAGO_COORDS: Record<string, ArchipelagoCoord> = {
  // 1 · 数与运算 · 整数运算基础
  "MK-01": { x: 18, y: 28 }, "MK-02": { x: 50, y: 18 }, "MK-03": { x: 20, y: 75 },
  "MK-04": { x: 82, y: 75 }, "MK-05": { x: 82, y: 24 },

  // 2 · 数与运算 · 数的扩充
  "MK-06": { x: 18, y: 28 }, "MK-37": { x: 50, y: 18 }, "MK-08": { x: 82, y: 24 },
  "MK-09": { x: 20, y: 72 }, "MK-10": { x: 82, y: 72 },

  // 3 · 图形与几何 · 平面图形
  "MK-15": { x: 28, y: 22 }, "MK-16": { x: 75, y: 24 },
  "MK-17": { x: 28, y: 72 }, "MK-18": { x: 75, y: 72 },

  // 4 · 图形与几何 · 立体与变换（体积岛放在最大的左下岛，其余三岛按视觉中心微调）
  "MK-19": { x: 24, y: 74 }, "MK-20": { x: 54, y: 22 },
  "MK-21": { x: 20, y: 28 }, "MK-07": { x: 82, y: 70 },

  // 5 · 统计与概率（MK-26 居中下方营火岛，MK-27 居中右下遗迹岛）
  "MK-24": { x: 20, y: 26 }, "MK-25": { x: 72, y: 26 },
  "MK-26": { x: 44, y: 78 }, "MK-27": { x: 86, y: 72 },

  // 6 · 数的关系 + 代数初步
  "MK-11": { x: 18, y: 22 }, "MK-12": { x: 30, y: 55 },
  "MK-13": { x: 78, y: 25 }, "MK-14": { x: 82, y: 72 },

  // 7 · 量与测量 + 数学广角（MK-28 居中最大的下方主岛）
  "MK-22": { x: 20, y: 26 }, "MK-23": { x: 80, y: 24 }, "MK-28": { x: 40, y: 72 },
};

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
 * 「岛名（如 加法岛）→ 群岛页(1~7)」映射
 * 由 meta_cognition 的 name + ISLAND_PAGE_MAP 静态生成（2026-08-18 v1.2.11）
 * 用于战斗背景选图等「已知岛名、未知 MK id」的场景。
 */
export const ISLAND_NAME_PAGE_MAP: Record<string, number> = {
  // 1 数与运算 · 整数运算基础（5 岛）
  "计数岛": 1, "位值岛": 1, "加法岛": 1, "减法岛": 1, "乘法岛": 1,
  // 2 数与运算 · 数的扩充（5 岛）
  "除法岛": 2, "小数岛": 2, "百分数岛": 2, "负数岛": 2, "因数倍数岛": 2,
  // 3 图形与几何 · 平面图形（4 岛）
  "图形认识岛": 3, "角岛": 3, "周长岛": 3, "面积岛": 3,
  // 4 图形与几何 · 立体与变换（4 岛）
  "体积岛": 4, "图形运动岛": 4, "位置与方向岛": 4, "分数岛": 4,
  // 5 统计与概率（4 岛）
  "分类整理岛": 5, "统计图岛": 5, "平均数岛": 5, "可能性岛": 5,
  // 6 数的关系 + 代数初步（4 岛）
  "比岛": 6, "比例岛": 6, "字母表示数岛": 6, "方程岛": 6,
  // 7 量与测量 + 数学广角（3 岛）
  "单位换算岛": 7, "时间岛": 7, "集合岛": 7,
};

/** 按岛名取群岛页（1~7），未登记退回 1 */
export function pageOfIsland(islandName: string): number {
  return ISLAND_NAME_PAGE_MAP[islandName] ?? 1;
}

/**
 * 群岛背景图（public/archipelagos/arch_01~07.webp）
 * 用户指定映射：1=1-1, 2=4-(2), 3=7-1, 4=3-1, 5=5-1, 6=6-1, 7=2-1
 */
export function getArchipelagoBg(page: number): string {
  const idx = Math.max(1, Math.min(PAGE_COUNT, page));
  return `/archipelagos/arch_${String(idx).padStart(2, "0")}.webp`;
}

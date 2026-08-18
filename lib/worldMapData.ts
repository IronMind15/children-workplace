/**
 * 统一数学世界地图数据（client-safe，无 Node 依赖）
 * - 底图：public/world/world_map.webp（3840×2400，16:10）
 * - 坐标：百分比（0~100），基于 docs/数学世界地图.png 视觉岛屿位置标定
 * - 29 座岛按 7 大知识领域分组分布在中央城堡四周
 */

export const WORLD_MAP_SRC = "/world/world_map.webp";

export type UnifiedCoord = { x: number; y: number };

/** MK id → 统一世界地图百分比坐标（按 world_map.webp 实际岛屿独立标定；与群岛坐标系无关） */
export const UNIFIED_MAP_COORDS: Record<string, UnifiedCoord> = {
  // 1 · 数与运算 · 整数运算基础（左上）
  "MK-01": { x: 8, y: 12 },   // 计数岛
  "MK-02": { x: 22, y: 12 },  // 位值岛
  "MK-03": { x: 14, y: 24 },  // 加法岛
  "MK-04": { x: 24, y: 22 },  // 减法岛
  "MK-05": { x: 36, y: 10 },  // 乘法岛

  // 2 · 数与运算 · 数的扩充（中下链）
  "MK-06": { x: 40, y: 72 },  // 除法岛
  "MK-37": { x: 48, y: 76 },  // 因数倍数岛
  "MK-08": { x: 52, y: 74 },  // 小数岛
  "MK-09": { x: 58, y: 80 },  // 百分数岛
  "MK-10": { x: 62, y: 74 },  // 负数岛

  // 3 · 图形与几何 · 平面图形（左中）
  "MK-15": { x: 8, y: 42 },   // 图形认识岛
  "MK-16": { x: 15, y: 46 },  // 角岛
  "MK-17": { x: 8, y: 56 },   // 周长岛
  "MK-18": { x: 18, y: 58 },  // 面积岛

  // 4 · 图形与几何 · 立体与变换（右中）
  "MK-19": { x: 78, y: 54 },  // 体积岛
  "MK-20": { x: 86, y: 48 },  // 图形运动岛
  "MK-21": { x: 75, y: 62 },  // 位置与方向岛
  "MK-07": { x: 88, y: 58 },  // 分数岛

  // 5 · 统计与概率（右上）
  "MK-24": { x: 85, y: 12 },  // 分类整理岛
  "MK-25": { x: 79, y: 20 },  // 统计图岛
  "MK-26": { x: 91, y: 16 },  // 平均数岛
  "MK-27": { x: 83, y: 28 },  // 可能性岛

  // 6 · 数的关系 + 代数初步（左下）
  "MK-11": { x: 18, y: 74 },  // 比岛
  "MK-12": { x: 24, y: 82 },  // 比例岛
  "MK-13": { x: 10, y: 80 },  // 字母表示数岛
  "MK-14": { x: 28, y: 78 },  // 方程岛

  // 7 · 量与测量 + 数学广角（右下 / 中央城堡）
  "MK-22": { x: 65, y: 84 },  // 单位换算岛
  "MK-23": { x: 70, y: 76 },  // 时间岛
  "MK-28": { x: 50, y: 50 },  // 集合岛（中央城堡）
};

/** 取某 MK id 在统一地图上的坐标；未命中时居中 */
export function getUnifiedCoord(metaId: string): UnifiedCoord {
  return UNIFIED_MAP_COORDS[metaId] ?? { x: 50, y: 50 };
}

// ===== 终章 · 邪恶岛（最终大 Boss 老巢） =====
// 大地图中心偏上、悬浮于中央城堡（MK-28 集合岛）之上的一座暗影岛。
// 点击进入「最终决战」新区域（?finalboss=1），展示后期要推广的新型交互打怪方式。
// 仅大地图（WorldMap）渲染，不进入群岛分页。
export const EVIL_ISLAND_META_ID = "EVIL-ISLAND";
export const EVIL_ISLAND_NAME = "暗影终焉岛";
/** 新岛在大地图上的百分比坐标（中央城堡正上方，避免重叠） */
export const EVIL_ISLAND_COORD: UnifiedCoord = { x: 50, y: 38 };
// 占位提示：后续可设为「需净化全部 28 个 Boss 后才解锁」，当前恒解锁以便预览。
export const EVIL_ISLAND_LOCKED_UNTIL_ALL_BOSSES = false;

// 把邪恶岛坐标并入统一坐标表，使 WorldMap 的 getUnifiedCoord 能直接命中
UNIFIED_MAP_COORDS[EVIL_ISLAND_META_ID] = EVIL_ISLAND_COORD;

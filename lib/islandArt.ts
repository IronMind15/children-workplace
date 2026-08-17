// 岛屿美术资源映射层（设计稿 → 游戏岛屿）
//
// 设计稿只提供了 19 张岛屿插画（112初版）+ 19 张背景（113背景），而游戏有 29 座岛。
// 按用户确认：一张图可代表多个岛，样式不够先循环使用。
// 因此默认按「岛屿名哈希」循环分配 19 张图；thumb[i] 与 bg[i] 配对（同一序号 = 同一座岛的 L1/L2）。
//
// 后续若要精确对应（页面 → 岛屿），只在 ISLAND_ART 填表，不动任何渲染逻辑。

const ISLAND_THUMBS: string[] = [
  "/islands/island_01.webp",
  "/islands/island_02.webp",
  "/islands/island_03.webp",
  "/islands/island_04.webp",
  "/islands/island_05.webp",
  "/islands/island_06.webp",
  "/islands/island_07.webp",
  "/islands/island_08.webp",
  "/islands/island_09.webp",
  "/islands/island_10.webp",
  "/islands/island_11.webp",
  "/islands/island_12.webp",
  "/islands/island_13.webp",
  "/islands/island_14.webp",
  "/islands/island_15.webp",
  "/islands/island_16.webp",
  "/islands/island_17.webp",
  "/islands/island_18.webp",
  "/islands/island_19.webp",
];

const ISLAND_BGS: string[] = [
  "/bg/bg_01.webp",
  "/bg/bg_02.webp",
  "/bg/bg_03.webp",
  "/bg/bg_04.webp",
  "/bg/bg_05.webp",
  "/bg/bg_06.webp",
  "/bg/bg_07.webp",
  "/bg/bg_08.webp",
  "/bg/bg_09.webp",
  "/bg/bg_10.webp",
  "/bg/bg_11.webp",
  "/bg/bg_12.webp",
  "/bg/bg_13.webp",
  "/bg/bg_14.webp",
  "/bg/bg_15.webp",
  "/bg/bg_16.webp",
  "/bg/bg_17.webp",
  "/bg/bg_18.webp",
  "/bg/bg_19.webp",
];

/** 单岛场景背景（v1.2.16 替换为 19 张 2.5D 顶视图插画） */
const ISLAND_BATTLE_BGS: string[] = [
  "/islands/battle_bg_01.png",
  "/islands/battle_bg_02.png",
  "/islands/battle_bg_03.png",
  "/islands/battle_bg_04.png",
  "/islands/battle_bg_05.png",
  "/islands/battle_bg_06.png",
  "/islands/battle_bg_07.png",
  "/islands/battle_bg_08.png",
  "/islands/battle_bg_09.png",
  "/islands/battle_bg_10.png",
  "/islands/battle_bg_11.png",
  "/islands/battle_bg_12.png",
  "/islands/battle_bg_13.png",
  "/islands/battle_bg_14.png",
  "/islands/battle_bg_15.png",
  "/islands/battle_bg_16.png",
  "/islands/battle_bg_17.png",
  "/islands/battle_bg_18.png",
  "/islands/battle_bg_19.png",
];

/** 29 座岛按 MK 编号顺序排列；19 张背景按此顺序循环分配 */
const ISLAND_ORDER: string[] = [
  "计数岛", "位值岛", "加法岛", "减法岛", "乘法岛",
  "除法岛", "分数岛", "小数岛", "百分数岛", "负数岛",
  "比岛", "比例岛", "字母表示数岛", "方程岛",
  "图形认识岛", "角岛", "周长岛", "面积岛", "体积岛",
  "图形运动岛", "位置与方向岛",
  "单位换算岛", "时间岛",
  "分类整理岛", "统计图岛", "平均数岛", "可能性岛", "集合岛",
  "因数倍数岛",
];

const COUNT = ISLAND_THUMBS.length;

// 游戏岛屿名 → 精确资源（配对）。留空即走默认循环。
// 例："计数岛": { thumb: "/islands/island_01.webp", bg: "/bg/bg_01.webp" }
export const ISLAND_ART: Record<string, { thumb: string; bg: string }> = {};

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

/** L1 世界地图缩略图（112初版 岛屿插画） */
export function getIslandThumb(island: string): string {
  const exact = ISLAND_ART[island];
  if (exact) return exact.thumb;
  return ISLAND_THUMBS[hashStr(island) % COUNT];
}

/** L2 岛屿详情背景（113背景 2.5D 俯视底图）
 *  2026-08-18 v1.2.16：改为按 29 岛 MK 顺序循环分配 19 张新背景图，
 *  便于一一对应、复用与后期替换。 */
export function getIslandBg(island: string): string {
  const exact = ISLAND_ART[island];
  if (exact) return exact.bg;
  const idx = ISLAND_ORDER.indexOf(island);
  if (idx >= 0) return ISLAND_BATTLE_BGS[idx % ISLAND_BATTLE_BGS.length];
  return ISLAND_BATTLE_BGS[hashStr(island) % ISLAND_BATTLE_BGS.length];
}

/**
 * L1 世界地图海图背景（统一一张，按岛屿当前页主色取对应 bg）。
 * 113背景 本身就是 2.5D 海面俯视图，与 L1 海图需求一致；用岛屿所在页第一张岛的 bg 图作为整页海图氛围。
 */
export function getWorldSea(islandHint?: string): string {
  if (islandHint) {
    const exact = ISLAND_ART[islandHint];
    if (exact) return exact.bg;
    const idx = hashStr(islandHint) % COUNT;
    return ISLAND_BGS[idx];
  }
  return ISLAND_BGS[0];
}

// 注：原 fogOverlay()（L3 战斗舞台雾效层）已移除——其引用的关键帧名 `fog-drift`
// 与 globals.css 中实际定义的 `fogDrift` 不一致导致动画失效，且全程未被调用。
// 若后续需要战斗雾效，应在组件内用 CSS class（.fog-drift 已在 globals.css 定义）实现。

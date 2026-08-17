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

/** L2 岛屿详情背景（113背景 2.5D 俯视底图） */
export function getIslandBg(island: string): string {
  const exact = ISLAND_ART[island];
  if (exact) return exact.bg;
  return ISLAND_BGS[hashStr(island) % COUNT];
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

/**
 * L3 战斗舞台雾效层（用同张 bg 图做半透明叠层 + 多层径向渐变模拟"云雾遮挡小岛"）。
 * 返回一组 CSS 背景样式：动态云雾（CSS keyframes 多层径向渐变飘动）。
 */
export function fogOverlay(): React.CSSProperties {
  return {
    backgroundImage: [
      // 三层径向雾团（柔白）
      "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)",
      "radial-gradient(ellipse 70% 50% at 80% 70%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)",
      "radial-gradient(ellipse 90% 70% at 50% 90%, rgba(220,235,245,0.5) 0%, rgba(220,235,245,0) 70%)",
    ].join(", "),
    animation: "fog-drift 22s ease-in-out infinite",
  };
}

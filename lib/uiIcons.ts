/**
 * UI 图标资源映射（v1.2.12）
 * 统一维护 @image#1~#10 的图标路径，避免组件里硬编码文件名。
 */

export const UI_ICONS = {
  mistakeBook: "/ui/mistake_book.png",      // #1 错题集
  spirit: "/ui/spirit.png",                 // #2 精灵
  atlas: "/ui/atlas.png",                   // #3 地图全览
  dex: "/ui/dex.png",                       // #4 图鉴
  arrowLeft: "/ui/arrow_left.png",          // #5 左键
  arrowRight: "/ui/arrow_right.png",        // #6 右键
  knowledgeHome: "/ui/knowledge_home.png",  // #10 知识家园
  parent: "/ui/parent.png",                 // 家长端
  profile: "/ui/profile.png",               // 我的资料
  tutorial: "/ui/tutorial.png",             // 新手引导
  feynman: "/ui/feynman.png",               // 费曼小课堂
  zoomIn: "/ui/zoom_in.png",                // 大地图放大
  zoomOut: "/ui/zoom_out.png",              // 大地图缩小
} as const;

export const BUTTON_BGS = {
  short: "/ui/btn_short.png",   // #7 适合 2 字以内
  medium: "/ui/btn_medium.png", // #8 适合 3~4 字
  long: "/ui/btn_long.png",     // #9 适合 5 字以上
} as const;

export type UiIconKey = keyof typeof UI_ICONS;
export type ButtonBgKey = keyof typeof BUTTON_BGS;

/** 取 UI 图标路径 */
export function getUiIcon(key: UiIconKey): string {
  return UI_ICONS[key];
}

/** 按文字长度智能选按键背景图。
 * 为了儿童看清且文字完整覆盖在图案内，短文本也适当放宽：
 * 1 字 → short，2~3 字 → medium，4 字及以上 → long。 */
export function getButtonBgByText(text: string): string {
  const len = Array.from(text).length;
  if (len <= 1) return BUTTON_BGS.short;
  if (len <= 3) return BUTTON_BGS.medium;
  return BUTTON_BGS.long;
}

/** 取指定按键背景图 */
export function getButtonBg(key: ButtonBgKey): string {
  return BUTTON_BGS[key];
}

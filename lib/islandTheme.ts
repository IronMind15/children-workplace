// 岛屿主题（地图配色 + 装饰 + 诗意标签）：
// 6 座经典岛有手工精修主题；其余 22 座岛按「知识领域」取主题，保证 28 座岛各有风格。

export type DecorSpec = { kind: "tree" | "bush" | "rock" | "flower"; x: number; y: number; size?: number };
export type AccentSpec = { emoji: string; x: number; y: number; size?: number };

export type IslandTheme = {
  label: string;
  sea: [string, string];
  grass: [string, string];
  path: [string, string];
  pathBorder: string;
  beach: string;
  decors: DecorSpec[];
  accents: AccentSpec[];
};

/** 元认知名 → 领域（用于无手绘主题的岛找兜底主题） */
export const META_DOMAIN: Record<string, string> = {
  计数: "数与运算", 位值: "数与运算", 加法: "数与运算", 减法: "数与运算", 乘法: "数与运算",
  除法: "数与运算", 分数: "数与运算", 小数: "数与运算", 百分数: "数与运算", 负数: "数与运算",
  比: "数的关系", 比例: "数的关系",
  字母表示数: "代数初步", 方程: "代数初步",
  图形认识: "图形与几何", 角: "图形与几何", 周长: "图形与几何", 面积: "图形与几何",
  体积: "图形与几何", 图形运动: "图形与几何", 位置与方向: "图形与几何",
  单位换算: "量与测量", 时间: "量与测量",
  分类整理: "统计与概率", 统计图: "统计与概率", 平均数: "统计与概率", 可能性: "统计与概率",
  集合: "数学广角",
};

/** 28 座岛的诗意标签 */
export const ISLAND_LABELS: Record<string, string> = {
  集合岛: "圈圈群岛",
  计数岛: "翠绿草原",
  位值岛: "水晶洞穴",
  加法岛: "苹果果园",
  减法岛: "金沙落日",
  乘法岛: "星光花园",
  除法岛: "分分乐泉",
  分数岛: "切切蛋糕湾",
  小数岛: "角分小镇",
  百分数岛: "满分火山",
  负数岛: "极寒冰原",
  比岛: "天平谷",
  比例岛: "箭靶丘陵",
  字母表示数岛: "符号谜林",
  方程岛: "天平秘境",
  图形认识岛: "积木半岛",
  角岛: "尖尖岬",
  周长岛: "围栏牧场",
  面积岛: "方块田野",
  体积岛: "立方峡谷",
  图形运动岛: "旋转游乐园",
  位置与方向岛: "罗盘海角",
  单位换算岛: "度量集市",
  时间岛: "钟表镇",
  分类整理岛: "收纳湾",
  统计图岛: "图表港",
  平均数岛: "平衡湿地",
  可能性岛: "骰子沙滩",
};

// ---- 5 座经典岛：手工精修主题 ----
const CLASSIC_THEMES: Record<string, IslandTheme> = {
  计数岛: {
    label: "翠绿草原",
    sea: ["#8ed6f0", "#7ec4e0"],
    grass: ["#8fd14f", "#7fbf3f"],
    path: ["#e8c170", "#d9ad55"],
    pathBorder: "#c9a458",
    beach: "#f7e6c4",
    decors: [
      { kind: "tree", x: 4, y: 10, size: 88 },
      { kind: "tree", x: 84, y: 8, size: 80 },
      { kind: "tree", x: 90, y: 66, size: 72 },
      { kind: "bush", x: 22, y: 78, size: 64 },
      { kind: "bush", x: 62, y: 12, size: 56 },
      { kind: "rock", x: 40, y: 82, size: 56 },
      { kind: "flower", x: 14, y: 46, size: 40 },
      { kind: "flower", x: 72, y: 44, size: 40 },
      { kind: "flower", x: 33, y: 18, size: 36 },
    ],
    accents: [
      { emoji: "🌼", x: 50, y: 30 },
      { emoji: "🌼", x: 78, y: 70 },
      { emoji: "🦋", x: 26, y: 60 },
    ],
  },
  位值岛: {
    label: "水晶洞穴",
    sea: ["#7fb3e8", "#6ba3dc"],
    grass: ["#a3e0e8", "#8fd0da"],
    path: ["#b8c4d9", "#a5b3cc"],
    pathBorder: "#7d8ba8",
    beach: "#dbe9f7",
    decors: [
      { kind: "rock", x: 6, y: 12, size: 76 },
      { kind: "rock", x: 86, y: 14, size: 84 },
      { kind: "rock", x: 44, y: 8, size: 64 },
      { kind: "bush", x: 18, y: 76, size: 56 },
      { kind: "bush", x: 74, y: 70, size: 60 },
      { kind: "flower", x: 34, y: 50, size: 40 },
      { kind: "flower", x: 64, y: 42, size: 38 },
    ],
    accents: [
      { emoji: "💎", x: 12, y: 40 },
      { emoji: "💎", x: 56, y: 68 },
      { emoji: "🔟", x: 84, y: 52 },
      { emoji: "✨", x: 28, y: 26 },
    ],
  },
  加法岛: {
    label: "苹果果园",
    sea: ["#7fd4c9", "#6bc0b5"],
    grass: ["#a8de70", "#98cf5e"],
    path: ["#d9a05f", "#c98f4e"],
    pathBorder: "#a8743a",
    beach: "#ffe0b2",
    decors: [
      { kind: "tree", x: 6, y: 8, size: 92 },
      { kind: "tree", x: 48, y: 6, size: 76 },
      { kind: "tree", x: 88, y: 12, size: 84 },
      { kind: "bush", x: 16, y: 72, size: 60 },
      { kind: "bush", x: 70, y: 78, size: 64 },
      { kind: "rock", x: 52, y: 80, size: 52 },
      { kind: "flower", x: 30, y: 40, size: 40 },
      { kind: "flower", x: 80, y: 48, size: 38 },
    ],
    accents: [
      { emoji: "🍎", x: 12, y: 42 },
      { emoji: "🍎", x: 62, y: 32 },
      { emoji: "🍎", x: 40, y: 62 },
      { emoji: "🐝", x: 84, y: 66 },
    ],
  },
  减法岛: {
    label: "金沙落日",
    sea: ["#f4a259", "#e88f42"],
    grass: ["#ecc86e", "#e0b955"],
    path: ["#c99a4e", "#b98a3e"],
    pathBorder: "#96702e",
    beach: "#f5deb3",
    decors: [
      { kind: "rock", x: 4, y: 12, size: 72 },
      { kind: "rock", x: 88, y: 10, size: 80 },
      { kind: "rock", x: 78, y: 74, size: 64 },
      { kind: "rock", x: 30, y: 84, size: 56 },
      { kind: "bush", x: 50, y: 8, size: 52 },
      { kind: "bush", x: 14, y: 76, size: 56 },
    ],
    accents: [
      { emoji: "🌵", x: 20, y: 34 },
      { emoji: "🌵", x: 66, y: 58 },
      { emoji: "🦴", x: 44, y: 44 },
      { emoji: "🌞", x: 2, y: 2, size: 28 },
    ],
  },
  乘法岛: {
    label: "星光花园",
    sea: ["#a99bd9", "#9789cc"],
    grass: ["#f2b8d0", "#e8a5c2"],
    path: ["#d9a0c0", "#c98fb2"],
    pathBorder: "#a8738f",
    beach: "#ffd6e8",
    decors: [
      { kind: "tree", x: 8, y: 10, size: 84 },
      { kind: "tree", x: 86, y: 8, size: 78 },
      { kind: "flower", x: 20, y: 70, size: 44 },
      { kind: "flower", x: 34, y: 44, size: 40 },
      { kind: "flower", x: 52, y: 68, size: 42 },
      { kind: "flower", x: 70, y: 42, size: 40 },
      { kind: "flower", x: 82, y: 76, size: 38 },
      { kind: "bush", x: 44, y: 10, size: 56 },
    ],
    accents: [
      { emoji: "🌸", x: 12, y: 48 },
      { emoji: "🌸", x: 62, y: 26 },
      { emoji: "⭐", x: 88, y: 40 },
      { emoji: "🪄", x: 28, y: 22 },
    ],
  },
  集合岛: {
    label: "圈圈群岛",
    sea: ["#8fd0e8", "#7cc0dc"],
    grass: ["#c9b6e8", "#b8a3dd"],
    path: ["#b8a0c8", "#a78fb8"],
    pathBorder: "#8a7198",
    beach: "#efe6fa",
    decors: [
      { kind: "tree", x: 8, y: 10, size: 80 },
      { kind: "bush", x: 84, y: 14, size: 58 },
      { kind: "bush", x: 22, y: 76, size: 54 },
      { kind: "rock", x: 58, y: 80, size: 52 },
      { kind: "flower", x: 36, y: 44, size: 38 },
      { kind: "flower", x: 72, y: 50, size: 36 },
    ],
    accents: [
      { emoji: "🔵", x: 22, y: 38 },
      { emoji: "🔴", x: 40, y: 38 },
      { emoji: "🌀", x: 34, y: 50 },
      { emoji: "✨", x: 64, y: 30 },
    ],
  },
};

// ---- 领域兜底主题（六大领域各有风格，未手绘的岛按领域取用） ----
const DOMAIN_THEMES: Record<string, IslandTheme> = {
  数与运算: {
    label: "运算群岛",
    sea: ["#7fd0e8", "#6bbdd6"],
    grass: ["#b3e0a0", "#a2d18c"],
    path: ["#e0c58a", "#d0b276"],
    pathBorder: "#b3945c",
    beach: "#f7ecd0",
    decors: [
      { kind: "tree", x: 8, y: 10, size: 84 },
      { kind: "tree", x: 88, y: 14, size: 76 },
      { kind: "bush", x: 20, y: 74, size: 58 },
      { kind: "bush", x: 68, y: 70, size: 56 },
      { kind: "rock", x: 46, y: 82, size: 52 },
      { kind: "flower", x: 30, y: 44, size: 38 },
      { kind: "flower", x: 76, y: 46, size: 36 },
    ],
    accents: [
      { emoji: "➕", x: 14, y: 40 },
      { emoji: "🔢", x: 60, y: 32 },
      { emoji: "✨", x: 40, y: 62 },
    ],
  },
  "数的关系": {
    label: "关系海峡",
    sea: ["#9db8e8", "#8aa8dd"],
    grass: ["#c5cbe8", "#b4bce0"],
    path: ["#aab4d0", "#98a3c2"],
    pathBorder: "#7d88a8",
    beach: "#e3e9f7",
    decors: [
      { kind: "rock", x: 6, y: 12, size: 72 },
      { kind: "rock", x: 84, y: 12, size: 78 },
      { kind: "rock", x: 48, y: 80, size: 56 },
      { kind: "bush", x: 26, y: 72, size: 54 },
      { kind: "flower", x: 36, y: 44, size: 38 },
    ],
    accents: [
      { emoji: "⚖️", x: 16, y: 42 },
      { emoji: "🎯", x: 66, y: 36 },
      { emoji: "✨", x: 44, y: 60 },
    ],
  },
  代数初步: {
    label: "符号谜海",
    sea: ["#b39dd9", "#a18bcc"],
    grass: ["#d7c9ec", "#c9b8e4"],
    path: ["#b8a5d4", "#a795c6"],
    pathBorder: "#8471a8",
    beach: "#efe6fa",
    decors: [
      { kind: "tree", x: 10, y: 8, size: 80 },
      { kind: "bush", x: 80, y: 12, size: 58 },
      { kind: "bush", x: 22, y: 76, size: 54 },
      { kind: "rock", x: 58, y: 80, size: 52 },
      { kind: "flower", x: 40, y: 42, size: 38 },
      { kind: "flower", x: 72, y: 50, size: 36 },
    ],
    accents: [
      { emoji: "🔤", x: 14, y: 38 },
      { emoji: "🧩", x: 62, y: 30 },
      { emoji: "❓", x: 42, y: 58 },
    ],
  },
  图形与几何: {
    label: "几何列岛",
    sea: ["#7fc4e8", "#6db2dc"],
    grass: ["#a8d8e8", "#96ccdf"],
    path: ["#c0c8d8", "#adb6cc"],
    pathBorder: "#8892ab",
    beach: "#e0f0f7",
    decors: [
      { kind: "rock", x: 8, y: 12, size: 74 },
      { kind: "rock", x: 86, y: 10, size: 80 },
      { kind: "rock", x: 70, y: 76, size: 60 },
      { kind: "bush", x: 30, y: 78, size: 54 },
      { kind: "flower", x: 34, y: 40, size: 38 },
      { kind: "flower", x: 62, y: 48, size: 36 },
    ],
    accents: [
      { emoji: "🔷", x: 16, y: 40 },
      { emoji: "📐", x: 64, y: 34 },
      { emoji: "📏", x: 44, y: 60 },
    ],
  },
  量与测量: {
    label: "度量洋流",
    sea: ["#7ed9c0", "#6cc8b0"],
    grass: ["#b8e8c8", "#a6dcb8"],
    path: ["#e0d08a", "#d0c076"],
    pathBorder: "#b3a45c",
    beach: "#f7f0d0",
    decors: [
      { kind: "tree", x: 6, y: 10, size: 82 },
      { kind: "tree", x: 88, y: 12, size: 74 },
      { kind: "bush", x: 24, y: 74, size: 56 },
      { kind: "rock", x: 56, y: 80, size: 52 },
      { kind: "flower", x: 38, y: 44, size: 38 },
    ],
    accents: [
      { emoji: "⏰", x: 16, y: 38 },
      { emoji: "📏", x: 62, y: 32 },
      { emoji: "⚖️", x: 42, y: 58 },
    ],
  },
  统计与概率: {
    label: "统计群岛",
    sea: ["#f2a0c8", "#e88cb8"],
    grass: ["#f7c8dd", "#f0b5cf"],
    path: ["#d8a8c0", "#c898b2"],
    pathBorder: "#a87893",
    beach: "#ffe6f0",
    decors: [
      { kind: "bush", x: 10, y: 12, size: 58 },
      { kind: "bush", x: 82, y: 14, size: 56 },
      { kind: "rock", x: 46, y: 80, size: 52 },
      { kind: "flower", x: 28, y: 42, size: 38 },
      { kind: "flower", x: 66, y: 48, size: 36 },
      { kind: "flower", x: 50, y: 20, size: 36 },
    ],
    accents: [
      { emoji: "📊", x: 16, y: 38 },
      { emoji: "🎲", x: 64, y: 32 },
      { emoji: "🗂️", x: 42, y: 58 },
    ],
  },
  数学广角: {
    label: "彩蛋海域",
    sea: ["#9dd9e8", "#8ac8dc"],
    grass: ["#c9e8f0", "#b8dce8"],
    path: ["#a8c8d8", "#98b8cc"],
    pathBorder: "#7898ab",
    beach: "#e6f5fa",
    decors: [
      { kind: "rock", x: 8, y: 12, size: 70 },
      { kind: "bush", x: 84, y: 14, size: 56 },
      { kind: "flower", x: 40, y: 44, size: 38 },
    ],
    accents: [
      { emoji: "🌀", x: 18, y: 40 },
      { emoji: "✨", x: 60, y: 34 },
    ],
  },
};

/** 取岛屿主题：先查经典手绘主题，再按知识领域兜底 */
export function themeOf(islandName: string): IslandTheme {
  const classic = CLASSIC_THEMES[islandName];
  if (classic) return classic;
  const metaName = islandName.replace(/岛$/, "");
  const domain = META_DOMAIN[metaName] ?? "数学广角";
  return DOMAIN_THEMES[domain];
}

/** 岛屿诗意标签（图鉴等处展示） */
export function islandLabel(islandName: string): string {
  return ISLAND_LABELS[islandName] ?? themeOf(islandName).label;
}

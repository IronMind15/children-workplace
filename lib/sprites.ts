// 怪物 / 精灵 / 伙伴 资源映射层（设计稿 WebP/PNG 插画风，替代原像素字符画）
//
// 设计原则：
// - 所有图片路径走「软连接」函数，不 hardcode 具体文件名，方便后期整体替换。
// - 怪物按 id 哈希循环复用 6 套外观；精灵按「群岛页 × 进化形态」命名规则取图。

import { pageOf } from "./archipelagoLayout";

// ============ 怪物图片（循环复用） ============

/** 6 张小怪（cute chubby demon），按 id 哈希循环复用 */
const MINION_IMAGES = [
  "/monsters/cute_1.webp",
  "/monsters/cute_2.webp",
  "/monsters/cute_3.webp",
  "/monsters/cute_4.webp",
  "/monsters/cute_5.webp",
  "/monsters/cute_6.webp",
];

/** 6 张渡海 Boss（massive imposing demon），按 id 哈希循环复用 */
const BOSS_IMAGES = [
  "/monsters/boss_1.webp",
  "/monsters/boss_2.webp",
  "/monsters/boss_3.webp",
  "/monsters/boss_4.webp",
  "/monsters/boss_5.webp",
  "/monsters/boss_6.webp",
];

/** 6 套知识守卫外观（v1.2.6，docs/115保卫小兵 转 webp），守卫战用 */
const GUARD_IMAGES = [
  "/guards/guard_01.webp",
  "/guards/guard_02.webp",
  "/guards/guard_03.webp",
  "/guards/guard_04.webp",
  "/guards/guard_05.webp",
  "/guards/guard_06.webp",
];

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

/** 怪物 WebP 资源路径：小怪/神秘小怪循环 6 张 cute 图，Boss 循环 6 张 boss 图，守卫用 6 套守卫外观图 */
export function getMonsterImage(monsterId: string): string {
  const h = hashStr(monsterId);
  if (monsterId.startsWith("boss-")) return BOSS_IMAGES[h % BOSS_IMAGES.length];
  if (monsterId.startsWith("guard-")) {
    // 守卫：6 套外观循环（按 id 哈希定基，进入守卫战也能对应上图）
    return GUARD_IMAGES[h % GUARD_IMAGES.length];
  }
  return MINION_IMAGES[h % MINION_IMAGES.length];
}

// ============ 精灵进化阶段（熟练度等级 → 形态） ============
export type SpiritStage = { title: string; aura: boolean; crown: boolean; size: number };

/**
 * 精灵形态配置表（数据驱动，满足「可设定等级 → 对应形象」需求）。
 * 调整/扩展形态只需改这张表，渲染逻辑无需变动：
 * - minLevel：达到该熟练度等级即进入此形态（取满足 minLevel ≤ level 的最高档）
 * - stage：对应插画形态（1-4，与 public/spirits/page_X_stage_Y.png 命名对齐）
 * - title/aura/crown/size：展示用元数据（形态名、光环、皇冠、尺寸）
 */
export type SpiritForm = {
  minLevel: number;
  stage: number;
  title: string;
  aura: boolean;
  crown: boolean;
  size: number;
};

export const SPIRIT_FORMS: SpiritForm[] = [
  { minLevel: 1, stage: 1, title: "宝宝体", aura: false, crown: false, size: 64 },
  { minLevel: 2, stage: 2, title: "成长体", aura: true, crown: false, size: 76 },
  { minLevel: 3, stage: 4, title: "完全体", aura: true, crown: true, size: 88 },
];

/** 按熟练度等级取当前形态配置（取满足 minLevel ≤ level 的最高档） */
export function getSpiritStage(level: number): SpiritStage {
  let result = SPIRIT_FORMS[0];
  for (const f of SPIRIT_FORMS) {
    if (level >= f.minLevel) result = f;
  }
  return { title: result.title, aura: result.aura, crown: result.crown, size: result.size };
}

// ============ 新插画风精灵：7 群岛 × 4 进化形态（软连接，不硬编码具体文件名） ============

export const SPIRIT_PAGE_COUNT = 7;
export const SPIRIT_STAGE_COUNT = 4;

function clampPage(page: number): number {
  return Math.max(1, Math.min(SPIRIT_PAGE_COUNT, page));
}

function clampStage(stage: number): number {
  return Math.max(1, Math.min(SPIRIT_STAGE_COUNT, stage));
}

/** 等级 → 进化形态 stage（1-4），供图片路径解析 */
function levelToStage(level: number): number {
  let result = SPIRIT_FORMS[0];
  for (const f of SPIRIT_FORMS) {
    if (level >= f.minLevel) result = f;
  }
  return result.stage;
}

/**
 * 精灵图软连接：只约定「page(1-7) × stage(1-4)」的命名规则，
 * 不 hardcode 文件名。后续替换素材、改格式、改目录时，只需改本函数。
 */
export function resolveSpiritPath(page: number, stage: number): string {
  return `/spirits/page_${clampPage(page)}_stage_${clampStage(stage)}.png`;
}

/**
 * 完整精灵图：按 metaId 所在群岛 + 熟练度等级取对应进化形态。
 * 用于战斗、详情弹窗、进化动画等需要展示成长差异的场景。
 */
export function getSpiritImage(metaId: string, level = 1): string {
  return resolveSpiritPath(pageOf(metaId), levelToStage(level));
}

/**
 * 缩略/列表精灵图：按精灵「实际熟练度等级」取对应进化形态，与详情图保持一致（修复预览恒为形态1）。
 * 未传 level（如未解锁占位）默认 stage 1 宝宝体。密集场景仍走同一软连接路径，浏览器缓存友好。
 */
export function getSimpleSpiritImage(metaId: string, level = 1): string {
  return resolveSpiritPath(pageOf(metaId), levelToStage(level));
}

/** 伙伴狐狸（Boss 战陪伴孩子的精灵）：固定用第 1 群岛的成长体 */
export function getCompanionImage(): string {
  return resolveSpiritPath(1, 2);
}

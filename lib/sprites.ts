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

/** Lv.1 宝宝体 → Lv.2 成长体（光环）→ Lv.3+ 完全体（皇冠） */
export function getSpiritStage(level: number): SpiritStage {
  if (level >= 3) return { title: "完全体", aura: true, crown: true, size: 88 };
  if (level === 2) return { title: "成长体", aura: true, crown: false, size: 76 };
  return { title: "宝宝体", aura: false, crown: false, size: 64 };
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

function levelToStage(level: number): number {
  // Lv.1 → stage 1（宝宝体）；Lv.2 → stage 2（成长体）；Lv.3+ → stage 4（完全体/皇冠）
  if (level >= 3) return 4;
  if (level === 2) return 2;
  return 1;
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
 * 简版精灵图：始终取 stage 1 基础形态，文件更小、渲染一致，
 * 用于精灵列表缩略、未解锁灰态、首页小图标等密集场景，避免同时加载 28 张高阶图导致卡顿。
 */
export function getSimpleSpiritImage(metaId: string): string {
  return resolveSpiritPath(pageOf(metaId), 1);
}

/** 伙伴狐狸（Boss 战陪伴孩子的精灵）：固定用第 1 群岛的成长体 */
export function getCompanionImage(): string {
  return resolveSpiritPath(1, 2);
}

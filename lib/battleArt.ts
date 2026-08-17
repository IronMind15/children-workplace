/**
 * 战斗背景资源（v1.2.10 战斗背景规则）
 *  - 群岛小怪战斗背景：7 张对应 7 群岛（public/battles/arch_01_bg~arch_07_bg.webp）
 *  - 知识守卫战斗背景：1 张统一（public/battles/guard_bg.webp），不随群岛变化
 *  - Boss 战斗背景：1 张统一（public/battles/boss_bg.webp），不随群岛变化
 */

/** 1~7 群岛小怪战斗背景 */
export function getMinionBattleBg(archipelagoPage: number): string {
  const idx = Math.max(1, Math.min(7, archipelagoPage));
  return `/battles/arch_${String(idx).padStart(2, "0")}_bg.webp`;
}

/** 知识守卫战斗背景（统一） */
export const GUARD_BATTLE_BG = "/battles/guard_bg.webp";

/** Boss 战斗背景（统一） */
export const BOSS_BATTLE_BG = "/battles/boss_bg.webp";

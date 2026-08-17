/**
 * 知识守卫外观样式配置（2026-08-18 0818）
 *  - 共 6 套外观（public/guards/guard_01~06.webp），按群岛顺序循环
 *  - 单岛多个守卫时，新守卫样式 ≠ 上一守卫样式（避免视觉重复）
 */

export const GUARD_STYLE_COUNT = 6;

/** 第 N 号外观（1~6）对应的图片 URL */
export function getGuardImage(styleIndex: number): string {
  const idx = ((styleIndex - 1) % GUARD_STYLE_COUNT + GUARD_STYLE_COUNT) % GUARD_STYLE_COUNT + 1;
  return `/guards/guard_${String(idx).padStart(2, "0")}.webp`;
}

/** 外观的中文标签（用于开发期调试 / 未来可挂徽章） */
export const GUARD_STYLE_LABELS: Record<number, string> = {
  1: "翠绿守卫",
  2: "暗紫守卫",
  3: "柔紫守卫",
  4: "深蓝守卫",
  5: "天蓝守卫",
  6: "赤红守卫",
};

/**
 * 为一座岛屿上的「第 idx 个守卫」（idx 0-based）选一套外观。
 * 规则：
 *  - 优先按群岛页号（page 1~7）循环 GUARD_STYLE_COUNT 套外观
 *  - 若岛上 idx≥1 的守卫，强制避开上一个守卫的样式
 * @param page 群岛页号（1~7）
 * @param idx 该岛守卫序号（0-based）
 * @param prevStyle 上一个守卫的样式编号（1~6），无则 undefined
 */
export function pickGuardStyle(page: number, idx: number, prevStyle?: number): number {
  // 基底：按 page 循环到 1~6
  let base = ((page - 1) % GUARD_STYLE_COUNT) + 1;
  if (idx > 0) {
    // 后续守卫在基底下偏移，避开上一个
    let cur = base;
    for (let k = 1; k <= GUARD_STYLE_COUNT; k++) {
      const cand = ((base - 1 + k) % GUARD_STYLE_COUNT) + 1;
      if (cand !== prevStyle) {
        cur = cand;
        break;
      }
    }
    base = cur;
  }
  return base;
}

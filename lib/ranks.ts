/**
 * 探险家等级 / 头衔配置（v1.2.14）
 * 来源：docs/外壳与地图重设计方案.md §2 探险家等级设定（v1 设计）
 *
 * 设计原则：
 * - 6 档渐进头衔，从「海岛新丁」到「知识岛屿主」。
 * - 升级条件双轨：净化 Boss 数 或 火花数，满足其一即可晋升。
 * - 每级解锁新系统/功能，给孩子持续目标感。
 */

export type RankConfig = {
  level: number;
  /** 等级称号（带 emoji，可直接展示） */
  title: string;
  /** 解锁条件描述（给家长/孩子看） */
  condition: string;
  /** 量化阈值 */
  threshold: {
    /** 净化 Boss 数量 */
    purifiedBosses: number;
    /** 火花数 */
    sparks: number;
  };
  /** 晋升后解锁的内容 */
  unlocks: string;
};

export const RANKS: RankConfig[] = [
  {
    level: 1,
    title: "🧭 海岛新丁",
    condition: "起始等级",
    threshold: { purifiedBosses: 0, sparks: 0 },
    unlocks: "计数岛 + 图形岛（MK-01/MK-15）",
  },
  {
    level: 2,
    title: "🌱 海岸探险家",
    condition: "净化 3 个 Boss 或火花 ≥ 30",
    threshold: { purifiedBosses: 3, sparks: 30 },
    unlocks: "解锁「全览缩略图」",
  },
  {
    level: 3,
    title: "📚 海图学者",
    condition: "净化 8 个 Boss 或火花 ≥ 100",
    threshold: { purifiedBosses: 8, sparks: 100 },
    unlocks: "解锁「进化树」+「双 tab/分屏」切换",
  },
  {
    level: 4,
    title: "🏆 海图大师",
    condition: "净化 16 个 Boss 或火花 ≥ 250",
    threshold: { purifiedBosses: 16, sparks: 250 },
    unlocks: "解锁「AI 自由提问」（解除火花限制）",
  },
  {
    level: 5,
    title: "🌟 海图宗师",
    condition: "净化 25 个 Boss 或火花 ≥ 500",
    threshold: { purifiedBosses: 25, sparks: 500 },
    unlocks: "解锁「自定义头像」+「个性化主题色」",
  },
  {
    level: 6,
    title: "👑 知识岛屿主",
    condition: "净化全部 29 个 Boss",
    threshold: { purifiedBosses: 29, sparks: 500 },
    unlocks: "解锁「专属彩蛋」+ 装饰称号",
  },
];

export const MAX_RANK_LEVEL = RANKS.length;

/** 按等级取配置 */
export function getRankByLevel(level: number): RankConfig {
  return RANKS[Math.max(1, Math.min(level, MAX_RANK_LEVEL)) - 1] ?? RANKS[0];
}

/** 根据当前进度计算应处等级（满足任一阈值即晋升） */
export function computeRankLevel(purifiedBosses: number, sparks: number): number {
  let level = 1;
  for (const rank of RANKS) {
    if (purifiedBosses >= rank.threshold.purifiedBosses || sparks >= rank.threshold.sparks) {
      level = rank.level;
    }
  }
  return level;
}

/** 取下一级信息；已满级返回 null */
export function getNextRank(level: number): RankConfig | null {
  return RANKS.find((r) => r.level === level + 1) ?? null;
}

/** 进度文案：已净化 X 个 Boss / 已收集 Y 火花 */
export function formatRankProgress(purifiedBosses: number, sparks: number): string {
  return `已净化 ${purifiedBosses}/29 个 Boss · 已收集 ${sparks} 火花`;
}

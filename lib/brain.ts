// 大脑编辑器（REQ-EXP-02）：探险家的风格/偏好设置。
// 本文件保持纯净（不引入 node:sqlite），服务端与客户端组件均可 import。

export type BrainSettings = {
  more_encourage: boolean; // 开关：多鼓励我
  more_hint: boolean;      // 开关：多给提示
  help_level: number;      // 帮助力度：1=少 2=中 3=多
  tutorial_enabled: boolean; // 开关：开启后返回主界面自动进入新手引导
};

export const DEFAULT_BRAIN_SETTINGS: BrainSettings = {
  more_encourage: true,
  more_hint: true,
  help_level: 2,
  tutorial_enabled: false,
};

export const HELP_LEVEL_LABELS: Record<number, string> = {
  1: "提示少",
  2: "刚刚好",
  3: "提示多",
};

export function parseBrainSettings(json: string | null | undefined): BrainSettings {
  if (!json) return { ...DEFAULT_BRAIN_SETTINGS };
  try {
    const o = JSON.parse(json) as Partial<BrainSettings>;
    return {
      more_encourage:
        typeof o.more_encourage === "boolean" ? o.more_encourage : DEFAULT_BRAIN_SETTINGS.more_encourage,
      more_hint:
        typeof o.more_hint === "boolean" ? o.more_hint : DEFAULT_BRAIN_SETTINGS.more_hint,
      help_level:
        o.help_level === 1 || o.help_level === 2 || o.help_level === 3
          ? o.help_level
          : DEFAULT_BRAIN_SETTINGS.help_level,
      tutorial_enabled:
        typeof o.tutorial_enabled === "boolean" ? o.tutorial_enabled : DEFAULT_BRAIN_SETTINGS.tutorial_enabled,
    };
  } catch {
    return { ...DEFAULT_BRAIN_SETTINGS };
  }
}

// ===== 伙伴台词：随大脑设置变化的文案 =====

/** 主地图欢迎语 */
export function welcomeGuide(name: string, island: string, brain: BrainSettings): string {
  let m = `${name}，欢迎来到【${island}】！去打小怪练练手，或挑战渡海 Boss 解锁新本领吧！`;
  if (brain.more_encourage) m += " 我相信你今天一定会有新收获！";
  return m;
}

/** 小怪战开场引导 */
export function battleIntroGuide(brain: BrainSettings): string {
  let m = "派出「克制」它的精灵，用正确的本领打败它！";
  if (brain.more_hint || brain.help_level >= 2) m += " 先想一想：这道题在问什么？";
  return m;
}

/** Boss 战开场引导 */
export function bossIntroGuide(brain: BrainSettings): string {
  let m = "这是渡海 Boss！打败它，你会「发现新本领」，进化出全新精灵！";
  if (brain.more_encourage) m += " 深呼吸，你准备好的！";
  return m;
}

/** 答错时的提示：详略随帮助力度变化 */
export function missGuide(brain: BrainSettings, metaName?: string): string {
  let m = "再想想～";
  if (brain.more_hint || brain.help_level >= 2) m += " 不着急，我陪你慢慢想。";
  if (brain.help_level >= 3 && metaName) m += ` 提示：用「${metaName}」的本领想一想哦。`;
  return m;
}

/** 训练胜利鼓励 */
export function winGuide(brain: BrainSettings): string {
  return brain.more_encourage
    ? "太棒了！这个本领用得更熟练啦～继续加油！"
    : "这个本领用得更熟练啦。";
}

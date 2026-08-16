import type { SolveStep } from "./types";

/**
 * 按知识点随机生成题目（demo 大题库）：
 * 每次进入战斗都会抽到不同的数字和情境，实现"刷题不重样"。
 * 难度分级：整体难度等级由游戏进度决定（开新岛 +1），数字范围随等级抬升；
 * 等级越高，每场题目也越多（基础 4 招，最高 7 招）。难度也可用 adjustDifficulty 手动微调。
 */

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============ 难度 ============
let LEVEL = 1;
/** 设置当前难度等级（由游戏进度/手动偏置决定） */
export function setDifficultyLevel(l: number) {
  LEVEL = Math.max(1, Math.min(30, Math.floor(l) || 1));
}
/** 随难度抬升上界：base + (等级-1)*per */
const dStep = (base: number, per = 2) => base + (LEVEL - 1) * per;

/** 生成 3 个选项：正确答案 + 2 个邻近干扰项（按答案量级缩放），顺序打乱 */
function numOptions(ans: number): { label: string; correct?: boolean }[] {
  const unit = ans >= 100 ? 10 : ans >= 30 ? 5 : 1;
  const set = new Set<number>([ans]);
  let guard = 0;
  while (set.size < 3 && guard++ < 50) {
    const delta = rnd(1, 3) * unit * (Math.random() < 0.5 ? -1 : 1);
    const v = ans + delta;
    if (v >= 0 && v !== ans) set.add(v);
  }
  return shuffle([...set]).map((n) => ({ label: String(n), correct: n === ans }));
}

/** 生成 3 个字符串选项（正确 + 2 个干扰项），顺序打乱 */
function choiceOptions(correct: string, wrongs: [string, string]): { label: string; correct?: boolean }[] {
  return shuffle([
    { label: correct, correct: true },
    { label: wrongs[0] },
    { label: wrongs[1] },
  ]);
}

// ---- 计数（MK-01）：数一数 ----
const COUNT_THINGS = [
  { emoji: "🍎", name: "苹果" },
  { emoji: "🐥", name: "小鸡" },
  { emoji: "🎈", name: "气球" },
  { emoji: "⭐", name: "星星" },
  { emoji: "🐟", name: "小鱼" },
  { emoji: "🍄", name: "蘑菇" },
  { emoji: "🌸", name: "小花" },
  { emoji: "🚗", name: "小车" },
];

function countStep(): SolveStep {
  const t = COUNT_THINGS[rnd(0, COUNT_THINGS.length - 1)];
  const n = rnd(3, dStep(9, 4));
  return {
    type: "solve",
    prompt: `数一数，一共有几个${t.name}？ ${t.emoji.repeat(Math.min(n, 12))}${n > 12 ? "…" : ""}`,
    options: numOptions(n),
  };
}

// ---- 加法（MK-03）：合并求总数 ----
const ADD_STORIES: ((a: number, b: number, t: { emoji: string; name: string }) => string)[] = [
  (a, b, t) => `小明有 ${a} 个${t.name}，又捡到 ${b} 个，一共有几个？`,
  (a, b, t) => `左边 ${t.emoji.repeat(Math.min(a, 6))}（${a} 个），右边又来 ${b} 个${t.name}，合起来几个？`,
  (a, b) => `${a} + ${b} = ?`,
  (a, b, t) => `一筐 ${a} 个${t.name}，另一筐 ${b} 个，两筐一共几个？`,
];

function addStep(): SolveStep {
  const t = COUNT_THINGS[rnd(0, COUNT_THINGS.length - 1)];
  const a = rnd(1, dStep(9, 4));
  const b = rnd(1, dStep(9, 4));
  const story = ADD_STORIES[rnd(0, ADD_STORIES.length - 1)];
  return { type: "solve", prompt: story(a, b, t), options: numOptions(a + b) };
}

// ---- 减法（MK-04）：拿走/求剩余 ----
const SUB_STORIES: ((a: number, b: number, t: { emoji: string; name: string }) => string)[] = [
  (a, b, t) => `有 ${a} 个${t.name}，吃掉了 ${b} 个，还剩几个？`,
  (a, b, t) => `树上停着 ${a} 只小鸟，飞走了 ${b} 只，还剩几只？`,
  (a, b) => `${a} - ${b} = ?`,
  (a, b, t) => `妈妈买了 ${a} 个${t.name}，送给朋友 ${b} 个，还剩几个？`,
];

function subStep(): SolveStep {
  const t = COUNT_THINGS[rnd(0, COUNT_THINGS.length - 1)];
  const a = rnd(dStep(5, 3), dStep(18, 6));
  const b = rnd(1, a - 2);
  const story = SUB_STORIES[rnd(0, SUB_STORIES.length - 1)];
  return { type: "solve", prompt: story(a, b, t), options: numOptions(a - b) };
}

// ---- 乘法（MK-05）：连加打包 ----
const MUL_STORIES: ((a: number, b: number, t: { emoji: string; name: string }) => string)[] = [
  (a, b, t) => `${a} 排${t.name}，每排 ${b} 个，一共有几个？`,
  (a, b, t) => `每只小篮子装 ${b} 个${t.name}，装了 ${a} 只篮子，一共几个？`,
  (a, b) => `${a} × ${b} = ?（就是 ${b} 连加 ${a} 次）`,
  (a, b, t) => `一盒有 ${a} 个${t.name}，买了 ${b} 盒，一共有几个？`,
];

function mulStep(): SolveStep {
  const t = COUNT_THINGS[rnd(0, COUNT_THINGS.length - 1)];
  const a = rnd(2, dStep(9, 3));
  const b = rnd(2, dStep(9, 3));
  const story = MUL_STORIES[rnd(0, MUL_STORIES.length - 1)];
  return { type: "solve", prompt: story(a, b, t), options: numOptions(a * b) };
}

// ---- 位值（MK-02）：十位 / 个位 ----
function placeOptions(ans: number): { label: string; correct?: boolean }[] {
  const cands = new Set<number>([ans]);
  const pool = [Math.round(ans / 10), ans + 10, Math.max(0, ans - 10), ans + 1];
  for (const p of pool) {
    if (cands.size >= 3) break;
    if (p !== ans && p >= 0) cands.add(p);
  }
  return shuffle([...cands]).map((n) => ({ label: String(n), correct: n === ans }));
}

const PLACE_STORIES: (() => SolveStep)[] = [
  () => {
    const t = rnd(2, dStep(9, 3));
    const o = rnd(1, 9);
    const n = t * 10 + o;
    return { type: "solve", prompt: `${n} 里的 ${t} 在十位，它表示多少？`, options: placeOptions(t * 10) };
  },
  () => {
    const t = rnd(1, dStep(4, 2));
    const o = rnd(1, 9);
    return { type: "solve", prompt: `${t} 个十和 ${o} 个一，合起来是几？`, options: placeOptions(t * 10 + o) };
  },
  () => {
    const t = rnd(1, dStep(4, 2));
    const o = rnd(1, 9);
    return { type: "solve", prompt: `${t * 10 + o} 里面有 1 个十和（ ）个一？把数字拆开看看！`, options: numOptions(o) };
  },
  () => {
    const t = rnd(2, dStep(9, 3));
    return { type: "solve", prompt: `${t} 个十是多少？`, options: placeOptions(t * 10) };
  },
];

function placeStep(): SolveStep {
  return PLACE_STORIES[rnd(0, PLACE_STORIES.length - 1)]();
}

// ---- 除法（MK-06）：平均分 ----
function divStep(): SolveStep {
  const c = rnd(2, dStep(9, 2));
  const b = rnd(2, dStep(6, 3));
  const total = b * c;
  const stories = [
    `${total} 颗糖平均分给 ${b} 个小朋友，每人几颗？`,
    `${total} 个苹果平均装进 ${b} 个篮子，每篮几个？`,
    `${total} ÷ ${b} = ?`,
    `${total} 块饼干，每 ${b} 块装一袋，能装几袋？`,
  ];
  return { type: "solve", prompt: stories[rnd(0, 3)], options: numOptions(c) };
}

// ---- 分数（MK-07）：部分与整体 ----
function fracStep(): SolveStep {
  const n = [2, 4, 6, 8, 3, 5][rnd(0, 5)];
  const k = rnd(1, Math.max(1, Math.floor(n / 2) - 1)) || 1;
  return {
    type: "solve",
    prompt: `🍕 蛋糕平均切成 ${n} 块，吃掉 ${k} 块，吃了几分之几？`,
    options: choiceOptions(`${k}/${n}`, [`${n}/${k}`, `${k}/${n + 1}`]),
  };
}

// ---- 小数（MK-08）：元角分 ----
function decimalStep(): SolveStep {
  const y = rnd(1, 9);
  const j = rnd(1, 9);
  const ans = `${y}.${j}`;
  const wrongs: [string, string] = [`${y}${j}`, `${j}.${y}`];
  return {
    type: "solve",
    prompt: `🪙 ${y} 元 ${j} 角是几元？（用小数表示）`,
    options: choiceOptions(ans, wrongs),
  };
}

// ---- 百分数（MK-09）----
function percentStep(): SolveStep {
  const n = [10, 20, 25, 50, 75, 80, 90, 40, 60][rnd(0, 8)];
  return {
    type: "solve",
    prompt: `种了 100 棵树苗，成活了 ${n} 棵，成活率是百分之几？`,
    options: choiceOptions(`${n}%`, [`${n / 10}%`, `${n * 10}%`]),
  };
}

// ---- 负数（MK-10）：相反意义的量 ----
function negativeStep(): SolveStep {
  const b = rnd(1, dStep(9, 3));
  const stories = [
    `🌡️ 零上 5℃ 记作 +5℃，零下 ${b}℃ 记作几度？`,
    `🏔️ 海平面以上 ${b} 米记作 +${b} 米，潜水员下潜 ${b} 米记作多少米？`,
    `📉 收入 ${b} 元记作 +${b} 元，花掉 ${b} 元记作几元？`,
  ];
  return { type: "solve", prompt: stories[rnd(0, 2)], options: choiceOptions(`-${b}`, [`${b}`, `+${b}`]) };
}

// ---- 比（MK-11）----
const RATIO_CASES: [number, number, string, string, string][] = [
  [6, 3, "2:1", "1:2", "3:1"],
  [8, 2, "4:1", "1:4", "2:1"],
  [9, 3, "3:1", "1:3", "9:1"],
  [10, 5, "2:1", "5:2", "1:2"],
  [12, 4, "3:1", "4:3", "1:3"],
];
function ratioStep(): SolveStep {
  const [a, b, ans, w1, w2] = RATIO_CASES[rnd(0, RATIO_CASES.length - 1)];
  return {
    type: "solve",
    prompt: `⚖️ ${a} 个苹果和 ${b} 个橘子，苹果与橘子的比是？`,
    options: choiceOptions(ans, [w1, w2]),
  };
}

// ---- 比例（MK-12）----
function proportionStep(): SolveStep {
  const k = rnd(2, 4);
  const p = rnd(2, 6);
  const n = k * 3;
  return {
    type: "solve",
    prompt: `🎯 ${k} 支铅笔 ${k * p} 元，买 ${n} 支同样的铅笔要几元？`,
    options: numOptions(n * p),
  };
}

// ---- 字母表示数（MK-13）----
function literalStep(): SolveStep {
  const n = rnd(2, dStep(9, 3));
  const cases = [
    [`🔤 比 x 多 ${n} 的数，怎么表示？`, `x+${n}`, [`${n}x`, `x-${n}`]],
    [`🔤 x 的 ${n} 倍，怎么表示？`, `${n}x`, [`x+${n}`, `x/${n}`]],
    [`🔤 比 x 少 ${n} 的数，怎么表示？`, `x-${n}`, [`x+${n}`, `${n}x`]],
    [`🔤 3 个 x 相加，怎么写更简便？`, `3x`, [`x³`, `x+3`]],
  ] as [string, string, string[]][];
  const [prompt, ans, wrongs] = cases[rnd(0, 3)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]) };
}

// ---- 方程（MK-14）----
function equationStep(): SolveStep {
  const x = rnd(1, dStep(9, 3));
  const a = rnd(1, dStep(9, 3));
  return {
    type: "solve",
    prompt: `🧩 x + ${a} = ${x + a}，x 是几？`,
    options: numOptions(x),
  };
}

// ---- 图形认识（MK-15）----
function shapeStep(): SolveStep {
  const cases = [
    ["下面哪个图形有 3 条边？", "三角形", ["正方形", "圆形"]],
    ["下面哪个图形摸起来没有角？", "圆形", ["三角形", "正方形"]],
    ["正方体有几个面？", "6 个", ["4 个", "8 个"]],
    ["下面哪个图形有 4 条一样长的边？", "正方形", ["长方形", "三角形"]],
  ] as [string, string, string[]][];
  const [prompt, ans, wrongs] = cases[rnd(0, 3)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]) };
}

// ---- 角（MK-16）----
function angleStep(): SolveStep {
  const cases = [
    ["📐 直角是多少度？", "90°", ["45°", "180°"]],
    ["📐 比直角小的角叫什么？", "锐角", ["钝角", "平角"]],
    ["📐 比直角大、比平角小的角叫什么？", "钝角", ["锐角", "直角"]],
    ["📐 一个平角等于几个直角？", "2 个", ["3 个", "4 个"]],
  ] as [string, string, string[]][];
  const [prompt, ans, wrongs] = cases[rnd(0, 3)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]) };
}

// ---- 周长（MK-17）----
function perimeterStep(): SolveStep {
  if (Math.random() < 0.5) {
    const s = rnd(2, dStep(9, 3));
    return { type: "solve", prompt: `📏 边长 ${s} 厘米的正方形，周长是多少厘米？`, options: numOptions(4 * s) };
  }
  const l = rnd(3, dStep(9, 3));
  const w = rnd(2, l - 1);
  return { type: "solve", prompt: `📏 长 ${l} 厘米、宽 ${w} 厘米的长方形，周长是多少厘米？`, options: numOptions(2 * (l + w)) };
}

// ---- 面积（MK-18）----
function areaStep(): SolveStep {
  const l = rnd(2, dStep(9, 3));
  const w = rnd(2, dStep(9, 3));
  return { type: "solve", prompt: `🟩 长 ${l} 厘米、宽 ${w} 厘米的长方形，面积是多少平方厘米？`, options: numOptions(l * w) };
}

// ---- 体积（MK-19）----
function volumeStep(): SolveStep {
  const e = rnd(2, dStep(4, 1));
  return { type: "solve", prompt: `🧊 棱长 ${e} 厘米的正方体，体积是多少立方厘米？`, options: numOptions(e * e * e) };
}

// ---- 图形运动（MK-20）----
function motionStep(): SolveStep {
  const cases = [
    ["🔄 电梯上上下下地移动，是哪种运动？", "平移", ["旋转", "对称"]],
    ["🔄 风车迎风转动，是哪种运动？", "旋转", ["平移", "对称"]],
    ["🔄 蝴蝶左右两边翅膀形状一样，这是？", "对称", ["平移", "旋转"]],
    ["🔄 照镜子时身体和镜中影像是？", "对称", ["平移", "旋转"]],
  ] as [string, string, string[]][];
  const [prompt, ans, wrongs] = cases[rnd(0, 3)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]) };
}

// ---- 位置与方向（MK-21）----
function directionStep(): SolveStep {
  const cases = [
    ["🧭 面向北站立，你的右手边是哪个方向？", "东", ["西", "南"]],
    ["🧭 太阳每天从哪个方向升起？", "东", ["西", "北"]],
    ["🧭 面向北站立，你的背后是哪个方向？", "南", ["东", "西"]],
    ["🧭 下午放学时太阳在哪边落下？", "西", ["东", "南"]],
  ] as [string, string, string[]][];
  const [prompt, ans, wrongs] = cases[rnd(0, 3)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]) };
}

// ---- 单位换算（MK-22）----
function unitStep(): SolveStep {
  const pool = [
    () => { const m = rnd(2, dStep(9, 3)); return { p: `${m} 米等于多少厘米？`, a: m * 100 }; },
    () => { const m = rnd(2, dStep(9, 3)); return { p: `${m} 千克等于多少克？`, a: m * 1000 }; },
    () => { const y = rnd(2, dStep(9, 3)); return { p: `${y} 元等于多少角？`, a: y * 10 }; },
    () => { const cm = rnd(2, dStep(9, 3)) * 10; return { p: `${cm} 厘米等于多少分米？`, a: cm / 10 }; },
    () => { const m = rnd(2, dStep(9, 3)); return { p: `${m} 千米等于多少米？`, a: m * 1000 }; },
  ];
  const { p, a } = pool[rnd(0, pool.length - 1)]();
  return { type: "solve", prompt: `📦 ${p}`, options: numOptions(a) };
}

// ---- 时间（MK-23）----
function timeStep(): SolveStep {
  if (Math.random() < 0.5) {
    const h1 = rnd(1, 8);
    const h2 = h1 + rnd(1, 4);
    return { type: "solve", prompt: `⏰ 从 ${h1} 时到 ${h2} 时，经过了几小时？`, options: numOptions(h2 - h1) };
  }
  const cases = [
    ["⏰ 1 时等于多少分？", "60", ["100", "30"]],
    ["⏰ 1 分等于多少秒？", "60", ["100", "30"]],
    ["⏰ 分针走一圈是几分钟？", "60", ["30", "12"]],
  ] as [string, string, string[]][];
  const [prompt, ans, wrongs] = cases[rnd(0, 2)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]) };
}

// ---- 分类整理（MK-24）----
function classifyStep(): SolveStep {
  const cases = [
    ["🗂️ 苹果、香蕉、白菜，哪个和其他两个不是一类？", "白菜", ["苹果", "香蕉"]],
    ["🗂️ 小狗、小猫、桌子，哪个和其他两个不是一类？", "桌子", ["小狗", "小猫"]],
    ["🗂️ 红球、蓝球、红正方体，哪个和其他两个不是一类？", "红正方体", ["红球", "蓝球"]],
    ["🗂️ 铅笔、尺子、西瓜，哪个和其他两个不是一类？", "西瓜", ["铅笔", "尺子"]],
  ] as [string, string, string[]][];
  const [prompt, ans, wrongs] = cases[rnd(0, 3)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]) };
}

// ---- 统计图（MK-25）----
function chartStep(): SolveStep {
  const cases = [
    ["📊 想一眼看出谁多谁少，用哪种统计图最合适？", "条形统计图", ["统计表", "扇形统计图"]],
    ["📊 想看出数量随着时间变多还是变少，用哪种最合适？", "折线统计图", ["条形统计图", "统计表"]],
    ["📊 想看出各部分占整体的百分比，用哪种最合适？", "扇形统计图", ["条形统计图", "折线统计图"]],
  ] as [string, string, string[]][];
  const [prompt, ans, wrongs] = cases[rnd(0, 2)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]) };
}

// ---- 平均数（MK-26）----
function averageStep(): SolveStep {
  const a = rnd(1, dStep(6, 2));
  const n = rnd(3, 5);
  const nums = Array.from({ length: n }, (_, i) => a + i);
  const sum = nums.reduce((s, v) => s + v, 0);
  return {
    type: "solve",
    prompt: `🧮 ${n} 个小朋友分别有 ${nums.join("、")} 颗糖，平均每人几颗？`,
    options: numOptions(sum / n),
  };
}

// ---- 可能性（MK-27）----
function chanceStep(): SolveStep {
  const r = rnd(6, 10);
  const w = rnd(1, 3);
  return {
    type: "solve",
    prompt: `🎲 袋子里有 ${r} 个红球和 ${w} 个白球，更容易摸到哪种球？`,
    options: choiceOptions("红球", ["白球", "一样容易"]),
  };
}

// ---- 集合（MK-28）：重叠与容斥（维恩图）----
function setStep(): SolveStep {
  const a = rnd(dStep(6, 4), dStep(14, 6));
  const b = rnd(dStep(6, 4), dStep(14, 6));
  const c = rnd(1, Math.max(1, Math.min(a, b) - 1)); // 重叠人数，必小于两边
  const both = a + b - c; // 容斥：至少喜欢一种 = a + b - c
  const roll = rnd(0, 3);
  if (roll === 0) {
    return {
      type: "solve",
      prompt: `🌀 班里有 ${a} 人喜欢苹果、${b} 人喜欢香蕉，其中 ${c} 人两种都喜欢。喜欢苹果或香蕉的一共几人？（重叠的人只算一次）`,
      options: numOptions(both),
    };
  }
  if (roll === 1) {
    return {
      type: "solve",
      prompt: `🌀 参加跳绳的有 ${a} 人、参加跑步的有 ${b} 人，两项都参加的有 ${c} 人。至少参加一项的一共几人？`,
      options: numOptions(both),
    };
  }
  if (roll === 2) {
    return {
      type: "solve",
      prompt: `🌀 既喜欢吃苹果又喜欢吃香蕉的小朋友，应该把他的名字贴在 Venn 图的哪里？`,
      options: choiceOptions("两个圈重叠的地方", ["只贴苹果圈", "只贴香蕉圈"]),
    };
  }
  return {
    type: "solve",
    prompt: `🌀 图书角有 ${a} 本故事书、${b} 本科学书，其中 ${c} 本两类都有。故事书或科学书一共有几本？`,
    options: numOptions(both),
  };
}

const GENERATORS: Record<string, () => SolveStep> = {
  "MK-01": countStep,
  "MK-02": placeStep,
  "MK-03": addStep,
  "MK-04": subStep,
  "MK-05": mulStep,
  "MK-06": divStep,
  "MK-07": fracStep,
  "MK-08": decimalStep,
  "MK-09": percentStep,
  "MK-10": negativeStep,
  "MK-11": ratioStep,
  "MK-12": proportionStep,
  "MK-13": literalStep,
  "MK-14": equationStep,
  "MK-15": shapeStep,
  "MK-16": angleStep,
  "MK-17": perimeterStep,
  "MK-18": areaStep,
  "MK-19": volumeStep,
  "MK-20": motionStep,
  "MK-21": directionStep,
  "MK-22": unitStep,
  "MK-23": timeStep,
  "MK-24": classifyStep,
  "MK-25": chartStep,
  "MK-26": averageStep,
  "MK-27": chanceStep,
  "MK-28": setStep,
};

// ---- 混合题（需要两只精灵联手）----
function comboStep(metas: [string, string], prompt: string, ans: number): SolveStep {
  return { type: "solve", prompt, options: numOptions(ans), requires: [...metas] };
}

const COMBOS: Record<string, () => SolveStep> = {
  // 加法 + 计数
  "MK-03": () => {
    const a = rnd(2, dStep(6, 3));
    const b = rnd(2, dStep(6, 3));
    const t = COUNT_THINGS[rnd(0, COUNT_THINGS.length - 1)];
    return comboStep(
      ["MK-03", "MK-01"],
      `🤝 联手题！左边 ${t.emoji.repeat(a)}（${a} 个），右边 ${t.emoji.repeat(b)}（${b} 个），用加法算出一共有几个？`,
      a + b
    );
  },
  // 减法 + 加法
  "MK-04": () => {
    const a = rnd(6, dStep(12, 4));
    const b = rnd(1, 4);
    const c = rnd(1, 4);
    return comboStep(["MK-04", "MK-03"], `🤝 联手题！两步算：${a} - ${b} + ${c} = ?`, a - b + c);
  },
  // 乘法 + 减法
  "MK-05": () => {
    const a = rnd(2, dStep(5, 2));
    const b = rnd(2, dStep(6, 2));
    const c = rnd(1, dStep(5, 2));
    return comboStep(["MK-05", "MK-04"], `🤝 联手题！两步算：${a} × ${b} - ${c} = ?`, a * b - c);
  },
  // 位值 + 加法
  "MK-02": () => {
    const t = rnd(1, dStep(4, 2));
    const o = rnd(1, 9);
    return comboStep(["MK-02", "MK-03"], `🤝 联手题！${t} 个十加上 ${o}，合起来是几？`, t * 10 + o);
  },
  // 除法 + 乘法
  "MK-06": () => {
    const a = rnd(2, dStep(6, 2));
    const b = rnd(2, dStep(6, 2));
    return comboStep(["MK-06", "MK-05"], `🤝 联手题！两步算：${a} × ${b} 的结果再平均分成 ${b} 份，每份是几？`, a);
  },
  // 面积 + 乘法
  "MK-18": () => {
    const l = rnd(3, dStep(8, 2));
    const w = rnd(3, dStep(8, 2));
    return comboStep(["MK-18", "MK-05"], `🤝 联手题！长方形长 ${l} 厘米、宽 ${w} 厘米，铺满它需要几个 1 平方厘米的小方块？`, l * w);
  },
  // 平均数 + 加法/除法
  "MK-26": () => {
    const a = rnd(2, dStep(6, 2));
    return comboStep(["MK-26", "MK-03"], `🤝 联手题！3 个小朋友分别有 ${a}、${a + 1}、${a + 2} 颗糖，合起来再平均分，每人几颗？`, a + 1);
  },
  // 集合 + 分类整理
  "MK-28": () => {
    const a = rnd(dStep(5, 3), dStep(12, 5));
    const b = rnd(dStep(5, 3), dStep(12, 5));
    const c = rnd(1, Math.max(1, Math.min(a, b) - 1));
    return comboStep(
      ["MK-28", "MK-24"],
      `🤝 联手题！先把大家按爱好分成两堆（苹果圈 ${a} 人、香蕉圈 ${b} 人），数出重叠的 ${c} 人，喜欢其中一种的一共几人？`,
      a + b - c
    );
  },
};

/** 为某知识点生成一整场随机题目。
 * level 越高：数字范围越大、题目也越多（4→7 招），并更可能穿插联手大题。 */
export function generateSteps(metaId: string, count?: number, level = 1): SolveStep[] {
  setDifficultyLevel(level);
  const gen = GENERATORS[metaId];
  if (!gen) return [];
  const combo = COMBOS[metaId] as (() => SolveStep) | undefined;
  const base = count ?? Math.min(7, 4 + Math.max(0, level - 1)); // 4 → 7 招
  const steps: SolveStep[] = [];
  for (let i = 0; i < base; i++) {
    // 中后段穿插联手题（如果该岛有联手机制）
    if (combo && i === Math.floor(base / 2)) steps.push(combo());
    else steps.push(gen());
  }
  return steps;
}

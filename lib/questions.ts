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
    explain: `数数要一个一个数、不重复也不漏。${t.emoji} 从 1 开始数：${Array.from({ length: Math.min(n, 8) }, (_, i) => i + 1).join("、")}${n > 8 ? "……" : ""}，数到最后一个就是 ${n} 个${t.name}。`,
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
  return { type: "solve", prompt: story(a, b, t), options: numOptions(a + b), explain: `加法是「合并求总数」。把 ${a} 个${t.name}和 ${b} 个${t.name}合在一起，可以接着 ${a} 往后数 ${b} 个，数到 ${a + b}，所以 ${a} + ${b} = ${a + b}。` };
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
  return { type: "solve", prompt: story(a, b, t), options: numOptions(a - b), explain: `减法是「拿走求剩余」。有 ${a} 个${t.name}，拿走 ${b} 个，就从 ${a} 往前数 ${b} 个，剩下 ${a - b} 个，所以 ${a} - ${b} = ${a - b}。` };
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
  return { type: "solve", prompt: story(a, b, t), options: numOptions(a * b), explain: `乘法是「几个几相加」。${a} × ${b} 表示 ${a} 个 ${b} 加起来，也就是 ${a} 个 ${b} = ${a * b}。可以背乘法口诀，或把 ${b} 连加 ${a} 次得到 ${a * b}。` };
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
    return { type: "solve", prompt: `${n} 里的 ${t} 在十位，它表示多少？`, options: placeOptions(t * 10), explain: `十位上的数字表示「几个十」。${n} 里的 ${t} 在十位，表示 ${t} 个十，也就是 ${t * 10}。` };
  },
  () => {
    const t = rnd(1, dStep(4, 2));
    const o = rnd(1, 9);
    return { type: "solve", prompt: `${t} 个十和 ${o} 个一，合起来是几？`, options: placeOptions(t * 10 + o), explain: `十位表示几个十、个位表示几个一。${t} 个十是 ${t * 10}，再加 ${o} 个一，合起来就是 ${t * 10 + o}。` };
  },
  () => {
    const t = rnd(1, dStep(4, 2));
    const o = rnd(1, 9);
    return { type: "solve", prompt: `${t * 10 + o} 里面有 1 个十和（ ）个一？把数字拆开看看！`, options: numOptions(o), explain: `${t * 10 + o} 拆成十位和个位：十位是 ${t}（表示 ${t} 个十），个位是 ${o}（表示 ${o} 个一），所以个位是 ${o}。` };
  },
  () => {
    const t = rnd(2, dStep(9, 3));
    return { type: "solve", prompt: `${t} 个十是多少？`, options: placeOptions(t * 10), explain: `十位是几就表示几个十。${t} 个十就是 ${t} 个 10 加起来，等于 ${t * 10}。` };
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
  return { type: "solve", prompt: stories[rnd(0, 3)], options: numOptions(c), explain: `除法是「平均分」。${total} 平均分成 ${b} 份，每份就是 ${c} 个，因为 ${b} × ${c} = ${total}，所以 ${total} ÷ ${b} = ${c}。` };
}

// ---- 分数（MK-07）：部分与整体 ----
function fracStep(): SolveStep {
  const n = [2, 4, 6, 8, 3, 5][rnd(0, 5)];
  const k = rnd(1, Math.max(1, Math.floor(n / 2) - 1)) || 1;
  return {
    type: "solve",
    prompt: `🍕 蛋糕平均切成 ${n} 块，吃掉 ${k} 块，吃了几分之几？`,
    options: choiceOptions(`${k}/${n}`, [`${n}/${k}`, `${k}/${n + 1}`]),
    explain: `分数表示「整体平均分成几份，取了几份」。蛋糕切成 ${n} 份，${n} 写在下面做分母；吃掉 ${k} 份，${k} 写在上面做分子，所以是 ${k}/${n}。`,
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
    explain: `1 元 = 10 角。用小数表示元，元写在小数点左边、角写在小数点右边：${y} 元 ${j} 角就是 ${y}.${j} 元。`,
  };
}

// ---- 百分数（MK-09）----
function percentStep(): SolveStep {
  const n = [10, 20, 25, 50, 75, 80, 90, 40, 60][rnd(0, 8)];
  return {
    type: "solve",
    prompt: `种了 100 棵树苗，成活了 ${n} 棵，成活率是百分之几？`,
    options: choiceOptions(`${n}%`, [`${n / 10}%`, `${n * 10}%`]),
    explain: `百分数就是「每 100 份里占几份」。100 棵里活了 ${n} 棵，就是 100 份里的 ${n} 份，写作 ${n}%。`,
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
  return { type: "solve", prompt: stories[rnd(0, 2)], options: choiceOptions(`-${b}`, [`${b}`, `+${b}`]), explain: `负数表示「和正数相反的量」。零上、海平面以上、收入用正数；零下、下潜、花掉这些相反的，就用负数 -${b} 来表示。` };
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
    explain: `比表示「两个数量的倍数关系」。苹果 ${a} 个、橘子 ${b} 个，先写成 ${a}:${b}，再同时除以它们的公因数，约成最简单的整数比 ${ans}。`,
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
    explain: `比例是「同倍变化」。先算 1 支铅笔的价钱：${k * p} ÷ ${k} = ${p} 元；买 ${n} 支就是 ${p} × ${n} = ${n * p} 元。`,
  };
}

// ---- 字母表示数（MK-13）----
function literalStep(): SolveStep {
  const n = rnd(2, dStep(9, 3));
  const cases = [
    [`🔤 比 x 多 ${n} 的数，怎么表示？`, `x+${n}`, [`${n}x`, `x-${n}`], `x 是一个还不知道的数，用字母表示。比 x 多 ${n}，就是在 x 后面加 ${n}，写作 x+${n}。`],
    [`🔤 x 的 ${n} 倍，怎么表示？`, `${n}x`, [`x+${n}`, `x/${n}`], `x 的 ${n} 倍就是把 x 乘 ${n}，乘号可以省略，写作 ${n}x。`],
    [`🔤 比 x 少 ${n} 的数，怎么表示？`, `x-${n}`, [`x+${n}`, `${n}x`], `比 x 少 ${n}，就是从 x 里减去 ${n}，写作 x-${n}。`],
    [`🔤 3 个 x 相加，怎么写更简便？`, `3x`, [`x³`, `x+3`], `3 个 x 相加就是 x+x+x，可以简写成 3x（乘号省略，数字写在字母前面）。`],
  ] as [string, string, string[], string][];
  const [prompt, ans, wrongs, explain] = cases[rnd(0, 3)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]), explain };
}

// ---- 方程（MK-14）----
function equationStep(): SolveStep {
  const x = rnd(1, dStep(9, 3));
  const a = rnd(1, dStep(9, 3));
  return {
    type: "solve",
    prompt: `🧩 x + ${a} = ${x + a}，x 是几？`,
    options: numOptions(x),
    explain: `方程是「藏起来的数」。x + ${a} = ${x + a}，x 就是 ${x + a} 减去 ${a}，等于 ${x}。`,
  };
}

// ---- 图形认识（MK-15）----
function shapeStep(): SolveStep {
  const cases = [
    ["下面哪个图形有 3 条边？", "三角形", ["正方形", "圆形"], "三角形有 3 条边、3 个角；正方形有 4 条边；圆形没有边。所以 3 条边的是三角形。"],
    ["下面哪个图形摸起来没有角？", "圆形", ["三角形", "正方形"], "圆形是圆圆的、没有尖角；三角形和正方形都有尖尖的角。所以摸起来没角的是圆形。"],
    ["正方体有几个面？", "6 个", ["4 个", "8 个"], "正方体有 6 个面：上、下、前、后、左、右，各 1 个，一共 6 个。"],
    ["下面哪个图形有 4 条一样长的边？", "正方形", ["长方形", "三角形"], "正方形 4 条边都一样长；长方形只是「对边」一样长；三角形只有 3 条边。所以是正方形。"],
    ["三角形内角和是多少度？", "180°", ["90°", "360°"], "三角形三个内角加起来是 180°，不管什么三角形都一样。"],
    ["长方体有几个顶点？", "8 个", ["6 个", "12 个"], "长方体有 8 个顶点（角），每个角由 3 条边交汇。"],
    ["圆柱的侧面展开是什么形状？", "长方形", ["圆形", "三角形"], "圆柱侧面沿高剪开展开，是一个长方形（宽=高，长=底面周长）。"],
    ["下面哪个是立体图形？", "球", ["三角形", "正方形"], "球是立体的（有厚度）；三角形和正方形是平面图形。所以球是立体图形。"],
  ] as [string, string, string[], string][];
  const [prompt, ans, wrongs, explain] = cases[rnd(0, 7)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]), explain };
}

// ---- 角（MK-16）----
function angleStep(): SolveStep {
  const cases = [
    ["📐 直角是多少度？", "90°", ["45°", "180°"], "直角是 90°。45° 是直角的一半，180° 是平角（等于两个直角）。"],
    ["📐 比直角小的角叫什么？", "锐角", ["钝角", "平角"], "锐角比直角小（小于 90°）；钝角比直角大；平角是 180°。所以比直角小的是锐角。"],
    ["📐 比直角大、比平角小的角叫什么？", "钝角", ["锐角", "直角"], "钝角比直角大（大于 90°）但比平角小（小于 180°）。"],
    ["📐 一个平角等于几个直角？", "2 个", ["3 个", "4 个"], "平角是 180°，直角是 90°，180 ÷ 90 = 2，所以一个平角等于 2 个直角。"],
    ["📐 一个周角等于几个直角？", "4 个", ["2 个", "6 个"], "周角是 360°，直角是 90°，360 ÷ 90 = 4，所以一个周角等于 4 个直角。"],
    ["📐 三角尺上最大的角是什么角？", "直角", ["锐角", "钝角"], "三角尺有一个角是 90° 的直角，另外两个是锐角。所以最大的角是直角。"],
    ["📐 钟表 3 点整，时针和分针成什么角？", "直角", ["锐角", "钝角"], "3 点整时，时针指 3、分针指 12，刚好成 90°，是直角。"],
  ] as [string, string, string[], string][];
  const [prompt, ans, wrongs, explain] = cases[rnd(0, 6)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]), explain };
}

// ---- 周长（MK-17）----
function perimeterStep(): SolveStep {
  if (Math.random() < 0.5) {
    const s = rnd(2, dStep(9, 3));
    return { type: "solve", prompt: `📏 边长 ${s} 厘米的正方形，周长是多少厘米？`, options: numOptions(4 * s), explain: `周长是图形一圈的总长度。正方形 4 条边一样长，周长 = 4 × ${s} = ${4 * s} 厘米。` };
  }
  const l = rnd(3, dStep(9, 3));
  const w = rnd(2, l - 1);
  return { type: "solve", prompt: `📏 长 ${l} 厘米、宽 ${w} 厘米的长方形，周长是多少厘米？`, options: numOptions(2 * (l + w)), explain: `周长是图形一圈的总长度。长方形有 2 条长、2 条宽，周长 = (${l} + ${w}) × 2 = ${2 * (l + w)} 厘米。` };
}

// ---- 面积（MK-18）----
function areaStep(): SolveStep {
  const roll = rnd(0, 2);
  if (roll === 0) {
    const l = rnd(2, dStep(9, 3));
    const w = rnd(2, dStep(9, 3));
    return { type: "solve", prompt: `🟩 长 ${l} 厘米、宽 ${w} 厘米的长方形，面积是多少平方厘米？`, options: numOptions(l * w), explain: `面积是图形「铺满」的大小。长方形面积 = 长 × 宽 = ${l} × ${w} = ${l * w} 平方厘米。` };
  }
  if (roll === 1) {
    const s = rnd(2, dStep(9, 3));
    return { type: "solve", prompt: `🟩 边长 ${s} 厘米的正方形，面积是多少平方厘米？`, options: numOptions(s * s), explain: `正方形面积 = 边长 × 边长 = ${s} × ${s} = ${s * s} 平方厘米。` };
  }
  const b = rnd(2, dStep(8, 2));
  const h = rnd(2, dStep(8, 2));
  return { type: "solve", prompt: `🔺 底 ${b} 厘米、高 ${h} 厘米的三角形，面积是多少平方厘米？`, options: numOptions(Math.floor((b * h) / 2)), explain: `三角形面积 = 底 × 高 ÷ 2 = ${b} × ${h} ÷ 2 = ${Math.floor((b * h) / 2)} 平方厘米。` };
}

// ---- 体积（MK-19）----
function volumeStep(): SolveStep {
  const roll = rnd(0, 1);
  if (roll === 0) {
    const e = rnd(2, dStep(4, 1));
    return { type: "solve", prompt: `🧊 棱长 ${e} 厘米的正方体，体积是多少立方厘米？`, options: numOptions(e * e * e), explain: `体积是立体图形「装」的大小。正方体体积 = 棱长 × 棱长 × 棱长 = ${e} × ${e} × ${e} = ${e * e * e} 立方厘米。` };
  }
  const l = rnd(2, dStep(6, 1));
  const w = rnd(2, dStep(6, 1));
  const h = rnd(2, dStep(6, 1));
  return { type: "solve", prompt: `📦 长 ${l}、宽 ${w}、高 ${h} 厘米的长方体，体积是多少立方厘米？`, options: numOptions(l * w * h), explain: `长方体体积 = 长 × 宽 × 高 = ${l} × ${w} × ${h} = ${l * w * h} 立方厘米。` };
}

// ---- 图形运动（MK-20）----
function motionStep(): SolveStep {
  const cases = [
    ["🔄 电梯上上下下地移动，是哪种运动？", "平移", ["旋转", "对称"], "电梯直直地上上下下，位置变了但形状、方向都不变，这叫平移。"],
    ["🔄 风车迎风转动，是哪种运动？", "旋转", ["平移", "对称"], "风车绕着一个中心点转圈，这叫旋转。"],
    ["🔄 蝴蝶左右两边翅膀形状一样，这是？", "对称", ["平移", "旋转"], "对称是左右两边完全一样，像照镜子一样，蝴蝶的翅膀就是这样。"],
    ["🔄 照镜子时身体和镜中影像是？", "对称", ["平移", "旋转"], "照镜子时，镜子里外的形状左右对称、完全一样。"],
  ] as [string, string, string[], string][];
  const [prompt, ans, wrongs, explain] = cases[rnd(0, 3)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]), explain };
}

// ---- 位置与方向（MK-21）----
function directionStep(): SolveStep {
  const cases = [
    ["🧭 面向北站立，你的右手边是哪个方向？", "东", ["西", "南"], "面朝北时，右手边是东、左手边是西、背后是南。"],
    ["🧭 太阳每天从哪个方向升起？", "东", ["西", "北"], "太阳每天从东方升起、从西方落下。"],
    ["🧭 面向北站立，你的背后是哪个方向？", "南", ["东", "西"], "面朝北时，背后是南、右手边是东、左手边是西。"],
    ["🧭 下午放学时太阳在哪边落下？", "西", ["东", "南"], "太阳从东边升起、西边落下，下午放学时太阳在西边。"],
  ] as [string, string, string[], string][];
  const [prompt, ans, wrongs, explain] = cases[rnd(0, 3)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]), explain };
}

// ---- 单位换算（MK-22）----
function unitStep(): SolveStep {
  const pool = [
    () => { const m = rnd(2, dStep(9, 3)); return { p: `${m} 米等于多少厘米？`, a: m * 100, e: `1 米 = 100 厘米，${m} 米 = ${m} × 100 = ${m * 100} 厘米。` }; },
    () => { const m = rnd(2, dStep(9, 3)); return { p: `${m} 千克等于多少克？`, a: m * 1000, e: `1 千克 = 1000 克，${m} 千克 = ${m} × 1000 = ${m * 1000} 克。` }; },
    () => { const y = rnd(2, dStep(9, 3)); return { p: `${y} 元等于多少角？`, a: y * 10, e: `1 元 = 10 角，${y} 元 = ${y} × 10 = ${y * 10} 角。` }; },
    () => { const cm = rnd(2, dStep(9, 3)) * 10; return { p: `${cm} 厘米等于多少分米？`, a: cm / 10, e: `1 分米 = 10 厘米，${cm} 厘米 = ${cm} ÷ 10 = ${cm / 10} 分米。` }; },
    () => { const m = rnd(2, dStep(9, 3)); return { p: `${m} 千米等于多少米？`, a: m * 1000, e: `1 千米 = 1000 米，${m} 千米 = ${m} × 1000 = ${m * 1000} 米。` }; },
  ];
  const { p, a, e } = pool[rnd(0, pool.length - 1)]();
  return { type: "solve", prompt: `📦 ${p}`, options: numOptions(a), explain: e };
}

// ---- 时间（MK-23）----
function timeStep(): SolveStep {
  if (Math.random() < 0.5) {
    const h1 = rnd(1, 8);
    const h2 = h1 + rnd(1, 4);
    return { type: "solve", prompt: `⏰ 从 ${h1} 时到 ${h2} 时，经过了几小时？`, options: numOptions(h2 - h1), explain: `经过的时间用「后面的时间 - 前面的时间」：${h2} - ${h1} = ${h2 - h1} 小时。` };
  }
  const cases = [
    ["⏰ 1 时等于多少分？", "60", ["100", "30"], "1 时 = 60 分。时针走一大格是 1 小时，分针正好走一整圈 60 分。"],
    ["⏰ 1 分等于多少秒？", "60", ["100", "30"], "1 分 = 60 秒。秒针走一整圈正好是 60 秒。"],
    ["⏰ 分针走一圈是几分钟？", "60", ["30", "12"], "分针走一圈是 60 分钟，也就是 1 小时。"],
  ] as [string, string, string[], string][];
  const [prompt, ans, wrongs, explain] = cases[rnd(0, 2)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]), explain };
}

// ---- 分类整理（MK-24）----
function classifyStep(): SolveStep {
  const cases = [
    ["🗂️ 苹果、香蕉、白菜，哪个和其他两个不是一类？", "白菜", ["苹果", "香蕉"], "苹果和香蕉都是水果，白菜是蔬菜，所以白菜不是一类。"],
    ["🗂️ 小狗、小猫、桌子，哪个和其他两个不是一类？", "桌子", ["小狗", "小猫"], "小狗和小猫都是动物，桌子是家具，所以桌子不是一类。"],
    ["🗂️ 红球、蓝球、红正方体，哪个和其他两个不是一类？", "红正方体", ["红球", "蓝球"], "红球和蓝球都是球，红正方体不是球，所以它不同类。"],
    ["🗂️ 铅笔、尺子、西瓜，哪个和其他两个不是一类？", "西瓜", ["铅笔", "尺子"], "铅笔和尺子都是文具，西瓜是水果，所以西瓜不同类。"],
  ] as [string, string, string[], string][];
  const [prompt, ans, wrongs, explain] = cases[rnd(0, 3)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]), explain };
}

// ---- 统计图（MK-25）----
function chartStep(): SolveStep {
  const cases = [
    ["📊 想一眼看出谁多谁少，用哪种统计图最合适？", "条形统计图", ["统计表", "扇形统计图"], "条形统计图用高低不同的柱子，一眼就能比出谁多谁少。"],
    ["📊 想看出数量随着时间变多还是变少，用哪种最合适？", "折线统计图", ["条形统计图", "统计表"], "折线统计图能看出数量随着时间的变化趋势（变多还是变少）。"],
    ["📊 想看出各部分占整体的百分比，用哪种最合适？", "扇形统计图", ["条形统计图", "折线统计图"], "扇形统计图把整体画成一个圆，能直观看出各部分占整体的百分比。"],
  ] as [string, string, string[], string][];
  const [prompt, ans, wrongs, explain] = cases[rnd(0, 2)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]), explain };
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
    explain: `平均数 = 总和 ÷ 个数。先把糖合起来：${nums.join(" + ")} = ${sum}，再平均分给 ${n} 个人：${sum} ÷ ${n} = ${sum / n} 颗。`,
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
    explain: `哪种球多，摸到它的可能性就越大。红球有 ${r} 个、白球只有 ${w} 个，红球多，所以更容易摸到红球。`,
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
      explain: `重叠的人只能算一次。${a} + ${b} = ${a + b}，但其中 ${c} 人被数了两次，要减去一次：${a} + ${b} - ${c} = ${both}。`,
    };
  }
  if (roll === 1) {
    return {
      type: "solve",
      prompt: `🌀 参加跳绳的有 ${a} 人、参加跑步的有 ${b} 人，两项都参加的有 ${c} 人。至少参加一项的一共几人？`,
      options: numOptions(both),
      explain: `两项都参加的人重叠了，只能算一次。${a} + ${b} = ${a + b}，减去重复的 ${c} 人：${a} + ${b} - ${c} = ${both}。`,
    };
  }
  if (roll === 2) {
    return {
      type: "solve",
      prompt: `🌀 既喜欢吃苹果又喜欢吃香蕉的小朋友，应该把他的名字贴在 Venn 图的哪里？`,
      options: choiceOptions("两个圈重叠的地方", ["只贴苹果圈", "只贴香蕉圈"]),
      explain: `既喜欢苹果又喜欢香蕉的人，同时属于两个圈，应该把他的名字贴在两个圈重叠（交叉）的地方。`,
    };
  }
  return {
    type: "solve",
    prompt: `🌀 图书角有 ${a} 本故事书、${b} 本科学书，其中 ${c} 本两类都有。故事书或科学书一共有几本？`,
    options: numOptions(both),
    explain: `两类都有的书重叠了，只能算一次。${a} + ${b} = ${a + b}，减去重复的 ${c} 本：${a} + ${b} - ${c} = ${both}。`,
  };
}

// ============ 数学广角扩展（MK-29 ~ MK-36）============

// ---- 搭配（MK-29）：排列组合 ----
function pairingStep(): SolveStep {
  const tops = rnd(2, 4);
  const bottoms = rnd(2, 5);
  const total = tops * bottoms;
  const stories = [
    `${tops} 件上衣、${bottoms} 条裤子，一共几种搭配？`,
    `${tops} 个主食、${bottoms} 个菜，选一份主食配一个菜，几种选法？`,
    `${tops} 种颜色上衣、${bottoms} 种颜色裤子，几种穿法？`,
  ];
  return { type: "solve", prompt: `🔀 ${stories[rnd(0, 2)]}`, options: numOptions(total), explain: `搭配用乘法原理：${tops} × ${bottoms} = ${total} 种。每件上衣都能配 ${bottoms} 条裤子，${tops} 件就是 ${tops} 个 ${bottoms}。` };
}

// ---- 推理（MK-30）：逻辑排除 ----
function logicStep(): SolveStep {
  const cases = [
    ["🔍 甲乙丙三人，甲不是最高，乙比丙矮，谁最高？", "丙", ["甲", "乙"], "甲不是最高，排除甲；乙比丙矮，说明丙比乙高。所以丙最高。"],
    ["🔍 小红、小明、小刚分别拿 1/2/3 号。小红不是 1 号，小明说他的号比小红大。小刚是几号？", "1", ["2", "3"], "小红不是 1 号，小明比小红大，说明小明是 3、小红是 2。剩下小刚是 1 号。"],
    ["🔍 甲乙赛跑，甲说「我不是第一」，乙说「我也不是第一」。谁第一？", "都不是", ["甲", "乙"], "甲和乙都不是第一，说明他们之间没有第一……等等，题目有陷阱！这道题的答案是「都不是」——说明还有第三个人。"],
    ["🔍 三个盒子分别装苹果、橘子、香蕉。1 号不是苹果，2 号是橘子。3 号装什么？", "香蕉", ["苹果", "橘子"], "2 号是橘子，1 号不是苹果所以 1 号是香蕉，剩下 3 号是苹果……不对，1 号不是苹果所以 3 号是苹果，1 号是香蕉。"],
  ] as [string, string, string[], string][];
  const [prompt, ans, wrongs, explain] = cases[rnd(0, 3)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]), explain };
}

// ---- 优化（MK-31）：运筹合理安排 ----
function optimizeStep(): SolveStep {
  const cases = [
    ["⚡ 烧水 10 分钟（同时可洗茶杯 2 分钟），最快几分钟喝到茶？", "10", ["12", "8"], "烧水的 10 分钟里可以同时洗茶杯，不需要额外时间。所以最快 10 分钟。"],
    ["⚡ 烙饼，每面 3 分钟，锅每次放 2 张。烙 3 张饼最少几分钟？", "9", ["12", "6"], "3 张饼 6 个面，每次烙 2 个面需 3 分钟。交叉烙：①正②正→①反③正→②反③反，共 9 分钟。"],
    ["⚡ 沏茶：洗水壶 1 分、烧水 10 分、洗茶杯 1 分、拿茶叶 1 分，最快几分？", "11", ["13", "10"], "洗水壶 1 分，烧水 10 分（同时洗茶杯、拿茶叶），共 11 分钟。"],
  ] as [string, string, string[], string][];
  const [prompt, ans, wrongs, explain] = cases[rnd(0, 2)];
  return { type: "solve", prompt, options: choiceOptions(ans, [wrongs[0], wrongs[1]]), explain };
}

// ---- 鸡兔同笼（MK-32）：假设法 ----
function cageStep(): SolveStep {
  const rabbits = rnd(2, 6);
  const chickens = rnd(2, 6);
  const heads = rabbits + chickens;
  const legs = rabbits * 4 + chickens * 2;
  const askRabbits = Math.random() < 0.5;
  return {
    type: "solve",
    prompt: `🐔 鸡兔同笼，${heads} 个头、${legs} 只脚，${askRabbits ? "兔" : "鸡"}有几只？`,
    options: numOptions(askRabbits ? rabbits : chickens),
    explain: `假设全是鸡：${heads} × 2 = ${heads * 2} 只脚，多出 ${legs - heads * 2} 只脚。每只兔比鸡多 2 只脚，所以兔 = ${Math.floor((legs - heads * 2) / 2)} 只，鸡 = ${heads - Math.floor((legs - heads * 2) / 2)} 只。`,
  };
}

// ---- 植树问题（MK-33）：间隔与棵数 ----
function treeStep(): SolveStep {
  const roll = rnd(0, 2);
  if (roll === 0) {
    const len = rnd(2, 8) * 5;
    const gap = 5;
    const trees = len / gap + 1;
    return { type: "solve", prompt: `🌳 ${len} 米路每隔 ${gap} 米栽一棵（两端都栽），共几棵？`, options: numOptions(trees), explain: `两端都栽：棵数 = 间隔数 + 1。${len} ÷ ${gap} = ${len / gap} 个间隔，${len / gap} + 1 = ${trees} 棵。` };
  }
  if (roll === 1) {
    const len = rnd(2, 8) * 5;
    const gap = 5;
    const trees = len / gap - 1;
    return { type: "solve", prompt: `🌳 ${len} 米路每隔 ${gap} 米栽一棵（两端都不栽），共几棵？`, options: numOptions(Math.max(0, trees)), explain: `两端都不栽：棵数 = 间隔数 - 1。${len} ÷ ${gap} = ${len / gap} 个间隔，${len / gap} - 1 = ${Math.max(0, trees)} 棵。` };
  }
  const len = rnd(2, 8) * 5;
  const gap = 5;
  const trees = len / gap;
  return { type: "solve", prompt: `🌳 ${len} 米圆形花坛每隔 ${gap} 米栽一棵，共几棵？`, options: numOptions(trees), explain: `封闭图形（圆形）：棵数 = 间隔数。${len} ÷ ${gap} = ${trees} 棵。` };
}

// ---- 找次品（MK-34）：三分最优策略 ----
function defectiveStep(): SolveStep {
  const n = [3, 4, 5, 6, 7, 8, 9][rnd(0, 6)];
  const times = Math.ceil(Math.log(n) / Math.log(3));
  return {
    type: "solve",
    prompt: `⚖️ ${n} 个球里有 1 个较轻，用天平至少称几次保证找到？`,
    options: choiceOptions(String(times), [String(Math.max(1, times - 1)), String(times + 1)]),
    explain: `三分法：每次把物品尽量均分 3 份，称一次缩小到 1/3。${n} 个球需 ${times} 次（3^${times} ≥ ${n}）。`,
  };
}

// ---- 数与形（MK-35）：数形结合 ----
function numShapeStep(): SolveStep {
  const n = rnd(3, 7);
  const sum = n * n;
  return {
    type: "solve",
    prompt: `🔲 从 1 开始连续 ${n} 个奇数相加：1+3+5+${n > 3 ? "…+" : ""}${n > 3 ? `${2 * n - 1}` : ""} = ?（想想正方形点阵）`,
    options: numOptions(sum),
    explain: `连续奇数的和 = 奇数个数的平方。${n} 个奇数从 1 加到 ${2 * n - 1}，和 = ${n}² = ${sum}。`,
  };
}

// ---- 鸽巢问题（MK-36）：抽屉原理 ----
function pigeonholeStep(): SolveStep {
  const items = rnd(4, 8);
  const boxes = items - rnd(1, 3);
  const min = Math.ceil(items / boxes);
  return {
    type: "solve",
    prompt: `🕊️ ${items} 只鸽子飞进 ${boxes} 个巢，至少有一个巢里有几只？`,
    options: numOptions(min),
    explain: `抽屉原理：${items} 只鸽子分进 ${boxes} 个巢，至少有一个巢有 ⌈${items}÷${boxes}⌉ = ${min} 只。`,
  };
}

// ============ 数与代数补缺（MK-37 ~ MK-38）============

// ---- 因数倍数（MK-37）----
function factorStep(): SolveStep {
  const roll = rnd(0, 2);
  if (roll === 0) {
    const n = [6, 8, 10, 12, 16, 18, 20, 24][rnd(0, 7)];
    const count = countFactors(n);
    return { type: "solve", prompt: `🔗 ${n} 的因数有几个？`, options: numOptions(count), explain: `找 ${n} 的因数：成对找，1×${n}、${n > 4 ? `2×${n / 2}、` : ""}…共 ${count} 个。` };
  }
  if (roll === 1) {
    const cases = [["7", "质数", ["合数", "偶数"], "7 只有 1 和 7 两个因数，所以是质数。"], ["9", "合数", ["质数", "偶数"], "9 有 1、3、9 三个因数，所以是合数。"], ["2", "质数", ["合数", "奇数"], "2 只有 1 和 2 两个因数，是最小的质数，也是唯一的偶质数。"]] as [string, string, string[], string][];
    const [n, ans, wrongs, explain] = cases[rnd(0, 2)];
    return { type: "solve", prompt: `🔗 ${n} 是什么数？`, options: choiceOptions(ans, [wrongs[0], wrongs[1]]), explain };
  }
  const a = [6, 8, 12][rnd(0, 2)];
  const b = [4, 6, 9][rnd(0, 2)];
  const lcm = lcmOf(a, b);
  return { type: "solve", prompt: `🔗 ${a} 和 ${b} 的最小公倍数是几？`, options: numOptions(lcm), explain: `最小公倍数是两个数公有的最小倍数。${a} 和 ${b} 的最小公倍数是 ${lcm}。` };
}

function countFactors(n: number): number {
  let c = 0;
  for (let i = 1; i * i <= n; i++) if (n % i === 0) c += i * i === n ? 1 : 2;
  return c;
}
function lcmOf(a: number, b: number): number {
  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  return (a * b) / gcd(a, b);
}

// ---- 运算定律（MK-38）----
function lawStep(): SolveStep {
  const roll = rnd(0, 2);
  if (roll === 0) {
    const a = rnd(2, 9) * 10 + 5;
    const b = rnd(2, 9);
    return { type: "solve", prompt: `📋 ${a}+${b}+${100 - a} 等于几？（想想怎么算更快）`, options: numOptions(b + 100 - a + a), explain: `交换律：${a} + ${100 - a} = 100，再加上 ${b} = ${b + 100}。凑整更快！` };
  }
  if (roll === 1) {
    const a = 25;
    const b = 4;
    const c = rnd(3, 9);
    return { type: "solve", prompt: `📋 ${a}×${b}×${c} 等于几？`, options: numOptions(a * b * c), explain: `结合律：先算 ${a}×${b}=${a * b}，再 ${a * b}×${c}=${a * b * c}。` };
  }
  const a = 25;
  const b = 4;
  const c = rnd(3, 9);
  return { type: "solve", prompt: `📋 ${a}×(${b}+${c}) 等于几？`, options: numOptions(a * (b + c)), explain: `分配律：${a}×(${b}+${c}) = ${a}×${b} + ${a}×${c} = ${a * b} + ${a * c} = ${a * b + a * c}。` };
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
  "MK-29": pairingStep,
  "MK-30": logicStep,
  "MK-31": optimizeStep,
  "MK-32": cageStep,
  "MK-33": treeStep,
  "MK-34": defectiveStep,
  "MK-35": numShapeStep,
  "MK-36": pigeonholeStep,
  "MK-37": factorStep,
  "MK-38": lawStep,
};

// ---- 混合题（需要两只精灵联手）----
function comboStep(metas: [string, string], prompt: string, ans: number): SolveStep {
  return { type: "solve", prompt, options: numOptions(ans), requires: [...metas], explain: `这是一道需要两个本领联手的题。跟着题目一步一步算，先算第一步、再算第二步，最后答案是 ${ans}。` };
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

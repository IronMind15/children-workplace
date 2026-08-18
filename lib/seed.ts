import db from "./db";
import type { Monster } from "./types";

// ========== 种子数据：完整小学数学体系（第二阶段 · 属性策略/觉醒）==========
// 29 个元认知 = 29 只精灵 = 29 座岛（含 MK-37 因数倍数；数学广角 8 主题已迁为策略）。
// 除两个起点（计数 MK-01、图形认识 MK-15）外，
// 每个 元认知 都有一只「渡海 Boss」守在它的父知识岛上（分叉：一个岛多个出海口；
// 汇聚：多父知识的 Boss 需要多个前置全部点亮），净化后解锁对应新岛。
// 第二阶段：性质 30（觉醒）/ 策略 19（连招）/ 知识守卫 30（本岛觉醒载体，打赢=觉醒）。

type SeedMonster = {
  id: string; name: string; type: "minion" | "boss" | "hidden"; island: string;
  question: string; correct_meta: string | null; target_meta: string | null;
  prerequisites: string[] | null;
  steps: { type: "discover" | "solve"; prompt: string; options: { label: string; correct?: boolean }[] }[];
};

// ---- 进化算子（边类型）说明文案，用于 Boss 发现题 ----
const OP_HINT: Record<string, string> = {
  聚合: "重复着用、再打包起来",
  反转: "倒过来用",
  等分: "把整体平均分开",
  扩域: "把数的天地向外扩一圈",
  升维: "多长出一个维度",
  抽象: "把具体的数变成符号",
  关系: "拿两个量比一比",
  细化: "把图形看得更细",
  变换: "让图形动起来",
  空间化: "在空间里找准位置",
  分类: "按属性分分组",
  表征: "把数据画成图",
  概率化: "猜一猜可能性",
  重叠: "分着分着发现重叠",
};

export type MetaDef = {
  id: string;
  name: string;        // 元认知名 = 岛名去掉"岛"
  meaning: string;
  domain: string;
  isMvp: number;
  emoji: string;
  /** 进化父边（按主流路径排序，第一条 = Boss 所在岛） */
  parents: { meta: string; op: string }[];
  /** 隐藏彩蛋：无岛、无 Boss，靠好奇心火花解锁挑战（MK-28 已升级为「集合岛」，当前无元认知使用此标记） */
  hidden?: boolean;
  /** Boss 名 */
  bossName: string;
  /** Boss 发现身世（地图 tooltip） */
  bossQuestion: string;
  /** 守恒的解法题（Boss 第二招 & 小怪示例题） */
  quiz: { prompt: string; correct: string; wrong: [string, string] };
  /** 发现题的干扰项（两个别的元认知名） */
  discoverWrong: [string, string];
};

// ================= 28 个元认知（完整小学数学体系，人教版 1~6 年级） =================
export const WORLD_METAS: MetaDef[] = [
  // ---- A. 数与运算（MK-01 ~ MK-10）----
  { id: "MK-01", name: "计数", meaning: "数数的产生", domain: "数与运算", isMvp: 1, emoji: "🐣",
    parents: [], bossName: "", bossQuestion: "",
    quiz: { prompt: "数一数，一共有几颗星星？ ⭐⭐⭐⭐⭐", correct: "5", wrong: ["4", "6"] }, discoverWrong: ["", ""] },
  { id: "MK-02", name: "位值", meaning: "十进制、数位", domain: "数与运算", isMvp: 1, emoji: "🔢",
    parents: [{ meta: "MK-01", op: "聚合" }], bossName: "位值怪", bossQuestion: "数好的果子太多啦，10 个捆成一捆……这是什么新本领？",
    quiz: { prompt: "23 里的 2 在十位，它表示多少？", correct: "20", wrong: ["2", "23"] }, discoverWrong: ["加法", "乘法"] },
  { id: "MK-03", name: "加法", meaning: "合并求总数", domain: "数与运算", isMvp: 1, emoji: "➕",
    parents: [{ meta: "MK-01", op: "聚合" }], bossName: "加法怪", bossQuestion: "两堆果子要合在一起数，这是什么本领？",
    quiz: { prompt: "2 和 3 合起来是几？", correct: "5", wrong: ["4", "6"] }, discoverWrong: ["减法", "乘法"] },
  { id: "MK-04", name: "减法", meaning: "求差/去掉/逆运算", domain: "数与运算", isMvp: 1, emoji: "➖",
    parents: [{ meta: "MK-03", op: "反转" }], bossName: "减法怪", bossQuestion: "我有 5 个果子，拿走了 2 个……这又是什么本领？",
    quiz: { prompt: "5 个果子拿走 2 个，还剩几个？", correct: "3", wrong: ["2", "5"] }, discoverWrong: ["加法", "乘法"] },
  { id: "MK-05", name: "乘法", meaning: "连加的打包", domain: "数与运算", isMvp: 1, emoji: "✖️",
    parents: [{ meta: "MK-03", op: "聚合" }], bossName: "乘法怪", bossQuestion: "3 个 4 加起来好累呀……有没有更快的本领？",
    quiz: { prompt: "3 个 4 是多少？", correct: "12", wrong: ["7", "9"] }, discoverWrong: ["加法", "除法"] },
  { id: "MK-06", name: "除法", meaning: "平均分/逆运算", domain: "数与运算", isMvp: 0, emoji: "➗",
    parents: [{ meta: "MK-05", op: "反转" }], bossName: "除法怪", bossQuestion: "一大袋糖要分给每个人一样多……这要什么本领？",
    quiz: { prompt: "12 个苹果平均分给 3 个小朋友，每人几个？", correct: "4", wrong: ["3", "6"] }, discoverWrong: ["乘法", "减法"] },
  { id: "MK-07", name: "分数", meaning: "部分与整体", domain: "数与运算", isMvp: 0, emoji: "🍕",
    parents: [{ meta: "MK-06", op: "等分" }], bossName: "分数怪", bossQuestion: "1 个蛋糕不够分，切开来每人一份……这是什么本领？",
    quiz: { prompt: "蛋糕平均切成 4 块，吃掉 1 块，吃了几分之几？", correct: "1/4", wrong: ["1/3", "1/2"] }, discoverWrong: ["除法", "小数"] },
  { id: "MK-08", name: "小数", meaning: "十进分数", domain: "数与运算", isMvp: 0, emoji: "🪙",
    parents: [{ meta: "MK-07", op: "扩域" }, { meta: "MK-02", op: "扩域" }], bossName: "小数怪", bossQuestion: "分数搬到十进制的位子上，会变成什么？",
    quiz: { prompt: "3 元 5 角是几元？（用小数表示）", correct: "3.5", wrong: ["35", "5.3"] }, discoverWrong: ["分数", "百分数"] },
  { id: "MK-09", name: "百分数", meaning: "比率（百分之一为单位）", domain: "数与运算", isMvp: 0, emoji: "💯",
    parents: [{ meta: "MK-07", op: "关系" }], bossName: "百分数怪", bossQuestion: "把「整体」定成 100 份来比，这是什么本领？",
    quiz: { prompt: "100 棵树苗种活了 90 棵，成活率是百分之几？", correct: "90%", wrong: ["9%", "900%"] }, discoverWrong: ["分数", "比"] },
  { id: "MK-10", name: "负数", meaning: "相反意义的量", domain: "数与运算", isMvp: 0, emoji: "🌡️",
    parents: [{ meta: "MK-04", op: "扩域" }], bossName: "负数怪", bossQuestion: "零上和零下意思相反，零下怎么记？",
    quiz: { prompt: "零上 5 度记作 +5℃，零下 3 度记作几度？", correct: "-3", wrong: ["3", "+3"] }, discoverWrong: ["减法", "小数"] },
  // ---- B. 数的关系（MK-11 ~ MK-12）----
  { id: "MK-11", name: "比", meaning: "两个量的比值关系", domain: "数的关系", isMvp: 0, emoji: "⚖️",
    parents: [{ meta: "MK-06", op: "关系" }], bossName: "比怪", bossQuestion: "两个数量除一除，就能比出倍数关系……这是什么本领？",
    quiz: { prompt: "6 个苹果和 3 个橘子，苹果与橘子的比是？", correct: "2:1", wrong: ["1:2", "3:1"] }, discoverWrong: ["除法", "比例"] },
  { id: "MK-12", name: "比例", meaning: "正比例/反比例", domain: "数的关系", isMvp: 0, emoji: "🎯",
    parents: [{ meta: "MK-11", op: "关系" }], bossName: "比例怪", bossQuestion: "两个比牵起手来相等，就组成了什么？",
    quiz: { prompt: "3 支铅笔 6 元，买 9 支同样的铅笔要几元？", correct: "18", wrong: ["9", "12"] }, discoverWrong: ["比", "分数"] },
  // ---- C. 代数初步（MK-13 ~ MK-14）----
  { id: "MK-13", name: "字母表示数", meaning: "用符号代表未知量", domain: "代数初步", isMvp: 0, emoji: "🔤",
    parents: [{ meta: "MK-03", op: "抽象" }, { meta: "MK-04", op: "抽象" }], bossName: "字母怪", bossQuestion: "数不知道是多少？那就让字母来当它！",
    quiz: { prompt: "比 x 多 3 的数，怎么表示？", correct: "x+3", wrong: ["3x", "x-3"] }, discoverWrong: ["加法", "方程"] },
  { id: "MK-14", name: "方程", meaning: "等式关系 + 求未知数", domain: "代数初步", isMvp: 0, emoji: "🧩",
    parents: [{ meta: "MK-13", op: "抽象" }], bossName: "方程怪", bossQuestion: "把不知道的数放进等式里，就能把它解出来！",
    quiz: { prompt: "x + 4 = 9，x 是几？", correct: "5", wrong: ["4", "13"] }, discoverWrong: ["字母表示数", "比"] },
  // ---- D. 图形与几何（MK-15 ~ MK-21）----
  { id: "MK-15", name: "图形认识", meaning: "平面/立体图形的特征", domain: "图形与几何", isMvp: 0, emoji: "🔷",
    parents: [], bossName: "", bossQuestion: "",
    quiz: { prompt: "下面哪个图形有 3 条边？", correct: "三角形", wrong: ["正方形", "圆形"] }, discoverWrong: ["", ""] },
  { id: "MK-16", name: "角", meaning: "两条射线的开合", domain: "图形与几何", isMvp: 0, emoji: "📐",
    parents: [{ meta: "MK-15", op: "细化" }], bossName: "角怪", bossQuestion: "把图形看得再细一点，两条边张开就形成了什么？",
    quiz: { prompt: "直角是多少度？", correct: "90°", wrong: ["45°", "180°"] }, discoverWrong: ["图形认识", "周长"] },
  { id: "MK-17", name: "周长", meaning: "一维边界的度量", domain: "图形与几何", isMvp: 0, emoji: "📏",
    parents: [{ meta: "MK-15", op: "升维" }], bossName: "周长怪", bossQuestion: "沿着图形的边走一整圈，走出了一条什么？",
    quiz: { prompt: "边长 5 厘米的正方形，周长是多少厘米？", correct: "20", wrong: ["25", "10"] }, discoverWrong: ["图形认识", "面积"] },
  { id: "MK-18", name: "面积", meaning: "二维大小的度量", domain: "图形与几何", isMvp: 0, emoji: "🟩",
    parents: [{ meta: "MK-17", op: "升维" }], bossName: "面积怪", bossQuestion: "给图形铺满小方块，铺了多少就是它的什么？",
    quiz: { prompt: "长 6 厘米、宽 4 厘米的长方形，面积是多少平方厘米？", correct: "24", wrong: ["20", "10"] }, discoverWrong: ["周长", "体积"] },
  { id: "MK-19", name: "体积", meaning: "三维空间的度量", domain: "图形与几何", isMvp: 0, emoji: "🧊",
    parents: [{ meta: "MK-18", op: "升维" }], bossName: "体积怪", bossQuestion: "往立体图形里装小方块，装多少是它的什么？",
    quiz: { prompt: "棱长 3 厘米的正方体，体积是多少立方厘米？", correct: "27", wrong: ["9", "18"] }, discoverWrong: ["面积", "周长"] },
  { id: "MK-20", name: "图形运动", meaning: "平移/旋转/对称", domain: "图形与几何", isMvp: 0, emoji: "🔄",
    parents: [{ meta: "MK-15", op: "变换" }], bossName: "运动怪", bossQuestion: "图形们不老实，会平移、会旋转、会翻跟头！",
    quiz: { prompt: "电梯上上下下地移动，是哪种运动？", correct: "平移", wrong: ["旋转", "对称"] }, discoverWrong: ["图形认识", "角"] },
  { id: "MK-21", name: "位置与方向", meaning: "空间方位/数对坐标", domain: "图形与几何", isMvp: 0, emoji: "🧭",
    parents: [{ meta: "MK-15", op: "空间化" }], bossName: "方向怪", bossQuestion: "在知识的海洋里航行，先要学会什么？",
    quiz: { prompt: "面向北站立，你的右手边是哪个方向？", correct: "东", wrong: ["西", "南"] }, discoverWrong: ["图形认识", "图形运动"] },
  // ---- E. 量与测量（MK-22 ~ MK-23）----
  { id: "MK-22", name: "单位换算", meaning: "长度/质量/时间/货币换算", domain: "量与测量", isMvp: 0, emoji: "📦",
    parents: [{ meta: "MK-02", op: "扩域" }], bossName: "换算怪", bossQuestion: "米变厘米、元变角……十进制搬家到单位上！",
    quiz: { prompt: "3 米等于多少厘米？", correct: "300", wrong: ["30", "3000"] }, discoverWrong: ["位值", "小数"] },
  { id: "MK-23", name: "时间", meaning: "时刻与经过时间", domain: "量与测量", isMvp: 0, emoji: "⏰",
    parents: [{ meta: "MK-01", op: "聚合" }], bossName: "时间怪", bossQuestion: "秒聚成分、分聚成时……数数数出了新进制！",
    quiz: { prompt: "从 3 时到 5 时，经过了几小时？", correct: "2", wrong: ["3", "5"] }, discoverWrong: ["计数", "单位换算"] },
  // ---- F. 统计与概率（MK-24 ~ MK-27）----
  { id: "MK-24", name: "分类整理", meaning: "数据收集与分类", domain: "统计与概率", isMvp: 0, emoji: "🗂️",
    parents: [{ meta: "MK-01", op: "分类" }], bossName: "分类怪", bossQuestion: "数东西之前，先把一样的东西归成堆！",
    quiz: { prompt: "苹果、香蕉、白菜，哪个和其他两个不是一类？", correct: "白菜", wrong: ["苹果", "香蕉"] }, discoverWrong: ["计数", "统计图"] },
  { id: "MK-25", name: "统计图", meaning: "条形/折线/扇形", domain: "统计与概率", isMvp: 0, emoji: "📊",
    parents: [{ meta: "MK-24", op: "表征" }], bossName: "图表怪", bossQuestion: "整理好的数据画成图，一眼就看明白！",
    quiz: { prompt: "想一眼看出谁多谁少，用哪种统计图最合适？", correct: "条形统计图", wrong: ["统计表", "扇形统计图"] }, discoverWrong: ["分类整理", "平均数"] },
  { id: "MK-26", name: "平均数", meaning: "集中趋势", domain: "统计与概率", isMvp: 0, emoji: "🧮",
    parents: [{ meta: "MK-03", op: "聚合" }, { meta: "MK-06", op: "等分" }], bossName: "平均怪", bossQuestion: "先合起来再平均分，就能代表大家的水平！",
    quiz: { prompt: "3 个小朋友分别有 4、5、6 颗糖，平均每人几颗？", correct: "5", wrong: ["4", "6"] }, discoverWrong: ["加法", "除法"] },
  { id: "MK-27", name: "可能性", meaning: "概率直觉", domain: "统计与概率", isMvp: 0, emoji: "🎲",
    parents: [{ meta: "MK-24", op: "概率化" }], bossName: "可能怪", bossQuestion: "有些事一定会发生，有些事说不准……",
    quiz: { prompt: "袋子里有 10 个红球和 1 个白球，更容易摸到哪种球？", correct: "红球", wrong: ["白球", "一样容易"] }, discoverWrong: ["分类整理", "统计图"] },
  // ---- G. 数学广角（MK-28，独立成「集合岛」）----
  { id: "MK-28", name: "集合", meaning: "重叠关系（容斥）", domain: "数学广角", isMvp: 0, emoji: "🌀",
    parents: [{ meta: "MK-24", op: "重叠" }], bossName: "集合怪", bossQuestion: "分着分着，有两堆东西重叠了……",
    quiz: { prompt: "既喜欢吃苹果又喜欢吃香蕉的小朋友，该放在哪个圈里？", correct: "两个圈重叠的部分", wrong: ["只放苹果圈", "只放香蕉圈"] }, discoverWrong: ["分类整理", "统计图"] },
  // ---- H. 数与代数补缺（MK-37 因数倍数，真元认知）----
  { id: "MK-37", name: "因数倍数", meaning: "质数合数、公因数公倍数", domain: "数与运算", isMvp: 0, emoji: "🔗",
    parents: [{ meta: "MK-05", op: "关系" }, { meta: "MK-02", op: "细化" }], bossName: "因数怪", bossQuestion: "6 = 1×6 = 2×3……每个数都有自己的因数！",
    quiz: { prompt: "12 的因数有几个？", correct: "6", wrong: ["4", "5"] }, discoverWrong: ["乘法", "位值"] },
];

// ================= 进化边（DAG，允许多父交叉 = 知识迁移） =================
let edgeSeq = 0;
export const WORLD_EDGES = WORLD_METAS.flatMap((m) =>
  m.parents.map((p) => ({
    id: `E-${String(++edgeSeq).padStart(2, "0")}`,
    from_meta: p.meta,
    to_meta: m.id,
    operator: p.op,
    is_primary: 1,
  }))
);

// 边 id 与老库 v1（E-01~E-04）保持一致，避免重复
// E-01: 01→03 聚合, E-02: 03→04 反转, E-03: 03→05 聚合, E-04: 01→02 聚合

export const WORLD_SPIRITS = WORLD_METAS.map((m) => ({
  id: `SP-${m.id.slice(3)}`,
  meta_id: m.id,
  emoji: m.emoji,
  nickname: `${m.name}精灵`,
}));

// ============ 第二阶段 · 性质（30 条，觉醒路线） ============
const metaName = (id: string) => WORLD_METAS.find((m) => m.id === id)?.name ?? id;
// order = 觉醒顺序；requiredLevel = 等级门槛（第 1 条 Lv2、第 2 条 Lv3、第 3 条 Lv4）
// spawnMode: fixed（单精灵 → 本岛必现）/ random（多精灵 → 相关岛随机现身 + 广播）
export type PropertySeed = {
  id: string;
  name: string;
  belongsTo: string[];      // 依附元认知（多精灵 = 觉醒联手）
  order: number;            // 觉醒顺序
  requiredLevel: number;    // 等级门槛
  spawnMode: "fixed" | "random";
  explain: string;
};

export const WORLD_PROPERTIES: PropertySeed[] = [
  // ---- 数与运算 ----
  { id: "PP-01", name: "加法交换律", belongsTo: ["MK-03"], order: 1, requiredLevel: 2, spawnMode: "fixed", explain: "换序和不变：a+b = b+a。凑整更快！" },
  { id: "PP-02", name: "加法结合律", belongsTo: ["MK-03"], order: 2, requiredLevel: 3, spawnMode: "fixed", explain: "先加谁和不变：(a+b)+c = a+(b+c)。" },
  { id: "PP-03", name: "乘法交换律", belongsTo: ["MK-05"], order: 1, requiredLevel: 2, spawnMode: "fixed", explain: "换序积不变：a×b = b×a。" },
  { id: "PP-04", name: "乘法结合律", belongsTo: ["MK-05"], order: 2, requiredLevel: 3, spawnMode: "fixed", explain: "先乘谁积不变：(a×b)×c = a×(b×c)。" },
  { id: "PP-05", name: "乘法分配律", belongsTo: ["MK-05", "MK-03"], order: 3, requiredLevel: 4, spawnMode: "random", explain: "乘开括号：a×(b+c) = a×b + a×c。" },
  { id: "PP-06", name: "等式性质", belongsTo: ["MK-14", "MK-13"], order: 1, requiredLevel: 2, spawnMode: "random", explain: "两边同加减乘除，等式仍成立（解方程的钥匙）。" },
  { id: "PP-07", name: "商不变规律", belongsTo: ["MK-06", "MK-11"], order: 1, requiredLevel: 2, spawnMode: "random", explain: "被除数除数同乘同除，商不变。" },
  { id: "PP-08", name: "分数的基本性质", belongsTo: ["MK-07"], order: 1, requiredLevel: 2, spawnMode: "fixed", explain: "分子分母同乘同除，分数大小不变（约分通分依据）。" },
  { id: "PP-09", name: "运算优先级", belongsTo: ["MK-03", "MK-04", "MK-05", "MK-06"], order: 1, requiredLevel: 2, spawnMode: "random", explain: "先乘除后加减，同级从左到右。" },
  { id: "PP-10", name: "减法性质", belongsTo: ["MK-04"], order: 1, requiredLevel: 2, spawnMode: "fixed", explain: "连减 = 减去它们的和：a-b-c = a-(b+c)。" },
  { id: "PP-11", name: "小数的性质", belongsTo: ["MK-08", "MK-02"], order: 1, requiredLevel: 2, spawnMode: "random", explain: "末尾添 0 / 去 0，大小不变：3.5 = 3.50。" },
  { id: "PP-12", name: "整除特征", belongsTo: ["MK-37"], order: 1, requiredLevel: 2, spawnMode: "fixed", explain: "2 / 5 / 3 / 9 的倍数特征（看个位、看数字和）。" },
  { id: "PP-13", name: "质数与合数", belongsTo: ["MK-37"], order: 2, requiredLevel: 3, spawnMode: "fixed", explain: "质数只有 1 和它本身两个因数；合数至少三个。" },
  { id: "PP-14", name: "百分数互化", belongsTo: ["MK-09", "MK-07"], order: 1, requiredLevel: 2, spawnMode: "random", explain: "百分数 ↔ 分数 / 小数 的转换规则。" },
  { id: "PP-15", name: "十进制规则", belongsTo: ["MK-02"], order: 1, requiredLevel: 2, spawnMode: "fixed", explain: "逢十进一，满十向高位移一。" },
  // ---- 数的关系与代数 ----
  { id: "PP-16", name: "比的基本性质", belongsTo: ["MK-11"], order: 1, requiredLevel: 2, spawnMode: "fixed", explain: "前项后项同乘同除，比值不变（化简比依据）。" },
  { id: "PP-17", name: "比例的基本性质", belongsTo: ["MK-12"], order: 1, requiredLevel: 2, spawnMode: "fixed", explain: "内项积 = 外项积（解比例的钥匙）。" },
  // ---- 图形与几何 ----
  { id: "PP-18", name: "三角形内角和 = 180°", belongsTo: ["MK-16", "MK-15"], order: 1, requiredLevel: 2, spawnMode: "random", explain: "任何三角形三个角加起来都是 180°。" },
  { id: "PP-19", name: "圆周长 = 2πr", belongsTo: ["MK-17", "MK-15"], order: 1, requiredLevel: 2, spawnMode: "random", explain: "圆的一圈 = 直径 × π。" },
  { id: "PP-20", name: "圆面积 = πr²", belongsTo: ["MK-18", "MK-17"], order: 1, requiredLevel: 2, spawnMode: "random", explain: "圆的面积 = 半径平方 × π。" },
  { id: "PP-21", name: "面积公式推导链", belongsTo: ["MK-18"], order: 2, requiredLevel: 3, spawnMode: "fixed", explain: "平行四边形割补成长方形 → 三角形 / 梯形各取一半。" },
  { id: "PP-22", name: "圆柱与圆锥体积关系", belongsTo: ["MK-19", "MK-18"], order: 1, requiredLevel: 2, spawnMode: "random", explain: "等底等高时，圆锥体积 = 圆柱的 1/3。" },
  { id: "PP-23", name: "图形变换不变性", belongsTo: ["MK-20"], order: 1, requiredLevel: 2, spawnMode: "fixed", explain: "平移 / 旋转 / 对称不改变形状与大小。" },
  // ---- 量与测量 ----
  { id: "PP-24", name: "进率规律", belongsTo: ["MK-22", "MK-02"], order: 1, requiredLevel: 2, spawnMode: "random", explain: "相邻单位：长度 ×10、面积 ×100、体积 / 质量 ×1000。" },
  { id: "PP-25", name: "时间进制", belongsTo: ["MK-23"], order: 1, requiredLevel: 2, spawnMode: "fixed", explain: "60 秒 = 1 分、60 分 = 1 时（不是十进制！）。" },
  // ---- 统计与概率 ----
  { id: "PP-26", name: "平均数关系", belongsTo: ["MK-26", "MK-06"], order: 1, requiredLevel: 2, spawnMode: "random", explain: "总和 = 平均数 × 个数（移多补少的量化）。" },
  { id: "PP-27", name: "中位数", belongsTo: ["MK-26"], order: 2, requiredLevel: 3, spawnMode: "fixed", explain: "有序数据最中间的值，代表「中间水平」。" },
  { id: "PP-28", name: "众数", belongsTo: ["MK-26"], order: 3, requiredLevel: 4, spawnMode: "fixed", explain: "出现次数最多的值，代表「大多数水平」。" },
  { id: "PP-29", name: "概率范围", belongsTo: ["MK-27"], order: 1, requiredLevel: 2, spawnMode: "fixed", explain: "概率在 0~1 之间；必然 = 1，不可能 = 0。" },
  // ---- 数学广角 ----
  { id: "PP-30", name: "容斥规则", belongsTo: ["MK-28", "MK-24"], order: 1, requiredLevel: 2, spawnMode: "random", explain: "重叠部分只能数一次（韦恩图计数）。" },
];

// ============ 第二阶段 · 策略（19 条，连招/思想方法） ============
export type StrategySeed = { id: string; name: string; effect: string; tier: number };

export const WORLD_STRATEGIES: StrategySeed[] = [
  { id: "ST-01", name: "简算", effect: "凑整、凑十，配合运算律", tier: 1 },
  { id: "ST-02", name: "验算", effect: "反向检查结果", tier: 1 },
  { id: "ST-03", name: "估算", effect: "近似判断范围", tier: 1 },
  { id: "ST-04", name: "画图", effect: "线段图、数形结合", tier: 1 },
  { id: "ST-05", name: "逆向", effect: "从结果倒推", tier: 1 },
  { id: "ST-06", name: "找规律", effect: "模式识别", tier: 1 },
  { id: "ST-07", name: "括号", effect: "人为改变运算优先级", tier: 1 },
  { id: "ST-08", name: "搭配", effect: "有序列举 / 乘法计数原理", tier: 1 },
  { id: "ST-09", name: "推理", effect: "逻辑排除（数独 / 排除法）", tier: 1 },
  { id: "ST-10", name: "优化", effect: "统筹最省（同时做、不空等）", tier: 1 },
  { id: "ST-11", name: "假设", effect: "鸡兔同笼假设法（全设为 A，看差补）", tier: 1 },
  { id: "ST-12", name: "化归", effect: "植树问题间隔模型（棵数 = 段数 ± 1）", tier: 1 },
  { id: "ST-13", name: "三分", effect: "找次品天平最优策略", tier: 1 },
  { id: "ST-14", name: "数形结合", effect: "数与形互译（平方数点阵等）", tier: 1 },
  { id: "ST-15", name: "抽屉", effect: "鸽巢原理（至少 / 必有）", tier: 1 },
  { id: "ST-16", name: "归一归总", effect: "先求 1 份量 / 先求总量", tier: 2 },
  { id: "ST-17", name: "行程", effect: "路程 = 速度 × 时间（相遇 / 追及）", tier: 2 },
  { id: "ST-18", name: "和差倍", effect: "线段图 + 和差 / 和倍公式", tier: 2 },
  { id: "ST-19", name: "工程", effect: "总量设为 1，工效相加", tier: 2 },
];

// ============ 知识守卫（由性质派生：打赢守卫 = 觉醒该性质） ============
export type GuardSeed = {
  id: string;
  name: string;
  type: "guard";
  island: string;
  question: string;
  correct_meta: string | null;
  target_meta: string | null;
  prerequisites: string[] | null;
  required_metas: string[];   // 需要哪些精灵达标（多精灵守卫）
  required_level: number;     // 等级门槛
  spawn_mode: "fixed" | "random";
  spawn_islands: string[];    // 随机现身池
  steps: { type: "solve"; prompt: string; options: { label: string; correct?: boolean }[] }[];
};

/** 由性质派生守卫：fixed → 主岛必现；random → 相关岛随机现身 */
export const WORLD_GUARDS: GuardSeed[] = WORLD_PROPERTIES.map((p) => {
  const islands = p.belongsTo.map((m) => `${metaName(m)}岛`);
  return {
    id: `guard-${p.id.toLowerCase().replace("=", "").replace("π", "pi").replace("²", "2")}`,
    name: `${p.name}守卫`,
    type: "guard" as const,
    island: islands[0],
    question: `${p.name}的觉醒考验！打赢它，${p.name}就真正属于你了！`,
    correct_meta: p.belongsTo[0],
    target_meta: null,
    prerequisites: p.belongsTo,
    required_metas: p.belongsTo,
    required_level: p.requiredLevel,
    spawn_mode: p.spawnMode,
    spawn_islands: islands,
    steps: [{ type: "solve", prompt: p.explain, options: [{ label: "我明白了", correct: true }] }],
  };
});

const islandOf = (m: MetaDef) => `${m.name}岛`;

/** 由元认知定义生成 Boss：守在「最深」父知识的岛上（分叉），前置 = 全部父知识（汇聚） */
function bossOf(m: MetaDef): SeedMonster {
  const parentNames = m.parents.map((p) => metaName(p.meta));
  const ops = [...new Set(m.parents.map((p) => p.op))];
  const host = m.parents.reduce((best, p) => (depthOf(p.meta) > depthOf(best.meta) ? p : best), m.parents[0]);
  const discover = {
    type: "discover" as const,
    prompt: `把「${parentNames.join("」和「")}」的本领${ops.map((o) => OP_HINT[o] ?? o).join("再")}，长出来的新本领叫什么？`,
    options: shuffleOptions(m.name, m.discoverWrong),
  };
  const solve = {
    type: "solve" as const,
    prompt: m.quiz.prompt,
    options: shuffleOptions(m.quiz.correct, m.quiz.wrong),
  };
  return {
    id: `boss-${m.id.toLowerCase()}`,
    name: m.bossName,
    type: "boss",
    island: `${metaName(host.meta)}岛`,
    question: m.bossQuestion,
    correct_meta: null,
    target_meta: m.id,
    prerequisites: m.parents.map((p) => p.meta),
    steps: [discover, solve],
  };
}

/** 知识图谱里的深度（起点=0）：Boss 守在最深父知识的岛上 */
function depthOf(metaId: string): number {
  const m = WORLD_METAS.find((x) => x.id === metaId);
  if (!m || m.parents.length === 0) return 0;
  return 1 + Math.max(...m.parents.map((p) => depthOf(p.meta)));
}

function shuffleOptions(correct: string, wrongs: string[]): { label: string; correct?: boolean }[] {
  const opts = [
    { label: correct, correct: true },
    ...wrongs.filter(Boolean).map((w) => ({ label: w })),
  ];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

/** 每座岛 2 只训练小怪（战斗时按知识点现场随机出题，这里的 steps 只是兜底示例） */
function minionsOf(m: MetaDef): SeedMonster[] {
  const names = [`${m.name}小怪`, `${m.name}小兵`];
  return names.map((name, i) => ({
    id: `minion-${m.id.toLowerCase()}-${i + 1}`,
    name,
    type: "minion" as const,
    island: islandOf(m),
    question: `在${islandOf(m)}上溜达的${m.name}训练小怪！`,
    correct_meta: m.id,
    target_meta: null,
    prerequisites: null,
    steps: [
      { type: "solve", prompt: m.quiz.prompt, options: shuffleOptions(m.quiz.correct, m.quiz.wrong) },
    ],
  }));
}

const monsters: SeedMonster[] = [
  ...WORLD_METAS.filter((m) => m.parents.length > 0 && !m.hidden).map(bossOf),
  ...WORLD_METAS.filter((m) => !m.hidden).flatMap(minionsOf),
];

// ---- 早期手工内容（保留，老玩家的岛更有味道） ----
const legacyMonsters: SeedMonster[] = [
  {
    id: "minion-add-01", name: "加法小怪", type: "minion", island: "加法岛",
    question: "3 + 5 = ?", correct_meta: "MK-03", target_meta: null, prerequisites: null,
    steps: [{ type: "solve", prompt: "3 + 5 等于几？", options: shuffleOptions("8", ["7", "9"]) }],
  },
  {
    id: "minion-add-02", name: "苹果小怪", type: "minion", island: "加法岛",
    question: "小明有 3 个苹果，又买了 5 个，一共几个？", correct_meta: "MK-03", target_meta: null, prerequisites: null,
    steps: [{ type: "solve", prompt: "一共几个苹果？", options: shuffleOptions("8", ["7", "9"]) }],
  },
  {
    id: "minion-sub-01", name: "减法小怪", type: "minion", island: "减法岛",
    question: "8 - 3 = ?", correct_meta: "MK-04", target_meta: null, prerequisites: null,
    steps: [{ type: "solve", prompt: "8 - 3 等于几？", options: shuffleOptions("5", ["6", "4"]) }],
  },
  {
    id: "minion-sub-02", name: "吃苹果小怪", type: "minion", island: "减法岛",
    question: "有 8 个苹果，吃了 3 个，还剩几个？", correct_meta: "MK-04", target_meta: null, prerequisites: null,
    steps: [{ type: "solve", prompt: "还剩几个苹果？", options: shuffleOptions("5", ["3", "8"]) }],
  },
  {
    id: "minion-mul-01", name: "乘法小怪", type: "minion", island: "乘法岛",
    question: "3 × 4 = ?", correct_meta: "MK-05", target_meta: null, prerequisites: null,
    steps: [{ type: "solve", prompt: "3 × 4 等于几？", options: shuffleOptions("12", ["7", "9"]) }],
  },
  {
    id: "minion-mul-02", name: "桌子小怪", type: "minion", island: "乘法岛",
    question: "3 排桌子，每排 4 张，一共几张？", correct_meta: "MK-05", target_meta: null, prerequisites: null,
    steps: [{ type: "solve", prompt: "一共几张桌子？", options: shuffleOptions("12", ["7", "9"]) }],
  },
  {
    id: "minion-count-01", name: "数苹果小怪", type: "minion", island: "计数岛",
    question: "篮子里的苹果数得清吗？", correct_meta: "MK-01", target_meta: null, prerequisites: null,
    steps: [{ type: "solve", prompt: "数一数，一共几个苹果？ 🍎🍎🍎🍎🍎", options: shuffleOptions("5", ["4", "6"]) }],
  },
  {
    id: "minion-count-02", name: "小鸡小怪", type: "minion", island: "计数岛",
    question: "草地上毛茸茸的小鸡排队啦！", correct_meta: "MK-01", target_meta: null, prerequisites: null,
    steps: [{ type: "solve", prompt: "数一数，一共几只小鸡？ 🐥🐥🐥🐥🐥🐥🐥", options: shuffleOptions("7", ["6", "8"]) }],
  },
];

// 默认探险家（单机，无登录）
const defaultExplorer = { id: "default", name: "", brain_settings: null, current_island: "计数岛" };

// ---- 神秘小怪（type=hidden）：靠"好奇心火花"解锁，出现在对应岛屿 ----
// 关键约束（v1.5.2）：隐藏小怪一律 correct_meta=null，走 fun 战斗（不引导选精灵），
// 问题均为生活/好奇/趣味类，与知识验收完全解耦；奖励 = 收集进神秘图鉴。

export type HiddenMeta = {
  spark_cost: number;   // 火花门槛（达到即常驻现身）
  rarity: "普通" | "稀有" | "传说";
  emoji: string;        // 专属形象（先 emoji+配色，后补立绘）
  color: string;        // 稀有度配色
  story: string;        // 彩蛋故事（捕捉后解锁）
};

/** 神秘小怪元数据注册表（id → 门槛/稀有度/形象/彩蛋故事） */
export const HIDDEN_META: Record<string, HiddenMeta> = {
  "minion-why-01": {
    spark_cost: 3, rarity: "普通", emoji: "❓", color: "#8a97a5",
    story: "有一只总爱问「为什么」的小怪物，它问过十万个为什么，最后发现：每个问题都是一扇新世界的小门。",
  },
  "minion-riddle-01": {
    spark_cost: 6, rarity: "普通", emoji: "🎭", color: "#8a97a5",
    story: "谜语小怪是个小话痨，它说：世界上最好的谜语，就是「你猜对的那一刻，笑得最开心」。",
  },
  "minion-star-01": {
    spark_cost: 9, rarity: "普通", emoji: "⭐", color: "#8a97a5",
    story: "星星小怪每晚数星星，数着数着发现：看得见的星星是光，看不见的知识也是光，都在等你去发现。",
  },
  "minion-time-01": {
    spark_cost: 12, rarity: "普通", emoji: "⏰", color: "#8a97a5",
    story: "时间小怪有一块永远不准的怀表，它说：时间不会等你，但努力的时间会变成礼物回来找你。",
  },
  "minion-rainbow-01": {
    spark_cost: 15, rarity: "稀有", emoji: "🌈", color: "#7e57c2",
    story: "彩虹小怪在下雨天收集颜色，它相信：所有不同的颜色合在一起，才是最美的天空。",
  },
  "minion-echo-01": {
    spark_cost: 20, rarity: "稀有", emoji: "🔊", color: "#7e57c2",
    story: "回声小怪住在山谷里，你大声喊，它就大声回；你温柔说，它也温柔回。它说：世界就像回声，你给它什么，它还你什么。",
  },
  "minion-bubble-01": {
    spark_cost: 26, rarity: "稀有", emoji: "🫧", color: "#7e57c2",
    story: "泡泡小怪最爱吹泡泡，它说：一个泡泡破了没关系，再吹一个就好——失败从来不是结束，是下一个开始的泡泡。",
  },
  "minion-glow-01": {
    spark_cost: 33, rarity: "稀有", emoji: "🪲", color: "#7e57c2",
    story: "夜光小怪在黑夜里发光，它说：最黑的地方，星星最亮；最难的题目，学会后最骄傲。",
  },
  "minion-creation-01": {
    spark_cost: 42, rarity: "传说", emoji: "🌌", color: "#e2582e",
    story: "创世小怪是数字世界的守门人。传说它第一个发现：世界上本来没有数字，是人类的好奇心，让「一、二、三…」住进了生活。你也是创造者。",
  },
  "minion-dream-01": {
    spark_cost: 50, rarity: "传说", emoji: "🦋", color: "#e2582e",
    story: "梦蝶小怪会出现在认真思考的孩子梦里。它梦见一道题有一百种解法，醒来说：答案从来不止一个，找到自己最喜欢的那条路，就是最棒的解法。",
  },
};

const hiddenMonsters: SeedMonster[] = [
  {
    id: "minion-why-01", name: "为什么小怪", type: "hidden", island: "加法岛",
    question: "好奇心引来的神秘小怪！答对它，它就会住进你的图鉴～",
    correct_meta: null, target_meta: null, prerequisites: null,
    steps: [
      { type: "solve", prompt: "AI 说的话全是真的吗？", options: shuffleOptions("不一定，要验证", ["全是真的", "全是假的"]) },
    ],
  },
  {
    id: "minion-riddle-01", name: "谜语小怪", type: "hidden", island: "减法岛",
    question: "集满 6 颗火花才出现的谜语大师！",
    correct_meta: null, target_meta: null, prerequisites: null,
    steps: [
      { type: "solve", prompt: "什么东西越分享越多？", options: shuffleOptions("知识", ["糖果", "玩具"]) },
    ],
  },
  {
    id: "minion-star-01", name: "星星小怪", type: "hidden", island: "乘法岛",
    question: "集满 9 颗火花的星空守望者！",
    correct_meta: null, target_meta: null, prerequisites: null,
    steps: [
      { type: "solve", prompt: "3 排星星，每排 4 颗，一共几颗？", options: shuffleOptions("12", ["7", "9"]) },
    ],
  },
  {
    id: "minion-time-01", name: "时间小怪", type: "hidden", island: "时间岛",
    question: "滴答滴答…集满 12 颗火花，它会告诉你时间的小秘密！",
    correct_meta: null, target_meta: null, prerequisites: null,
    steps: [
      { type: "solve", prompt: "1 小时等于几分钟？", options: shuffleOptions("60 分钟", ["30 分钟", "100 分钟"]) },
    ],
  },
  {
    id: "minion-rainbow-01", name: "彩虹小怪", type: "hidden", island: "图形认识岛",
    question: "稀有访客！集满 15 颗火花，来看看它收集的颜色～",
    correct_meta: null, target_meta: null, prerequisites: null,
    steps: [
      { type: "solve", prompt: "彩虹常常在什么时候出现？", options: shuffleOptions("雨后放晴时", ["大晴天", "下雪时"]) },
    ],
  },
  {
    id: "minion-echo-01", name: "回声小怪", type: "hidden", island: "小数岛",
    question: "稀有访客！集满 20 颗火花，它会把你的话送回来～",
    correct_meta: null, target_meta: null, prerequisites: null,
    steps: [
      { type: "solve", prompt: "为什么对着山谷大喊会有回声？", options: shuffleOptions("声音碰到山壁弹回来", ["山谷在学你说话", "风把声音吹回来"]) },
    ],
  },
  {
    id: "minion-bubble-01", name: "泡泡小怪", type: "hidden", island: "百分数岛",
    question: "稀有访客！集满 26 颗火花，来和它一起吹泡泡～",
    correct_meta: null, target_meta: null, prerequisites: null,
    steps: [
      { type: "solve", prompt: "泡泡为什么是圆圆的？", options: shuffleOptions("表面张力让它最省力地变成球", ["被风吹圆的", "天生就圆"]) },
    ],
  },
  {
    id: "minion-glow-01", name: "夜光小怪", type: "hidden", island: "负数岛",
    question: "稀有访客！集满 33 颗火花，它在黑夜里等你～",
    correct_meta: null, target_meta: null, prerequisites: null,
    steps: [
      { type: "solve", prompt: "萤火虫为什么会发光？", options: shuffleOptions("身体里有会发光的化学物质", ["它背着小灯泡", "月光照的"]) },
    ],
  },
  {
    id: "minion-creation-01", name: "创世小怪", type: "hidden", island: "集合岛",
    question: "传说级访客！集满 42 颗火花，去见见数字世界的守门人！",
    correct_meta: null, target_meta: null, prerequisites: null,
    steps: [
      { type: "solve", prompt: "如果世界上没有数字，会发生什么？", options: shuffleOptions("数不清、记不住，生活乱成一团", ["没变化", "人会发明更多数字"]) },
    ],
  },
  {
    id: "minion-dream-01", name: "梦蝶小怪", type: "hidden", island: "面积岛",
    question: "传说级访客！集满 50 颗火花，它会在你的梦里出现～",
    correct_meta: null, target_meta: null, prerequisites: null,
    steps: [
      { type: "solve", prompt: "一道数学题，只能有一种解法吗？", options: shuffleOptions("不是，解法可以有很多种", ["只能有一种", "看题目心情"]) },
    ],
  },
];

/** 每只神秘小怪的火花门槛 / 稀有度 / 形象 / 彩蛋故事（options 字段存 JSON） */
export function requiredSparksOf(id: string): number {
  return HIDDEN_META[id]?.spark_cost ?? 999;
}

/** 隐藏小怪注册表（id → 元数据）；未登记返回 null */
export function hiddenMetaOf(id: string): HiddenMeta | null {
  return HIDDEN_META[id] ?? null;
}

/** 已淘汰的元认知（数学广角 8 主题 → 策略；运算定律 → 性质） */
const RETIRED_METAS = ["MK-29", "MK-30", "MK-31", "MK-32", "MK-33", "MK-34", "MK-35", "MK-36", "MK-38"];
const RETIRED_ISLANDS = ["搭配岛", "推理岛", "优化岛", "鸡兔同笼岛", "植树问题岛", "找次品岛", "数与形岛", "鸽巢问题岛", "运算定律岛"];
/** config 默认值（INSERT OR IGNORE：已有用户调过的值不覆盖） */
function seedConfigDefaults() {
  const defaults: [string, string][] = [
    ["xp_threshold", "3"],        // 每升 1 级需赢的场数
    ["step_base", "4"],           // 每场基础题目数
    ["step_per_level", "1"],      // 每精灵等级 +1 招
    ["step_max", "7"],            // 每场上限
    ["diff_a", "1"],              // 难度：下游岛权重
    ["diff_b", "2"],              // 难度：精灵等级权重
    ["broadcast", "1"],           // 觉醒广播开关
    ["boss_stuck_attempts", "2"], // 卡关阈值（同 Boss 失败次数）
    ["mystery_pity", "5"],        // 神秘保底：每提问 N 次必邂逅
    ["mystery_daily_cap", "3"],   // 每日邂逅上限（防刷）
  ];
  const upsertConfig = db.prepare("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)");
  for (const [k, v] of defaults) upsertConfig.run(k, v);
}

// ============ 静态内容全量导出（供 lib/content.ts 内存查询，DB 不落库） ============

/** 种子怪物/守卫 → DB 形状 Monster（options/steps 等 JSON 序列化，与旧 monster 表列完全一致） */
function toDbMonster(m: SeedMonster | GuardSeed): Monster {
  return {
    id: m.id,
    name: m.name,
    type: m.type,
    island: m.island,
    question: m.question,
    correct_meta: m.correct_meta,
    target_meta: m.target_meta,
    prerequisites: m.prerequisites ? JSON.stringify(m.prerequisites) : null,
    options: m.type === "hidden"
      ? JSON.stringify({
          required_sparks: requiredSparksOf(m.id),
          ...(hiddenMetaOf(m.id) ?? {}),
        })
      : null,
    steps: JSON.stringify(m.steps),
    required_metas: "required_metas" in m && m.required_metas ? JSON.stringify(m.required_metas) : null,
    required_level: "required_level" in m ? (m.required_level ?? null) : null,
    spawn_mode: "spawn_mode" in m ? (m.spawn_mode ?? null) : null,
    spawn_islands: "spawn_islands" in m && m.spawn_islands ? JSON.stringify(m.spawn_islands) : null,
  };
}

/** 全量怪物（Boss/小怪/隐藏/守卫，126 只）—— 与旧 monster 表数据一一对应 */
export const WORLD_MONSTERS: Monster[] = [
  ...monsters.map(toDbMonster),
  ...legacyMonsters.map(toDbMonster),
  ...hiddenMonsters.map(toDbMonster),
  ...WORLD_GUARDS.map(toDbMonster),
];

/**
 * 数据播种（每次页面/action 调用，幂等零开销）：
 * - 表结构与多用户迁移已由 lib/db.ts 模块加载时完成
 * - 这里只补 config 默认值（INSERT OR IGNORE）
 * - 不再创建任何玩家：用户档案由登录页创建
 */
export function seedIfEmpty() {
  seedConfigDefaults();
}

// 兼容旧导出
export const metas = WORLD_METAS.map((m) => ({ id: m.id, name: m.name, meaning: m.meaning, domain: m.domain, is_mvp: m.isMvp }));
export const edges = WORLD_EDGES;
export const spirits = WORLD_SPIRITS;

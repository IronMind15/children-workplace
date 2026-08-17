import db from "./db";

// ========== 种子数据：完整小学数学体系（数学元认知图谱 v0.2）==========
// 28 个元认知 = 28 只精灵 = 28 座岛（含数学广角·集合 MK-28 独立成「集合岛」）。
// 除两个起点（计数 MK-01、图形认识 MK-15）外，
// 每个 元认知 都有一只「渡海 Boss」守在它的父知识岛上（分叉：一个岛多个出海口；
// 汇聚：多父知识的 Boss 需要多个前置全部点亮），净化后解锁对应新岛。

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
  // ---- H. 数学广角扩展（MK-29 ~ MK-36，系统渗透数学思想方法）----
  { id: "MK-29", name: "搭配", meaning: "排列组合、有序列举", domain: "数学广角", isMvp: 0, emoji: "🔀",
    parents: [{ meta: "MK-05", op: "聚合" }], bossName: "搭配怪", bossQuestion: "2 件上衣配 3 条裤子，有几种穿法？有序地数一数！",
    quiz: { prompt: "2 件上衣、3 条裤子，一共几种搭配？", correct: "6", wrong: ["5", "3"] }, discoverWrong: ["乘法", "集合"] },
  { id: "MK-30", name: "推理", meaning: "逻辑推理（排除法）", domain: "数学广角", isMvp: 0, emoji: "🔍",
    parents: [{ meta: "MK-24", op: "分类" }], bossName: "推理怪", bossQuestion: "三个小朋友赛跑，甲不是第一，乙比丙慢……谁是第一？",
    quiz: { prompt: "甲乙丙三人，甲不是最高，乙比丙矮，谁最高？", correct: "丙", wrong: ["甲", "乙"] }, discoverWrong: ["分类整理", "搭配"] },
  { id: "MK-31", name: "优化", meaning: "运筹思想、合理安排", domain: "数学广角", isMvp: 0, emoji: "⚡",
    parents: [{ meta: "MK-23", op: "聚合" }], bossName: "优化怪", bossQuestion: "烧水时可以同时洗茶杯，怎样安排最省时间？",
    quiz: { prompt: "烧水 10 分钟（同时可洗杯子 2 分钟），最快几分钟喝到茶？", correct: "10", wrong: ["12", "8"] }, discoverWrong: ["时间", "搭配"] },
  { id: "MK-32", name: "鸡兔同笼", meaning: "假设建模", domain: "数学广角", isMvp: 0, emoji: "🐔",
    parents: [{ meta: "MK-05", op: "抽象" }, { meta: "MK-04", op: "抽象" }], bossName: "鸡兔怪", bossQuestion: "笼子里有鸡和兔，数头 8 个、数脚 26 只，各几只？",
    quiz: { prompt: "鸡兔同笼，8 头 26 脚，兔有几只？", correct: "5", wrong: ["3", "4"] }, discoverWrong: ["乘法", "减法"] },
  { id: "MK-33", name: "植树问题", meaning: "化归模型（间隔与棵数）", domain: "数学广角", isMvp: 0, emoji: "🌳",
    parents: [{ meta: "MK-05", op: "关系" }], bossName: "植树怪", bossQuestion: "20 米路每隔 5 米栽一棵树，两端都栽，几棵树？",
    quiz: { prompt: "20 米路每 5 米栽一棵（两端都栽），共几棵？", correct: "5", wrong: ["4", "6"] }, discoverWrong: ["乘法", "比"] },
  { id: "MK-34", name: "找次品", meaning: "三分最优策略（逻辑推理）", domain: "数学广角", isMvp: 0, emoji: "⚖️",
    parents: [{ meta: "MK-30", op: "细化" }], bossName: "次品怪", bossQuestion: "9 个零件有 1 个较轻，用天平至少称几次保证找到？",
    quiz: { prompt: "9 个球 1 个较轻，天平至少称几次找到？", correct: "2", wrong: ["3", "4"] }, discoverWrong: ["推理", "优化"] },
  { id: "MK-35", name: "数与形", meaning: "数形结合、规律探索", domain: "数学广角", isMvp: 0, emoji: "🔲",
    parents: [{ meta: "MK-18", op: "变换" }, { meta: "MK-05", op: "变换" }], bossName: "数形怪", bossQuestion: "1+3=4=2²，1+3+5=9=3²……数和形是好朋友！",
    quiz: { prompt: "1+3+5+7+9 等于几？（想想正方形点阵）", correct: "25", wrong: ["15", "20"] }, discoverWrong: ["面积", "乘法"] },
  { id: "MK-36", name: "鸽巢问题", meaning: "抽屉原理", domain: "数学广角", isMvp: 0, emoji: "🕊️",
    parents: [{ meta: "MK-30", op: "抽象" }], bossName: "鸽巢怪", bossQuestion: "4 只鸽子飞进 3 个巢，至少有一个巢里有几只？",
    quiz: { prompt: "5 支笔放进 4 个盒子，至少有一个盒子放几支？", correct: "2", wrong: ["1", "3"] }, discoverWrong: ["推理", "搭配"] },
  // ---- I. 数与代数补缺（MK-37 ~ MK-38）----
  { id: "MK-37", name: "因数倍数", meaning: "质数合数、公因数公倍数", domain: "数与运算", isMvp: 0, emoji: "🔗",
    parents: [{ meta: "MK-05", op: "关系" }, { meta: "MK-02", op: "细化" }], bossName: "因数怪", bossQuestion: "6 = 1×6 = 2×3……每个数都有自己的因数！",
    quiz: { prompt: "12 的因数有几个？", correct: "6", wrong: ["4", "5"] }, discoverWrong: ["乘法", "位值"] },
  { id: "MK-38", name: "运算定律", meaning: "交换/结合/分配律", domain: "数与运算", isMvp: 0, emoji: "📋",
    parents: [{ meta: "MK-03", op: "聚合" }, { meta: "MK-05", op: "聚合" }], bossName: "定律怪", bossQuestion: "25×(4+8) = 25×4+25×8……这就是分配律！",
    quiz: { prompt: "25×(4+8) 用分配律怎么算？", correct: "25×4+25×8", wrong: ["25×4×8", "25+4×8"] }, discoverWrong: ["乘法", "加法"] },
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

const metaName = (id: string) => WORLD_METAS.find((m) => m.id === id)?.name ?? id;
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
const hiddenMonsters: SeedMonster[] = [
  {
    id: "minion-why-01", name: "为什么小怪", type: "hidden", island: "加法岛",
    question: "好奇心引来的神秘小怪！答对它，伙伴会给你大惊喜～",
    correct_meta: "MK-03", target_meta: null, prerequisites: null,
    steps: [
      { type: "solve", prompt: "AI 说的话全是真的吗？", options: shuffleOptions("不一定，要验证", ["全是真的", "全是假的"]) },
    ],
  },
  {
    id: "minion-riddle-01", name: "谜语小怪", type: "hidden", island: "减法岛",
    question: "集满 6 颗火花才出现的谜语大师！",
    correct_meta: "MK-04", target_meta: null, prerequisites: null,
    steps: [
      { type: "solve", prompt: "什么东西越分享越多？", options: shuffleOptions("知识", ["糖果", "玩具"]) },
    ],
  },
  {
    id: "minion-star-01", name: "星星小怪", type: "hidden", island: "乘法岛",
    question: "集满 9 颗火花的星空守望者！",
    correct_meta: "MK-05", target_meta: null, prerequisites: null,
    steps: [
      { type: "solve", prompt: "3 排星星，每排 4 颗，一共几颗？", options: shuffleOptions("12", ["7", "9"]) },
    ],
  },
];

/** 每只神秘小怪的火花门槛（options 字段存 JSON） */
export function requiredSparksOf(id: string): number {
  return { "minion-why-01": 3, "minion-riddle-01": 6, "minion-star-01": 9 }[id] ?? 999;
}

/**
 * 世界结构迁移（v5：完整小学数学体系）：
 * - 28 元认知 / 29 进化边 / 28 精灵 幂等入库（INSERT OR IGNORE，不覆盖老数据）
 * - Boss 全量 UPSERT（Boss 行不含用户状态，可安全覆盖；id 规则 boss-mkxx）
 * - 老库补偿：图形认识（几何线起点）补发初始内化；MK-01 初始内化保留
 */
function migrateWorld() {
  const upsertMeta = db.prepare(
    "INSERT OR IGNORE INTO meta_cognition (id, name, meaning, domain, is_mvp) VALUES (?, ?, ?, ?, ?)"
  );
  const upsertEdge = db.prepare(
    "INSERT OR IGNORE INTO evolution_edge (id, from_meta, to_meta, operator, is_primary) VALUES (?, ?, ?, ?, ?)"
  );
  const upsertSpirit = db.prepare(
    "INSERT OR IGNORE INTO spirit (id, meta_id, emoji, nickname) VALUES (?, ?, ?, ?)"
  );
  for (const m of WORLD_METAS) upsertMeta.run(m.id, m.name, m.meaning, m.domain, m.isMvp);
  for (const e of WORLD_EDGES) upsertEdge.run(e.id, e.from_meta, e.to_meta, e.operator, e.is_primary);
  for (const s of WORLD_SPIRITS) upsertSpirit.run(s.id, s.meta_id, s.emoji, s.nickname);

  const upsertMonster = db.prepare(
    "INSERT OR REPLACE INTO monster (id, name, type, island, question, correct_meta, target_meta, prerequisites, options, steps) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertMonster = db.prepare(
    "INSERT OR IGNORE INTO monster (id, name, type, island, question, correct_meta, target_meta, prerequisites, options, steps) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const run = (st: ReturnType<typeof db.prepare>, mo: SeedMonster) =>
    st.run(
      mo.id, mo.name, mo.type, mo.island, mo.question,
      mo.correct_meta, mo.target_meta,
      mo.prerequisites ? JSON.stringify(mo.prerequisites) : null,
      null, JSON.stringify(mo.steps)
    );
  // Boss 覆盖式迁移（布局可随版本调整），小怪/神秘怪幂等补种
  for (const mo of monsters.filter((m) => m.type === "boss")) run(upsertMonster, mo);
  for (const mo of [...monsters.filter((m) => m.type !== "boss"), ...legacyMonsters, ...hiddenMonsters]) run(insertMonster, mo);

  // 清理 v4 及更早的旧格式 Boss id（已被 boss-mkxx 取代，留着会变成不可达的孤儿行）
  db.exec("DELETE FROM monster WHERE id IN ('boss-add', 'boss-sub', 'boss-mul', 'boss-place')");
  // MK-28 由隐藏彩蛋升级为「集合岛」：删掉旧版 12 火花解锁的彩蛋小怪（避免与集合岛小怪重复）
  db.exec("DELETE FROM monster WHERE id = 'minion-set-01'");

  // 几何线起点：图形认识（MK-15）初始内化（老库补偿；新库在 seedIfEmpty 里发）
  db.prepare(
    "INSERT OR IGNORE INTO internalized_meta (meta_id, acquired_at, source, mastery_level, mastery_xp) VALUES (?, ?, ?, ?, ?)"
  ).run("MK-15", new Date().toISOString(), "initial", 1, 0);
}

/** 神秘小怪幂等补种：老库升级也能拿到新内容 */
function seedHidden() {
  migrateWorld();
}

export function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM meta_cognition").get() as { c: number };
  if (count.c > 0) {
    seedHidden(); // 已种子过的老库：增量迁移到 v5
    return false; // 已种子过
  }

  db.exec("BEGIN");
  try {
    const insertMeta = db.prepare("INSERT INTO meta_cognition (id, name, meaning, domain, is_mvp) VALUES (?, ?, ?, ?, ?)");
    const insertEdge = db.prepare("INSERT INTO evolution_edge (id, from_meta, to_meta, operator, is_primary) VALUES (?, ?, ?, ?, ?)");
    const insertSpirit = db.prepare("INSERT INTO spirit (id, meta_id, emoji, nickname) VALUES (?, ?, ?, ?)");
    const insertMonster = db.prepare("INSERT INTO monster (id, name, type, island, question, correct_meta, target_meta, prerequisites, options, steps) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    for (const m of WORLD_METAS) insertMeta.run(m.id, m.name, m.meaning, m.domain, m.isMvp);
    for (const e of WORLD_EDGES) insertEdge.run(e.id, e.from_meta, e.to_meta, e.operator, e.is_primary);
    for (const s of WORLD_SPIRITS) insertSpirit.run(s.id, s.meta_id, s.emoji, s.nickname);
    for (const mo of [...monsters, ...legacyMonsters, ...hiddenMonsters]) {
      insertMonster.run(
        mo.id, mo.name, mo.type, mo.island, mo.question,
        mo.correct_meta, mo.target_meta,
        mo.prerequisites ? JSON.stringify(mo.prerequisites) : null,
        mo.type === "hidden" ? JSON.stringify({ required_sparks: requiredSparksOf(mo.id) }) : null,
        JSON.stringify(mo.steps)
      );
    }
    db.prepare("INSERT OR REPLACE INTO explorer (id, name, brain_settings, current_island) VALUES (?, ?, ?, ?)")
      .run(defaultExplorer.id, defaultExplorer.name, defaultExplorer.brain_settings, defaultExplorer.current_island);
    // 初始内化：计数（孩子天生会数数）+ 图形认识（几何线起点）
    const now = new Date().toISOString();
    db.prepare("INSERT OR REPLACE INTO internalized_meta (meta_id, acquired_at, source, mastery_level, mastery_xp) VALUES (?, ?, ?, ?, ?)")
      .run("MK-01", now, "initial", 1, 0);
    db.prepare("INSERT OR REPLACE INTO internalized_meta (meta_id, acquired_at, source, mastery_level, mastery_xp) VALUES (?, ?, ?, ?, ?)")
      .run("MK-15", now, "initial", 1, 0);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return true;
}

// 兼容旧导出
export const metas = WORLD_METAS.map((m) => ({ id: m.id, name: m.name, meaning: m.meaning, domain: m.domain, is_mvp: m.isMvp }));
export const edges = WORLD_EDGES;
export const spirits = WORLD_SPIRITS;
export { monsters as __monsters, hiddenMonsters as __hiddenMonsters };

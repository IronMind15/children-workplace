// 知识岛 · 数据类型（对应《需求文档》第 8 节）

export type MetaCognition = {
  id: string;       // MK-03
  name: string;     // 加法
  meaning: string;  // 合并求总数
  domain: string;   // 数与运算
  is_mvp: number;   // 0/1
};

export type EvolutionEdge = {
  id: string;
  from_meta: string;  // 父元认知 id
  to_meta: string;    // 子元认知 id
  operator: string;   // 进化算子（聚合/反转/…）
  is_primary: number;
};

export type MonsterType = "minion" | "boss" | "hidden" | "guard";

export type Monster = {
  id: string;
  name: string;
  type: MonsterType;
  island: string;
  question: string;
  correct_meta: string | null;    // 小怪：选精灵判定依据
  target_meta: string | null;     // Boss：净化后产出的元认知
  prerequisites: string | null;   // Boss 前置元认知（JSON 数组）
  options: string | null;         // 答案选项（JSON）
  steps: string | null;           // 解题步骤（JSON 数组）
  // 知识守卫（type='guard'）：觉醒载体
  required_metas: string | null;  // 需要哪些精灵达标（JSON 数组，多精灵守卫）
  required_level: number | null;  // 等级门槛
  spawn_mode: string | null;      // 'fixed' 必现 / 'random' 随机
  spawn_islands: string | null;   // 随机现身池（JSON 数组）
};

export type Spirit = {
  id: string;
  meta_id: string;
  emoji: string;
  nickname: string | null;
};

export type Explorer = {
  id: string;
  name: string;
  brain_settings: string | null;  // JSON
  current_island: string;
  difficulty_bias?: number;        // 难度微调偏置（手动调整整体难度）
  gender?: string | null;         // 探险家性别（boy / girl），选角用
  avatar_id?: string | null;      // 探险家头像 id（boy_1~3 / girl_1~3）
  level?: number | null;          // 探险家等级（1~6，对应头衔）
  xp?: number | null;             // 预留经验值
  title?: string | null;          // 当前头衔（冗余存列，便于直接读取）
};

export type InternalizedMeta = {
  meta_id: string;
  acquired_at: string;
  source: string | null;
  mastery_level: number;
  mastery_xp: number;
};

export type GrowthLog = {
  id: number;
  event: string;
  detail: string | null;
  created_at: string;
};

// 错题记录（选错时写入，重做答对后 resolved=1）
export type Mistake = {
  id: number;
  meta_id: string;
  question: string;
  user_answer: string;
  correct_answer: string;
  created_at: string;
  resolved: number;
};

// 解题步骤（steps 的 JSON 反序列化结构）
export type SolveStep = {
  type: "discover" | "solve";   // discover = 发现新元认知；solve = 解题
  prompt: string;
  options: { label: string; correct?: boolean }[];
  requires?: string[];          // 该题需要的元认知（多只精灵联手）；缺省 = 战斗的 correct_meta
  requires_properties?: string[]; // 觉醒联手：要求已觉醒的性质（如 ["PP-05"]）
  explain?: string;             // 内置讲解文案（选错时弹出，结合具体题目数字演示正确思路）
};

// ============ 第二阶段 · 属性策略 / 觉醒 ============

export type Property = {
  id: string;         // PP-01
  name: string;       // 加法交换律
  belongs_to: string; // 依附元认知 id（JSON 数组，如 ["MK-05","MK-03"]）
  order: number;      // 觉醒顺序（第几条性质，1 起）
  explain: string | null;
};

export type Strategy = {
  id: string;         // ST-01
  name: string;
  effect: string;
  tier: number;       // 1 = 核心，2 = P2
};

export type InternalizedProperty = {
  spirit_id: string;   // SP-xx
  property_id: string; // PP-xx
  awakened_at: string;
  source: string | null;
};

export type InternalizedStrategy = {
  strategy_id: string;
  mastery: number;
};

export type IslandLevel = {
  island: string;
  level: number;
};

export type ConfigEntry = {
  key: string;
  value: string;
};

export type BossProgress = {
  boss_id: string;
  attempt_count: number;
  last_attempt_at: string | null;
};

/** 知识守卫的展示/触发信息（觉醒载体） */
export type GuardInfo = {
  id: string;
  name: string;
  island: string;
  property_id: string;      // 对应性质（打赢后觉醒）
  property_name: string;
  required_metas: string[]; // 需要哪些精灵（多精灵守卫）
  required_level: number;   // 等级门槛
  spawn_mode: "fixed" | "random";
  spawn_islands: string[];  // 随机现身池（random）
  awakened: boolean;        // 是否已打赢（已觉醒）
  visible: boolean;         // 是否达标可见
};

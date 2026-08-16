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

export type MonsterType = "minion" | "boss" | "hidden";

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
  explain?: string;             // 内置讲解文案（选错时弹出，结合具体题目数字演示正确思路）
};

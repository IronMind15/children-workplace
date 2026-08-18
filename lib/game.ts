import db from "./db";
import {
  getMonster, getMeta, isInternalized, getInternalized, getExplorer, getIslands, getEvolutionEdges, getMetas,
  getProperty, getNextAwakenable, recordAwakening, isPropertyAwakened, getGuard, getGuardsByIsland,
  getConfigNum, bumpIslandLevel, bumpBossAttempt, getPurifiedBossCount, setExplorerLevelTitle,
  getGuards as getAllGuards,
} from "./repo";
import type { GuardInfo, Property, SolveStep } from "./types";
import { computeRankLevel, getRankByLevel } from "./ranks";
import { getCurrentUser } from "./session";

/**
 * 训练胜利：该元认知熟练经验 +1，达到「递增阈值」则熟练等级 +1（= 精灵进化），并写成长日志。
 * 升级遵循成熟的「练习熟练度积累规律」：每升一级所需经验递增（xpToNext），而非固定阈值，
 * 越往后越需要更多练习，契合养成类游戏的成长曲线。
 * 无血量、无失败终态（零失败压力）。
 * 返回是否触发进化（升级），供前端播放进化庆祝。
 */
export const MAX_MASTERY_LEVEL = 10;

/** 升到下一级所需经验：基础 3，每级 +2（Lv1→2:3, Lv2→3:5, Lv3→4:7 …），递增曲线 */
export function xpToNext(level: number): number {
  return 3 + (level - 1) * 2;
}

export function trainWin(metaId: string, stars: number): { leveledUp: boolean; level: number } {
  const im = getInternalized(metaId);
  if (!im) return { leveledUp: false, level: 0 };

  let level = im.mastery_level;
  let xp = im.mastery_xp + 1; // 每次胜利 +1 熟练经验
  let leveledUp = false;
  if (level < MAX_MASTERY_LEVEL && xp >= xpToNext(level)) {
    level += 1;
    xp = 0;
    leveledUp = true;
  }
  db.prepare("UPDATE internalized_meta SET mastery_level = ?, mastery_xp = ? WHERE user_id = ? AND meta_id = ?").run(level, xp, getCurrentUser(), metaId);
  db.prepare("INSERT INTO growth_log (user_id, event, detail) VALUES (?, ?, ?)").run(
    getCurrentUser(),
    "train_win",
    JSON.stringify({ meta_id: metaId, stars, mastery_level: level, mastery_xp: xp })
  );
  return { leveledUp, level };
}

// ============ 好奇心火花（激励孩子向 AI 伙伴提问） ============

export type SparkStats = { total: number; todayCount: number };

export function getSparkStats(): SparkStats {
  const uid = getCurrentUser();
  const total = (db.prepare("SELECT COALESCE(SUM(sparks), 0) AS s FROM curiosity_log WHERE user_id = ?").get(uid) as { s: number }).s;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = (
    db.prepare("SELECT COUNT(*) AS c FROM curiosity_log WHERE user_id = ? AND created_at >= ?").get(uid, today) as { c: number }
  ).c;
  return { total, todayCount };
}

/** 提问奖励火花（demo 阶段不限每日次数） */
export function addSpark(questionId: string, label: string): SparkStats & { ok: boolean } {
  const uid = getCurrentUser();
  db.prepare("INSERT INTO curiosity_log (user_id, question_id, label, sparks, created_at) VALUES (?, ?, ?, 1, ?)")
    .run(uid, questionId, label, new Date().toISOString());
  db.prepare("INSERT INTO growth_log (user_id, event, detail) VALUES (?, ?, ?)").run(
    uid,
    "ask_ai",
    JSON.stringify({ question_id: questionId, label })
  );
  return { ok: true, ...getSparkStats() };
}

/** 测试用：清空火花记录 */
export function clearSparks(): SparkStats {
  db.prepare("DELETE FROM curiosity_log WHERE user_id = ?").run(getCurrentUser());
  return getSparkStats();
}

// ============ 神秘玩法：保底邂逅 + 收集（隐藏小怪） ============

export type MysteryState = {
  pityCount: number;
  visibleIds: string[];
  lastEncounterDate: string | null;
  encounterToday: number;
};

/** 读取用户的神秘邂逅状态（无则初始化） */
export function getMysteryState(uid?: string): MysteryState {
  const u = uid ?? getCurrentUser();
  const row = db.prepare("SELECT * FROM mystery_state WHERE user_id = ?").get(u) as
    | { pity_count: number; visible_ids: string; last_encounter_date: string | null; encounter_today: number }
    | undefined;
  if (!row) return { pityCount: 0, visibleIds: [], lastEncounterDate: null, encounterToday: 0 };
  let visibleIds: string[] = [];
  try {
    visibleIds = JSON.parse(row.visible_ids) as string[];
  } catch {}
  return { pityCount: row.pity_count, visibleIds, lastEncounterDate: row.last_encounter_date, encounterToday: row.encounter_today };
}

function saveMysteryState(s: MysteryState, uid?: string) {
  const u = uid ?? getCurrentUser();
  db.prepare(
    `INSERT INTO mystery_state (user_id, pity_count, visible_ids, last_encounter_date, encounter_today)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET pity_count=excluded.pity_count, visible_ids=excluded.visible_ids,
       last_encounter_date=excluded.last_encounter_date, encounter_today=excluded.encounter_today`
  ).run(u, s.pityCount, JSON.stringify(s.visibleIds), s.lastEncounterDate, s.encounterToday);
}

/** 保底参数（config 可调）：每 N 次提问必邂逅；每日邂逅上限 */
export function mysteryPityLimit(): number {
  return Math.max(1, getConfigNum("mystery_pity", 5));
}
export function mysteryDailyCap(): number {
  return Math.max(1, getConfigNum("mystery_daily_cap", 3));
}

/** 提问后推进保底：满 N 次则触发一次「邂逅」（优先未收集），返回邂逅的小怪 id；否则 null */
export function maybeTriggerEncounter(
  allHidden: { id: string }[],
  uid?: string
): { monsterId: string; isPity: boolean } | null {
  const u = uid ?? getCurrentUser();
  const st = getMysteryState(u);
  const today = new Date().toISOString().slice(0, 10);

  // 跨天重置每日计数
  if (st.lastEncounterDate !== today) {
    st.lastEncounterDate = today;
    st.encounterToday = 0;
  }

  st.pityCount += 1;
  if (st.pityCount >= mysteryPityLimit() && st.encounterToday < mysteryDailyCap() && allHidden.length > 0) {
    // 优先从未收集里抽；已集齐则随机一只
    const caught = new Set(getMysteryCatches(u).map((c) => c.monsterId));
    const pool = allHidden.filter((h) => !caught.has(h.id));
    const pickPool = pool.length > 0 ? pool : allHidden;
    const picked = pickPool[Math.floor(Math.random() * pickPool.length)];
    if (!st.visibleIds.includes(picked.id)) st.visibleIds.push(picked.id);
    st.pityCount = 0;
    st.encounterToday += 1;
    saveMysteryState(st, u);
    return { monsterId: picked.id, isPity: true };
  }
  saveMysteryState(st, u);
  return null;
}

/** 已收集的隐藏小怪（id + 捕捉时间） */
export function getMysteryCatches(uid?: string): { monsterId: string; caughtAt: string }[] {
  const u = uid ?? getCurrentUser();
  const rows = db.prepare("SELECT monster_id, caught_at FROM mystery_catch WHERE user_id = ? ORDER BY caught_at ASC").all(u) as {
    monster_id: string;
    caught_at: string;
  }[];
  return rows.map((r) => ({ monsterId: r.monster_id, caughtAt: r.caught_at }));
}

/** 记录一次捕捉：写收集表 + 从邂逅可见列表移除；返回是否首次收集 */
export function recordMysteryCatch(monsterId: string, uid?: string): { firstTime: boolean; caughtAt: string } {
  const u = uid ?? getCurrentUser();
  const existed = db.prepare("SELECT 1 FROM mystery_catch WHERE user_id = ? AND monster_id = ?").get(u, monsterId);
  const caughtAt = new Date().toISOString();
  if (!existed) {
    db.prepare("INSERT INTO mystery_catch (user_id, monster_id, caught_at) VALUES (?, ?, ?)").run(u, monsterId, caughtAt);
  }
  // 从可见列表移除
  const st = getMysteryState(u);
  if (st.visibleIds.includes(monsterId)) {
    st.visibleIds = st.visibleIds.filter((v) => v !== monsterId);
    saveMysteryState(st, u);
  }
  return { firstTime: !existed, caughtAt };
}

// ============ 难度系统（按岛计算） ============
// 每个岛的难度独立 = 基础(1) + a×已解锁下游岛数 + b×(精灵等级−1) + 全局偏置(bias)
// a/b 权重可调（config.diff_a / diff_b，默认 1 / 2）
// Boss 战使用 seed 固定题，不随本公式缩放。
const DIFF_BASE = 1;

/** 某元认知岛屿的难度等级（≥1，≤30） */
export function getIslandDifficulty(metaId: string): number {
  const bias = getExplorer()?.difficulty_bias ?? 0;
  const DIFF_A = getConfigNum("diff_a", 1); // 下游岛权重
  const DIFF_B = getConfigNum("diff_b", 2); // 精灵等级权重
  // ① 已解锁的下游岛数：本岛在进化 DAG 中作为直接父的那些元认知，已内化的个数
  const children = getEvolutionEdges()
    .filter((e) => e.from_meta === metaId)
    .map((e) => e.to_meta);
  const unlockedChildren = children.filter((c) => isInternalized(c)).length;
  // ② 精灵自身等级（训练打怪升上来的 mastery_level，初始 1）
  const mastery = getInternalized(metaId)?.mastery_level ?? 1;
  const raw = DIFF_BASE + DIFF_A * unlockedChildren + DIFF_B * (mastery - 1) + bias;
  return Math.max(1, Math.min(30, Math.floor(raw)));
}

/** 当前所在岛的难度（供测试面板展示单一数字） */
export function getDifficultyLevel(): number {
  const cur = getExplorer()?.current_island;
  if (!cur) return 1;
  const meta = getMetas().find((m) => m.name === cur.replace(/岛$/, ""));
  return meta ? getIslandDifficulty(meta.id) : 1;
}

/** 手动微调难度（返回新的偏置值） */
export function adjustDifficultyBias(delta: number): number {
  const cur = getExplorer()?.difficulty_bias ?? 0;
  const next = Math.max(-10, Math.min(20, cur + delta));
  db.prepare("UPDATE explorer SET difficulty_bias = ? WHERE id = ?").run(next, getCurrentUser());
  return next;
}

/**
 * 测试用：一键重置全部进度 ——
 * 内化归零（仅保留两个起点：计数 MK-01、图形认识 MK-15）、熟练度/成长日志/火花清空、回到计数岛。
 * 岛屿解锁、Boss 净化状态、精灵进化全部由 internalized_meta 派生，随之归零。
 * 只作用于当前登录用户。
 */
export function resetAllProgress(): void {
  const uid = getCurrentUser();
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM internalized_meta WHERE user_id = ?").run(uid);
    const now = new Date().toISOString();
    db.prepare("INSERT INTO internalized_meta (user_id, meta_id, acquired_at, source, mastery_level, mastery_xp) VALUES (?, ?, ?, ?, ?, ?)")
      .run(uid, "MK-01", now, "initial", 1, 0);
    db.prepare("INSERT INTO internalized_meta (user_id, meta_id, acquired_at, source, mastery_level, mastery_xp) VALUES (?, ?, ?, ?, ?, ?)")
      .run(uid, "MK-15", now, "initial", 1, 0);
    db.prepare("DELETE FROM growth_log WHERE user_id = ?").run(uid);
    db.prepare("DELETE FROM curiosity_log WHERE user_id = ?").run(uid);
    db.prepare("UPDATE explorer SET current_island = '计数岛' WHERE id = ?").run(uid);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/**
 * 净化 Boss（原子性结算）：内化新元认知 + 解锁下一岛 + 写日志。
 * 三件事在同一事务里，要么全发生、要么全回滚。
 */
export function purify(monsterId: string): { ok: boolean; targetMeta?: string; nextIsland?: string; reason?: string } {
  const monster = getMonster(monsterId);
  if (!monster || monster.type !== "boss" || !monster.target_meta) {
    return { ok: false, reason: "不是渡海 Boss" };
  }
  // 前置检查
  const prereqs: string[] = monster.prerequisites ? JSON.parse(monster.prerequisites) : [];
  for (const p of prereqs) {
    if (!isInternalized(p)) return { ok: false, reason: "前置元认知未满足：" + p };
  }
  const target = getMeta(monster.target_meta);
  if (!target) return { ok: false, reason: "目标元认知不存在" };
  if (isInternalized(monster.target_meta)) return { ok: false, reason: "已内化该元认知" };

  const nextIsland = target.name + "岛";
  const explorer = getExplorer();
  const uid = getCurrentUser();

  db.exec("BEGIN");
  try {
    db.prepare("INSERT INTO internalized_meta (user_id, meta_id, acquired_at, source, mastery_level, mastery_xp) VALUES (?, ?, ?, ?, ?, ?)")
      .run(uid, monster.target_meta, new Date().toISOString(), "boss", 1, 0);
    if (explorer) {
      db.prepare("UPDATE explorer SET current_island = ? WHERE id = ?").run(nextIsland, explorer.id);
    }
    db.prepare("INSERT INTO growth_log (user_id, event, detail) VALUES (?, ?, ?)").run(
      uid,
      "purify",
      JSON.stringify({ monster_id: monsterId, target_meta: monster.target_meta, next_island: nextIsland })
    );
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return { ok: true, targetMeta: monster.target_meta, nextIsland };
}

// ============ 错题集 ============

/** 成长日志统一写入（其他模块复用，避免重复拼接 SQL） */
export function recordGrowth(event: string, detail: unknown): void {
  db.prepare("INSERT INTO growth_log (user_id, event, detail) VALUES (?, ?, ?)").run(
    getCurrentUser(),
    event,
    detail == null ? null : JSON.stringify(detail)
  );
}

/**
 * 记录一次答错（选错时调用）。
 * - 同一道题只记一行：按「用户 + 元认知 + 题干（忽略大小写/首尾空格）」去重；
 *   若该题干已存在错题库，则「错次 +1、刷新答案快照、重新打开（刚又错了）」而非新增行。
 * - 知识点 kp：优先用题目自带的 kp（更细，如「加法·20以内」），否则回退到元认知名。
 */
export function recordMistake(
  metaId: string,
  question: string,
  userAnswer: string,
  correctAnswer: string,
  stepJson?: string | null,
  kp?: string | null
): void {
  const uid = getCurrentUser();
  const q = (question ?? "").trim().toLowerCase();
  const existing = db
    .prepare(
      "SELECT id, kp, resolved FROM mistake WHERE user_id = ? AND meta_id = ? AND LOWER(TRIM(question)) = ? ORDER BY id DESC LIMIT 1"
    )
    .get(uid, metaId, q) as { id: number; kp: string | null; resolved: number } | undefined;
  if (existing) {
    db.prepare(
      `UPDATE mistake SET user_answer = ?, correct_answer = ?, step_json = ?, wrong_count = wrong_count + 1, resolved = 0, resolved_at = NULL, kp = COALESCE(NULLIF(?, ''), kp) WHERE id = ?`
    ).run(userAnswer, correctAnswer, stepJson ?? null, kp ?? "", existing.id);
    return;
  }
  const finalKp = kp && kp.trim() ? kp : (getMeta(metaId)?.name ?? metaId);
  db.prepare(
    "INSERT INTO mistake (user_id, meta_id, question, user_answer, correct_answer, created_at, step_json, kp, wrong_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"
  ).run(uid, metaId, question, userAnswer, correctAnswer, new Date().toISOString(), stepJson ?? null, finalKp, 1);
}

/** 重做答对后，把该知识点的【所有】未掌握错题标记为已掌握（Boss 净化等"整岛掌握"场景用） */
export function resolveMistakes(metaId: string): void {
  const uid = getCurrentUser();
  const rows = db
    .prepare("SELECT id FROM mistake WHERE user_id = ? AND meta_id = ? AND resolved = 0")
    .all(uid, metaId) as { id: number }[];
  if (!rows.length) return;
  db.prepare(
    `UPDATE mistake SET resolved = 1, resolved_at = ? WHERE user_id = ? AND id IN (${rows.map(() => "?").join(",")})`
  ).run(new Date().toISOString(), uid, ...rows.map((r) => r.id));
  recordGrowth("mistake_resolved_bulk", { meta_id: metaId, count: rows.length });
}

/**
 * 重做答对后，精准订正【单条】错题：优先按 mistake_id 定位（战斗重做注入的场景），
 * 否则按「元认知 + 题干」定位（同一场战斗里先错后对的场景）。
 * 命中即标记 resolved=1 + resolved_at，并写成长日志（记录孩子的"改对"成长）。
 * 返回是否真的订正到了一条错题。
 */
export function resolveMistakeQuestion(metaId: string, question: string, mistakeId?: number | null): boolean {
  const uid = getCurrentUser();
  let target: { id: number } | undefined;
  if (mistakeId != null) {
    target = db
      .prepare("SELECT id FROM mistake WHERE user_id = ? AND id = ? AND resolved = 0")
      .get(uid, mistakeId) as { id: number } | undefined;
  } else {
    const q = (question ?? "").trim().toLowerCase();
    if (!q) return false;
    target = db
      .prepare(
        "SELECT id FROM mistake WHERE user_id = ? AND meta_id = ? AND resolved = 0 AND LOWER(TRIM(question)) = ? ORDER BY id DESC LIMIT 1"
      )
      .get(uid, metaId, q) as { id: number } | undefined;
  }
  if (!target) return false;
  db.prepare("UPDATE mistake SET resolved = 1, resolved_at = ? WHERE user_id = ? AND id = ?").run(
    new Date().toISOString(),
    uid,
    target.id
  );
  recordGrowth("mistake_resolved", { meta_id: metaId, mistake_id: target.id });
  return true;
}

/** 某元认知未掌握的错题数（用于战斗里"更可能碰到旧错题"的加权） */
export function getUnresolvedMistakeCountByMeta(metaId: string): number {
  const r = db
    .prepare("SELECT COUNT(*) AS c FROM mistake WHERE user_id = ? AND meta_id = ? AND resolved = 0")
    .get(getCurrentUser(), metaId) as { c: number };
  return r.c;
}

/** 某元认知的熟练度评估（知识掌握度） */
export type MetaProficiency = {
  metaId: string;
  metaName: string;
  mastery: number; // 精灵等级 1~10
  total: number; // 累计错题
  resolved: number; // 已订正
  unresolved: number; // 待复习
  score: number; // 0~100
  level: "精通" | "良好" | "待加强" | "薄弱" | "未涉及";
  color: string; // 徽章配色（hex）
};

/**
 * 知识熟练度评估：精灵等级占 60%，错题订正率占 40%（无错题视为满分）。
 * 既看"练得熟不熟"（mastery），也看"错得多不多、改没改对"（订正率），
 * 给家长和孩子一个直观的掌握度信号。
 */
export function evaluateMetaProficiency(metaId: string): MetaProficiency {
  const uid = getCurrentUser();
  const im = getInternalized(metaId);
  const meta = getMeta(metaId);
  const mastery = im?.mastery_level ?? 0;
  const total = (db.prepare("SELECT COUNT(*) AS c FROM mistake WHERE user_id = ? AND meta_id = ?").get(uid, metaId) as { c: number }).c;
  const resolved = (db.prepare("SELECT COUNT(*) AS c FROM mistake WHERE user_id = ? AND meta_id = ? AND resolved = 1").get(uid, metaId) as { c: number }).c;
  const unresolved = total - resolved;
  const base: MetaProficiency = {
    metaId,
    metaName: meta?.name ?? metaId,
    mastery,
    total,
    resolved,
    unresolved,
    score: 0,
    level: "未涉及",
    color: "#9aa7b2",
  };
  if (!im && total === 0) return base; // 既没内化也没错过错题：还没接触

  const masteryPart = (mastery / 10) * 60;
  const mistakePart = total === 0 ? 40 : (resolved / total) * 40;
  const score = Math.max(0, Math.min(100, Math.round(masteryPart + mistakePart)));

  let level: MetaProficiency["level"];
  let color: string;
  if (score >= 90) {
    level = "精通";
    color = "#3fb984";
  } else if (score >= 70) {
    level = "良好";
    color = "#185fa5";
  } else if (score >= 45) {
    level = "待加强";
    color = "#f79228";
  } else {
    level = "薄弱";
    color = "#e2582e";
  }
  return { ...base, score, level, color };
}

/**
 * 取出某元认知【未掌握且存了完整题目】的错题，重建成 SolveStep 用于战斗重做。
 * 仅取 step_json 存在的（老库或升级前的错题没有，自然不参与重做，逐步覆盖）。
 * 取走时 review_count +1，记录"被安排重做的次数"。
 */
export function getReviewSteps(metaId: string, maxCount = 3): SolveStep[] {
  const uid = getCurrentUser();
  const rows = db
    .prepare(
      "SELECT id, step_json FROM mistake WHERE user_id = ? AND meta_id = ? AND resolved = 0 AND step_json IS NOT NULL ORDER BY id DESC LIMIT ?"
    )
    .all(uid, metaId, maxCount) as { id: number; step_json: string }[];
  const steps: SolveStep[] = [];
  const ids: number[] = [];
  for (const r of rows) {
    try {
      const s = JSON.parse(r.step_json) as SolveStep;
      if (s && s.prompt && Array.isArray(s.options) && s.options.length > 0) {
        steps.push({ ...s, isReview: true, mistakeId: r.id });
        ids.push(r.id);
      }
    } catch {
      /* 跳过损坏记录 */
    }
  }
  if (ids.length) {
    db.prepare(
      `UPDATE mistake SET review_count = review_count + 1 WHERE user_id = ? AND id IN (${ids.map(() => "?").join(",")})`
    ).run(uid, ...ids);
  }
  return steps;
}

// ============ 第二阶段 · 知识守卫 / 觉醒 ============

/** 由怪物行构建守卫展示信息（达标判定：所有精灵已内化 且 等级 ≥ required_level） */
function toGuardInfo(g: ReturnType<typeof getGuard> & { type: string }): GuardInfo | null {
  if (!g || g.type !== "guard") return null;
  const propertyId = g.id.replace(/^guard-/, "").toUpperCase();
  const prop = getProperty(propertyId);
  if (!prop) return null;
  const metas: string[] = g.required_metas ? JSON.parse(g.required_metas) : [];
  const requiredLevel = g.required_level ?? 2;
  const visible =
    metas.length > 0 &&
    metas.every((m) => {
      const im = getInternalized(m);
      return !!im && im.mastery_level >= requiredLevel;
    });
  return {
    id: g.id,
    name: g.name,
    island: g.island,
    property_id: propertyId,
    property_name: prop.name,
    required_metas: metas,
    required_level: requiredLevel,
    spawn_mode: g.spawn_mode === "random" ? "random" : "fixed",
    spawn_islands: g.spawn_islands ? JSON.parse(g.spawn_islands) : [g.island],
    awakened: isPropertyAwakened(propertyId),
    visible,
  };
}

/** 全部可达的守卫（达标且未觉醒 = 触发广播 / 岛上现身） */
export function checkAwakenings(): GuardInfo[] {
  return getAllGuards()
    .map((r) => toGuardInfo(r as ReturnType<typeof getGuard> & { type: string }))
    .filter((x): x is GuardInfo => !!x && x.visible && !x.awakened);
}

/** 某岛当前可见的守卫（达标 + 未觉醒 + 主岛或随机池含该岛） */
export function getVisibleGuardsByIsland(island: string): GuardInfo[] {
  return checkAwakenings().filter(
    (g) => g.spawn_mode === "fixed" ? g.island === island : g.spawn_islands.includes(island)
  );
}

/** 打赢守卫：觉醒该性质（多精灵守卫 = 相关精灵共同镀金）+ 岛屿等级 +1 */
export function guardWin(
  guardId: string
): { ok: boolean; propertyId?: string; propertyName?: string; island?: string; islandLevel?: number; reason?: string } {
  const g = getGuard(guardId);
  const info = toGuardInfo(g as ReturnType<typeof getGuard> & { type: string });
  if (!info) return { ok: false, reason: "不是知识守卫" };
  if (!info.visible) return { ok: false, reason: "精灵等级未达标" };
  if (info.awakened) return { ok: false, reason: "该性质已觉醒" };
  // 觉醒：所有相关精灵共同记录（共同镀金）
  for (const m of info.required_metas) recordAwakening(m, info.property_id, "guard");
  const islandLevel = bumpIslandLevel(info.island);
  db.prepare("INSERT INTO growth_log (user_id, event, detail) VALUES (?, ?, ?)").run(
    getCurrentUser(),
    "property_awaken",
    JSON.stringify({ property_id: info.property_id, guard_id: guardId, island: info.island, island_level: islandLevel })
  );
  return { ok: true, propertyId: info.property_id, propertyName: info.property_name, island: info.island, islandLevel };
}

// ============ 第二阶段 · Boss 卡关退路 ============

/**
 * Boss 挑战失败计数；达到阈值（config.boss_stuck_attempts，默认 2）后进入「卡关退路」：
 * 引导觉醒相关旧知（前置元认知的下一档可觉醒性质），让孩子先深化旧知再回来。
 */
export function bossFail(
  monsterId: string
): { attempts: number; stuck: boolean; guideMeta?: string; nextProperty?: Property | null } {
  const attempts = bumpBossAttempt(monsterId);
  const threshold = getConfigNum("boss_stuck_attempts", 2);
  if (attempts < threshold) return { attempts, stuck: false };
  const monster = getMonster(monsterId);
  const prereqs: string[] = monster?.prerequisites ? JSON.parse(monster.prerequisites) : [];
  for (const m of prereqs) {
    const im = getInternalized(m);
    const next = im ? getNextAwakenable(m, im.mastery_level) : null;
    if (next) return { attempts, stuck: true, guideMeta: m, nextProperty: next };
  }
  return { attempts, stuck: true };
}

// ============ 探险家等级晋升（第三轮） ============

/**
 * 探险家等级晋升检测：按「净化 Boss 数 或 火花数」双轨判断（见 lib/ranks.ts）。
 * 若算出应处等级高于当前等级，则升级 + 写成长日志，并返回晋升信息（供前端庆祝）。
 * 在 purifyMonster（Boss 数↑）与 askQuestion/askFree（火花↑）后调用。
 */
export function checkAndPromote(
  explorerId = "default"
): { promoted: boolean; fromLevel: number; toLevel: number; title: string } {
  const e = getExplorer();
  if (!e) return { promoted: false, fromLevel: 1, toLevel: 1, title: getRankByLevel(1).title };
  const purifiedBosses = getPurifiedBossCount();
  const sparks = (db.prepare("SELECT COALESCE(SUM(sparks), 0) AS s FROM curiosity_log WHERE user_id = ?").get(getCurrentUser()) as { s: number }).s;
  const targetLevel = computeRankLevel(purifiedBosses, sparks);
  const fromLevel = e.level ?? 1;
  if (targetLevel > fromLevel) {
    const title = getRankByLevel(targetLevel).title;
    setExplorerLevelTitle(targetLevel, title);
    db.prepare("INSERT INTO growth_log (user_id, event, detail) VALUES (?, ?, ?)").run(
      getCurrentUser(),
      "promote",
      JSON.stringify({ from: fromLevel, to: targetLevel, title })
    );
    return { promoted: true, fromLevel, toLevel: targetLevel, title };
  }
  return { promoted: false, fromLevel, toLevel: fromLevel, title: e.title ?? getRankByLevel(fromLevel).title };
}

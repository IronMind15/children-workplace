import db from "./db";
import { getMonster, getMeta, isInternalized, getInternalized, getExplorer, getIslands, getEvolutionEdges, getMetas } from "./repo";

/**
 * 训练胜利：该元认知熟练经验 +1，满 3 次则熟练等级 +1（= 精灵进化），并写成长日志。
 * 无血量、无失败终态（零失败压力）。
 * 返回是否触发进化（升级），供前端播放进化庆祝。
 */
export function trainWin(metaId: string, stars: number): { leveledUp: boolean; level: number } {
  const im = getInternalized(metaId);
  if (!im) return { leveledUp: false, level: 0 };

  let level = im.mastery_level;
  let xp = im.mastery_xp + 1;
  const THRESHOLD = 3; // 经验阈值
  let leveledUp = false;
  if (xp >= THRESHOLD) {
    level += 1;
    xp = 0;
    leveledUp = true;
  }
  db.prepare("UPDATE internalized_meta SET mastery_level = ?, mastery_xp = ? WHERE meta_id = ?").run(level, xp, metaId);
  db.prepare("INSERT INTO growth_log (event, detail) VALUES (?, ?)").run(
    "train_win",
    JSON.stringify({ meta_id: metaId, stars, mastery_level: level })
  );
  return { leveledUp, level };
}

// ============ 好奇心火花（激励孩子向 AI 伙伴提问） ============

export type SparkStats = { total: number; todayCount: number };

export function getSparkStats(): SparkStats {
  const total = (db.prepare("SELECT COALESCE(SUM(sparks), 0) AS s FROM curiosity_log").get() as { s: number }).s;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = (
    db.prepare("SELECT COUNT(*) AS c FROM curiosity_log WHERE created_at >= ?").get(today) as { c: number }
  ).c;
  return { total, todayCount };
}

/** 提问奖励火花（demo 阶段不限每日次数） */
export function addSpark(questionId: string, label: string): SparkStats & { ok: boolean } {
  db.prepare("INSERT INTO curiosity_log (question_id, label, sparks, created_at) VALUES (?, ?, 1, ?)")
    .run(questionId, label, new Date().toISOString());
  db.prepare("INSERT INTO growth_log (event, detail) VALUES (?, ?)").run(
    "ask_ai",
    JSON.stringify({ question_id: questionId, label })
  );
  return { ok: true, ...getSparkStats() };
}

/** 测试用：清空火花记录 */
export function clearSparks(): SparkStats {
  db.exec("DELETE FROM curiosity_log");
  return getSparkStats();
}

// ============ 难度系统（按岛计算） ============
// 每个岛的难度独立 = 基础(1) + a×已解锁下游岛数 + b×(精灵等级−1) + 全局偏置(bias)
// a=1：看重"这岛当跳板开了多少下游岛"；b=2：看重"精灵靠打怪练上来多少级"
// Boss 战使用 seed 固定题，不随本公式缩放。
const DIFF_BASE = 1;
const DIFF_A = 1; // 下游岛权重
const DIFF_B = 2; // 精灵等级权重

/** 某元认知岛屿的难度等级（≥1，≤30） */
export function getIslandDifficulty(metaId: string): number {
  const bias = getExplorer()?.difficulty_bias ?? 0;
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
  db.prepare("UPDATE explorer SET difficulty_bias = ? WHERE id = 'default'").run(next);
  return next;
}

/**
 * 测试用：一键重置全部进度 ——
 * 内化归零（仅保留两个起点：计数 MK-01、图形认识 MK-15）、熟练度/成长日志/火花清空、回到计数岛。
 * 岛屿解锁、Boss 净化状态、精灵进化全部由 internalized_meta 派生，随之归零。
 */
export function resetAllProgress(): void {
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM internalized_meta");
    const now = new Date().toISOString();
    db.prepare("INSERT INTO internalized_meta (meta_id, acquired_at, source, mastery_level, mastery_xp) VALUES (?, ?, ?, ?, ?)")
      .run("MK-01", now, "initial", 1, 0);
    db.prepare("INSERT INTO internalized_meta (meta_id, acquired_at, source, mastery_level, mastery_xp) VALUES (?, ?, ?, ?, ?)")
      .run("MK-15", now, "initial", 1, 0);
    db.exec("DELETE FROM growth_log");
    db.exec("DELETE FROM curiosity_log");
    db.exec("UPDATE explorer SET current_island = '计数岛'");
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

  db.exec("BEGIN");
  try {
    db.prepare("INSERT INTO internalized_meta (meta_id, acquired_at, source, mastery_level, mastery_xp) VALUES (?, ?, ?, ?, ?)")
      .run(monster.target_meta, new Date().toISOString(), "boss", 1, 0);
    if (explorer) {
      db.prepare("UPDATE explorer SET current_island = ? WHERE id = ?").run(nextIsland, explorer.id);
    }
    db.prepare("INSERT INTO growth_log (event, detail) VALUES (?, ?)").run(
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

/** 记录一次答错（选错时调用，写入错题集） */
export function recordMistake(metaId: string, question: string, userAnswer: string, correctAnswer: string): void {
  db.prepare("INSERT INTO mistake (meta_id, question, user_answer, correct_answer, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(metaId, question, userAnswer, correctAnswer, new Date().toISOString());
}

/** 重做答对后，把该知识点的未掌握错题标记为已掌握 */
export function resolveMistakes(metaId: string): void {
  db.prepare("UPDATE mistake SET resolved = 1 WHERE meta_id = ? AND resolved = 0").run(metaId);
}

import db from "./db";
import {
  getMonster, getMeta, isInternalized, getInternalized, getExplorer, getIslands, getEvolutionEdges, getMetas,
  getProperty, getNextAwakenable, recordAwakening, isPropertyAwakened, getGuard, getGuardsByIsland,
  getConfigNum, bumpIslandLevel, bumpBossAttempt, getPurifiedBossCount, setExplorerLevelTitle,
  getGuards as getAllGuards,
} from "./repo";
import type { GuardInfo, Property } from "./types";
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

/** 记录一次答错（选错时调用，写入错题集） */
export function recordMistake(metaId: string, question: string, userAnswer: string, correctAnswer: string): void {
  db.prepare("INSERT INTO mistake (user_id, meta_id, question, user_answer, correct_answer, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(getCurrentUser(), metaId, question, userAnswer, correctAnswer, new Date().toISOString());
}

/** 重做答对后，把该知识点的未掌握错题标记为已掌握 */
export function resolveMistakes(metaId: string): void {
  db.prepare("UPDATE mistake SET resolved = 1 WHERE user_id = ? AND meta_id = ? AND resolved = 0").run(getCurrentUser(), metaId);
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

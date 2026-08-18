import db from "./db";
import type { MetaCognition, Monster, Spirit, Explorer, InternalizedMeta, GrowthLog, EvolutionEdge, Mistake, Property, Strategy, ConfigEntry, BossProgress, IslandLevel } from "./types";
import { parseBrainSettings, type BrainSettings } from "./brain";
import { cache } from "react";
import { computeRankLevel, getRankByLevel, getNextRank, formatRankProgress } from "./ranks";
import { getExplorerImage, getExplorerById } from "./explorers";
import { getCurrentUser } from "./session";
import {
  CONTENT_METAS,
  CONTENT_SPIRITS,
  CONTENT_MONSTERS,
  CONTENT_PROPERTIES,
  CONTENT_STRATEGIES,
  getMeta as getMetaContent,
  getMonster as getMonsterContent,
  getPropertiesByMeta as getPropertiesByMetaContent,
  getGuards as getGuardsContent,
  getGuard as getGuardContent,
  getGuardsByIsland as getGuardsByIslandContent,
  getIslandNames,
  spiritIdOf,
} from "./content";

// ============ 静态内容：全部走 lib/content.ts（内存常量，DB 不落库） ============
export { getMetas, getEvolutionEdges, getMonsters, getMonstersByIsland, getBossesByIsland, getBossByTarget, getSpirit, getProperties, getProperty, getPropertiesByMeta, getGuards, getGuard, getGuardsByIsland, getStrategies, getIslandNames as getIslandList, spiritIdOf } from "./content";

// ============ 探险家（按当前登录用户） ============
export function getExplorer(): Explorer | null {
  return db.prepare("SELECT * FROM explorer WHERE id = ?").get(getCurrentUser()) as Explorer | null;
}

export function setExplorerName(name: string) {
  db.prepare("UPDATE explorer SET name = ? WHERE id = ?").run(name, getCurrentUser());
}

export function setExplorerIsland(island: string) {
  db.prepare("UPDATE explorer SET current_island = ? WHERE id = ?").run(island, getCurrentUser());
}

/** 大脑编辑器设置（explorer.brain_settings，JSON） */
export function getBrainSettings(): BrainSettings {
  return parseBrainSettings(getExplorer()?.brain_settings);
}

export function setBrainSettings(s: BrainSettings) {
  db.prepare("UPDATE explorer SET brain_settings = ? WHERE id = ?").run(JSON.stringify(s), getCurrentUser());
}

// ============ 探险家 · 身份 / 等级 / 头衔 / 头像（第三轮） ============

/** 已净化 Boss 数（= 已内化元认知数，含 2 个初始起点岛） */
export function getPurifiedBossCount(): number {
  return (db.prepare("SELECT COUNT(*) AS c FROM internalized_meta WHERE user_id = ?").get(getCurrentUser()) as { c: number }).c;
}

/** 设置探险家性别 + 头像 id（onboarding 选角用） */
export function setExplorerGenderAvatar(gender: string, avatarId: string): void {
  db.prepare("UPDATE explorer SET gender = ?, avatar_id = ? WHERE id = ?").run(gender, avatarId, getCurrentUser());
}

/** 设置探险家等级 + 头衔（晋升用） */
export function setExplorerLevelTitle(level: number, title: string): void {
  db.prepare("UPDATE explorer SET level = ?, title = ? WHERE id = ?").run(level, title, getCurrentUser());
}

/** 探险家头像图片路径（按 gender + avatar_id 解析；缺省兜底 boy_1） */
export function getExplorerAvatarSrc(explorer?: Explorer | null): string {
  const id = explorer?.avatar_id ?? null;
  if (id) {
    const found = getExplorerById(id);
    if (found) return found.path;
  }
  const gender = (explorer?.gender as "boy" | "girl") ?? "boy";
  const idx = explorer?.avatar_id ? parseInt(explorer.avatar_id.split("_").pop() ?? "1", 10) || 1 : 1;
  return getExplorerImage(gender, idx);
}

export type ExplorerRankInfo = {
  level: number;
  title: string;
  purifiedBosses: number;
  sparks: number;
  next: ReturnType<typeof getNextRank>;
  progressText: string;
  /** 当前等级 → 下一级的进度百分比（0~100；满级=100） */
  progressPct: number;
};

/** 探险家等级 / 头衔 / 进度汇总（供 AvatarMenu / TopShell / 资料页读取） */
export function getExplorerRankInfo(): ExplorerRankInfo {
  const e = getExplorer();
  const purifiedBosses = getPurifiedBossCount();
  const sparks = (db.prepare("SELECT COALESCE(SUM(sparks), 0) AS s FROM curiosity_log WHERE user_id = ?").get(getCurrentUser()) as { s: number }).s;
  const currentLevel = e?.level ?? 1;
  const rank = getRankByLevel(currentLevel);
  const next = getNextRank(currentLevel);
  let progressPct = 100;
  if (next) {
    const bossSpan = next.threshold.purifiedBosses - rank.threshold.purifiedBosses;
    const sparkSpan = next.threshold.sparks - rank.threshold.sparks;
    const bossPct = bossSpan > 0 ? Math.min(100, ((purifiedBosses - rank.threshold.purifiedBosses) / bossSpan) * 100) : 100;
    const sparkPct = sparkSpan > 0 ? Math.min(100, ((sparks - rank.threshold.sparks) / sparkSpan) * 100) : 100;
    // 双轨：满足任一阈值即晋升 → 取两条进度中较大者
    progressPct = Math.max(0, Math.min(100, Math.max(bossPct, sparkPct)));
  }
  return {
    level: currentLevel,
    title: e?.title ?? rank.title,
    purifiedBosses,
    sparks,
    next,
    progressText: formatRankProgress(purifiedBosses, sparks),
    progressPct,
  };
}

// ============ 已内化（用户数据 ↔ 静态内容的内存合并，替代旧 SQL JOIN） ============
export function getInternalizedMetas(): MetaCognition[] {
  const rows = db
    .prepare("SELECT meta_id FROM internalized_meta WHERE user_id = ? ORDER BY acquired_at ASC")
    .all(getCurrentUser()) as { meta_id: string }[];
  return rows.map((r) => getMetaContent(r.meta_id)).filter((m): m is MetaCognition => !!m);
}

export function isInternalized(metaId: string): boolean {
  const r = db.prepare("SELECT 1 FROM internalized_meta WHERE user_id = ? AND meta_id = ?").get(getCurrentUser(), metaId);
  return !!r;
}

export function getInternalized(metaId: string): InternalizedMeta | null {
  return db
    .prepare("SELECT * FROM internalized_meta WHERE user_id = ? AND meta_id = ?")
    .get(getCurrentUser(), metaId) as InternalizedMeta | null;
}

export function getSpiritsForInternalized(): Spirit[] {
  const rows = db
    .prepare("SELECT meta_id FROM internalized_meta WHERE user_id = ? ORDER BY acquired_at ASC")
    .all(getCurrentUser()) as { meta_id: string }[];
  return rows.map((r) => CONTENT_SPIRITS.find((s) => s.meta_id === r.meta_id)).filter((s): s is Spirit => !!s);
}

/** 精灵队伍卡片数据：精灵 + 元认知名 + 熟练度（1:1 元认知） */
export type SpiritCard = {
  id: string;
  meta_id: string;
  emoji: string;
  nickname: string | null;
  meta_name: string;
  meaning: string;
  mastery_level: number;
  mastery_xp: number;
};

export function getSpiritCards(): SpiritCard[] {
  const rows = db
    .prepare("SELECT meta_id, mastery_level, mastery_xp FROM internalized_meta WHERE user_id = ? ORDER BY acquired_at ASC")
    .all(getCurrentUser()) as { meta_id: string; mastery_level: number; mastery_xp: number }[];
  return rows.map((r) => {
    const s = CONTENT_SPIRITS.find((x) => x.meta_id === r.meta_id);
    const m = getMetaContent(r.meta_id);
    return {
      id: s?.id ?? spiritIdOf(r.meta_id),
      meta_id: r.meta_id,
      emoji: s?.emoji ?? "❓",
      nickname: s?.nickname ?? null,
      meta_name: m?.name ?? r.meta_id,
      meaning: m?.meaning ?? "",
      mastery_level: r.mastery_level,
      mastery_xp: r.mastery_xp,
    };
  });
}

// ============ 群岛世界 ============
export type IslandInfo = { name: string; unlocked: boolean };

/**
 * 全部岛屿（按谱系顺序：计数岛 → 位值岛 → 加法岛 → …，数字序）。
 * 解锁规则：岛名去掉"岛"就是元认知名（加法岛 ↔ MK-03 加法），
 * 该元认知已内化（= 对应渡海 Boss 被净化过）即解锁。起点岛（计数/图形认识）初始内化。
 */
export function getIslands(): IslandInfo[] {
  const names = getIslandNames();
  const byName = new Map(CONTENT_METAS.map((m) => [m.name, m.id]));
  return names
    .map((name) => {
      const metaId = byName.get(name.replace(/岛$/, "")) ?? "ZZ";
      return {
        name,
        unlocked: metaId !== "ZZ" && isInternalized(metaId),
      };
    });
}

// ============ 成长日志 ============
export function getGrowthLogs(limit = 50): GrowthLog[] {
  return db
    .prepare("SELECT * FROM growth_log WHERE user_id = ? ORDER BY id DESC LIMIT ?")
    .all(getCurrentUser(), limit) as GrowthLog[];
}

// ============ 错题集 ============
export function getMistakes(limit = 200): Mistake[] {
  return db
    .prepare("SELECT * FROM mistake WHERE user_id = ? ORDER BY id DESC LIMIT ?")
    .all(getCurrentUser(), limit) as Mistake[];
}

/** 未掌握的错题数（用于展示「错题本里有几道题待复习」） */
export function getUnresolvedMistakeCount(): number {
  const r = db
    .prepare("SELECT COUNT(*) AS c FROM mistake WHERE user_id = ? AND resolved = 0")
    .get(getCurrentUser()) as { c: number };
  return r.c;
}

// ============ 第二阶段 · 性质 / 觉醒 ============

/** 该性质是否已被觉醒（打赢守卫） */
export function isPropertyAwakened(propertyId: string): boolean {
  return !!db
    .prepare("SELECT 1 FROM internalized_property WHERE user_id = ? AND property_id = ?")
    .get(getCurrentUser(), propertyId);
}

export function isPropertyAwakenedByMeta(metaId: string, propertyId: string): boolean {
  return !!db
    .prepare("SELECT 1 FROM internalized_property WHERE user_id = ? AND spirit_id = ? AND property_id = ?")
    .get(getCurrentUser(), spiritIdOf(metaId), propertyId);
}

/** 该精灵是否有任意性质已觉醒（用于决定是否能展示「完全体」形态） */
export function getMetaAwakened(metaId: string): boolean {
  return !!db
    .prepare("SELECT 1 FROM internalized_property WHERE user_id = ? AND spirit_id = ?")
    .get(getCurrentUser(), spiritIdOf(metaId));
}

export function getAwakenedPropertyIds(): string[] {
  return (db
    .prepare("SELECT property_id FROM internalized_property WHERE user_id = ?")
    .all(getCurrentUser()) as { property_id: string }[]).map((r) => r.property_id);
}

/** 某精灵已觉醒的性质（按顺序） */
export function getAwakenedPropertiesByMeta(metaId: string): Property[] {
  const rows = db
    .prepare("SELECT property_id FROM internalized_property WHERE user_id = ? AND spirit_id = ?")
    .all(getCurrentUser(), spiritIdOf(metaId)) as { property_id: string }[];
  return rows
    .map((r) => CONTENT_PROPERTIES.find((p) => p.id === r.property_id))
    .filter((p): p is Property => !!p)
    .sort((a, b) => a.order - b.order);
}

/**
 * 该精灵下一档可觉醒的性质（教育顺序，不跳序）：
 * 已觉醒跳过；等级门槛 = order + 1（第 1 条 Lv2、第 2 条 Lv3、第 3 条 Lv4），
 * 门槛未到则后续也不会到，返回 null。
 */
export function getNextAwakenable(metaId: string, level: number): Property | null {
  const props = getPropertiesByMetaContent(metaId);
  for (const p of props) {
    if (isPropertyAwakenedByMeta(metaId, p.id)) continue;
    if (p.order + 1 > level) return null;
    return p;
  }
  return null;
}

/** 觉醒记录（打赢守卫调用） */
export function recordAwakening(metaId: string, propertyId: string, source: string): void {
  db.prepare(
    "INSERT OR REPLACE INTO internalized_property (user_id, spirit_id, property_id, awakened_at, source) VALUES (?, ?, ?, ?, ?)"
  ).run(getCurrentUser(), spiritIdOf(metaId), propertyId, new Date().toISOString(), source);
}

// ============ 第二阶段 · 岛屿等级 ============
export function getIslandLevel(island: string): number {
  return (db.prepare("SELECT level FROM island_level WHERE user_id = ? AND island = ?").get(getCurrentUser(), island) as IslandLevel | undefined)?.level ?? 1;
}

/** 全部岛屿等级一次拉全量（首页 29 岛渲染用，避免循环内逐岛查询） */
export function getAllIslandLevels(): Record<string, number> {
  const rows = db.prepare("SELECT island, level FROM island_level WHERE user_id = ?").all(getCurrentUser()) as IslandLevel[];
  const map: Record<string, number> = {};
  for (const r of rows) map[r.island] = r.level;
  return map;
}

export function setIslandLevel(island: string, level: number): void {
  db.prepare("INSERT OR REPLACE INTO island_level (user_id, island, level) VALUES (?, ?, ?)").run(getCurrentUser(), island, Math.max(1, Math.floor(level)));
}

/** 守卫打赢 → 岛等级 +1，返回新等级 */
export function bumpIslandLevel(island: string): number {
  const next = getIslandLevel(island) + 1;
  setIslandLevel(island, next);
  return next;
}

// ============ 第二阶段 · 参数化 config（全局，非用户级） ============
export function getConfig(key: string, fallback: string): string {
  return (db.prepare("SELECT value FROM config WHERE key = ?").get(key) as ConfigEntry | undefined)?.value ?? fallback;
}

export function getConfigNum(key: string, fallback: number): number {
  const v = parseFloat(getConfig(key, String(fallback)));
  return Number.isFinite(v) ? v : fallback;
}

export function setConfig(key: string, value: string): void {
  db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)").run(key, value);
}

export function getAllConfig(): Record<string, string> {
  const rows = db.prepare("SELECT key, value FROM config").all() as ConfigEntry[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ============ 第二阶段 · Boss 失败计数（卡关退路） ============
export function getBossAttempts(bossId: string): number {
  return (db.prepare("SELECT attempt_count FROM boss_progress WHERE user_id = ? AND boss_id = ?").get(getCurrentUser(), bossId) as BossProgress | undefined)
    ?.attempt_count ?? 0;
}

/** Boss 失败 +1，返回累计次数 */
export function bumpBossAttempt(bossId: string): number {
  const n = getBossAttempts(bossId) + 1;
  db.prepare("INSERT OR REPLACE INTO boss_progress (user_id, boss_id, attempt_count, last_attempt_at) VALUES (?, ?, ?, ?)").run(
    getCurrentUser(),
    bossId,
    n,
    new Date().toISOString()
  );
  return n;
}

// ============ 第二阶段 · 策略 ============
export function getInternalizedStrategies(): string[] {
  return (db.prepare("SELECT strategy_id FROM internalized_strategy WHERE user_id = ?").all(getCurrentUser()) as { strategy_id: string }[]).map(
    (r) => r.strategy_id
  );
}

// 保持旧导出兼容：content 的 getMeta/getMonster 等已 re-export（见文件头部），
// 但 repo 内部此前直接引用的名称在此统一再暴露一次，避免调用点遗漏
export const getMeta = getMetaContent;
export const getMonster = getMonsterContent;

// ============ 登录页 · 用户档案列表（全部用户，含旧库 default 档案） ============
export type UserBrief = {
  id: string;
  name: string;
  gender: string | null;
  avatar_id: string | null;
  level: number;
  title: string | null;
};

export function getUsers(): UserBrief[] {
  const rows = db
    .prepare("SELECT id, name, gender, avatar_id, level, title FROM explorer ORDER BY level DESC, name")
    .all() as UserBrief[];
  // node:sqlite 行对象非 plain object，显式映射后才能在 server → client 间传递
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    gender: r.gender,
    avatar_id: r.avatar_id,
    level: r.level,
    title: r.title,
  }));
}

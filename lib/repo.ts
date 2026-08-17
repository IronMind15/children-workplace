import db from "./db";
import type { MetaCognition, Monster, Spirit, Explorer, InternalizedMeta, GrowthLog, EvolutionEdge, Mistake, Property, Strategy, ConfigEntry, BossProgress, IslandLevel } from "./types";
import { parseBrainSettings, type BrainSettings } from "./brain";
import { cache } from "react";
import { computeRankLevel, getRankByLevel, getNextRank, formatRankProgress } from "./ranks";
import { getExplorerImage, getExplorerById } from "./explorers";

// ============ 性能：高频只读查询用 React cache() 做「同请求去重」 ============
// 首页/图鉴等会对同一数据查多次（getMetas/getIslands/getEvolutionEdges…），
// cache() 保证同一请求生命周期内只查一次 DB，显著减少 SQLite 调用。
// 只包「纯只读」函数——写后同请求再读的（internalized_meta 相关）不包，避免旧值。

// ============ 探险家 ============
export function getExplorer(): Explorer | null {
  return db.prepare("SELECT * FROM explorer WHERE id = 'default'").get() as Explorer | null;
}

export function setExplorerName(name: string) {
  db.prepare("UPDATE explorer SET name = ? WHERE id = 'default'").run(name);
}

export function setExplorerIsland(island: string) {
  db.prepare("UPDATE explorer SET current_island = ? WHERE id = 'default'").run(island);
}

/** 大脑编辑器设置（explorer.brain_settings，JSON） */
export function getBrainSettings(): BrainSettings {
  return parseBrainSettings(getExplorer()?.brain_settings);
}

export function setBrainSettings(s: BrainSettings) {
  db.prepare("UPDATE explorer SET brain_settings = ? WHERE id = 'default'").run(JSON.stringify(s));
}

// ============ 探险家 · 身份 / 等级 / 头衔 / 头像（第三轮） ============

/** 已净化 Boss 数（= 已内化元认知数，含 2 个初始起点岛） */
export function getPurifiedBossCount(): number {
  return (db.prepare("SELECT COUNT(*) AS c FROM internalized_meta").get() as { c: number }).c;
}

/** 设置探险家性别 + 头像 id（onboarding 选角用） */
export function setExplorerGenderAvatar(gender: string, avatarId: string): void {
  db.prepare("UPDATE explorer SET gender = ?, avatar_id = ? WHERE id = 'default'").run(gender, avatarId);
}

/** 设置探险家等级 + 头衔（晋升用） */
export function setExplorerLevelTitle(level: number, title: string): void {
  db.prepare("UPDATE explorer SET level = ?, title = ? WHERE id = 'default'").run(level, title);
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
  const sparks = (db.prepare("SELECT COALESCE(SUM(sparks), 0) AS s FROM curiosity_log").get() as { s: number }).s;
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

// ============ 元认知 ============
export function getMeta(id: string): MetaCognition | null {
  return db.prepare("SELECT * FROM meta_cognition WHERE id = ?").get(id) as MetaCognition | null;
}

export const getMetas = cache((): MetaCognition[] => {
  // MK-id 数字序（MK-02 排在 MK-10 前，字典序会把 MK-10 排到 MK-02 前面）
  return db
    .prepare("SELECT * FROM meta_cognition ORDER BY CAST(SUBSTR(id, 4) AS INTEGER) ASC")
    .all() as MetaCognition[];
});

/** 进化路线（全部边） */
export const getEvolutionEdges = cache((): EvolutionEdge[] => {
  return db
    .prepare("SELECT * FROM evolution_edge ORDER BY CAST(SUBSTR(from_meta, 4) AS INTEGER), CAST(SUBSTR(to_meta, 4) AS INTEGER)")
    .all() as EvolutionEdge[];
});

/** 全部怪物（Boss / 小怪 / 隐藏 / 守卫）—— 一次拉全量，页面内分组避免逐岛查询 */
export const getMonsters = cache(() => db.prepare("SELECT * FROM monster").all() as Monster[]);

/** 已内化的元认知（= 已拥有的精灵） */
export function getInternalizedMetas(): MetaCognition[] {
  return db
    .prepare("SELECT mc.* FROM internalized_meta im JOIN meta_cognition mc ON mc.id = im.meta_id ORDER BY im.acquired_at ASC")
    .all() as MetaCognition[];
}

export function isInternalized(metaId: string): boolean {
  const r = db.prepare("SELECT 1 FROM internalized_meta WHERE meta_id = ?").get(metaId);
  return !!r;
}

export function getInternalized(metaId: string): InternalizedMeta | null {
  return db.prepare("SELECT * FROM internalized_meta WHERE meta_id = ?").get(metaId) as InternalizedMeta | null;
}

// ============ 精灵 ============
export function getSpirit(metaId: string): Spirit | null {
  return db.prepare("SELECT * FROM spirit WHERE meta_id = ?").get(metaId) as Spirit | null;
}

export function getSpiritsForInternalized(): Spirit[] {
  return db
    .prepare("SELECT s.* FROM internalized_meta im JOIN spirit s ON s.meta_id = im.meta_id ORDER BY im.acquired_at ASC")
    .all() as Spirit[];
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
  return db
    .prepare(
      `SELECT s.id, s.meta_id, s.emoji, s.nickname,
              mc.name AS meta_name, mc.meaning,
              im.mastery_level, im.mastery_xp
       FROM internalized_meta im
       JOIN spirit s ON s.meta_id = im.meta_id
       JOIN meta_cognition mc ON mc.id = im.meta_id
       ORDER BY im.acquired_at ASC`
    )
    .all() as SpiritCard[];
}

// ============ 怪物 ============
export function getMonster(id: string): Monster | null {
  return db.prepare("SELECT * FROM monster WHERE id = ?").get(id) as Monster | null;
}

export function getMonstersByIsland(island: string): Monster[] {
  return db.prepare("SELECT * FROM monster WHERE island = ?").all(island) as Monster[];
}

/** 某岛的渡海 Boss（type=boss，用于进化到下一岛）；可能有多只 */
export function getBossesByIsland(island: string): Monster[] {
  return db.prepare("SELECT * FROM monster WHERE island = ? AND type = 'boss'").all(island) as Monster[];
}

/** 某岛的渡海 Boss（取第一只，兼容旧调用） */
export function getBossByIsland(island: string): Monster | null {
  return getBossesByIsland(island)[0] ?? null;
}

/** 目标是某个元认知的渡海 Boss（净化它 = 解锁该元认知），无则 null（如位值支线） */
export function getBossByTarget(metaId: string): Monster | null {
  return db
    .prepare("SELECT * FROM monster WHERE type = 'boss' AND target_meta = ?")
    .get(metaId) as Monster | null;
}

// ============ 群岛世界 ============
export type IslandInfo = { name: string; unlocked: boolean };

/**
 * 全部岛屿（按谱系顺序：计数岛 → 位值岛 → 加法岛 → …，数字序）。
 * 解锁规则：岛名去掉"岛"就是元认知名（加法岛 ↔ MK-03 加法），
 * 该元认知已内化（= 对应渡海 Boss 被净化过）即解锁。起点岛（计数/图形认识）初始内化。
 */
export function getIslands(): IslandInfo[] {
  const rows = db
    .prepare("SELECT DISTINCT island FROM monster WHERE island != ''")
    .all() as { island: string }[];
  const metas = getMetas();
  const byName = new Map(metas.map((m) => [m.name, m.id]));
  const mkNum = (id: string) => parseInt(id.slice(3), 10) || 999;
  return rows
    .map((r) => {
      const metaId = byName.get(r.island.replace(/岛$/, "")) ?? "ZZ";
      return {
        name: r.island,
        unlocked: metaId !== "ZZ" && isInternalized(metaId),
        _order: mkNum(metaId),
      };
    })
    .sort((a, b) => a._order - b._order)
    .map(({ name, unlocked }) => ({ name, unlocked }));
}

// ============ 成长日志 ============
export function getGrowthLogs(limit = 50): GrowthLog[] {
  return db.prepare("SELECT * FROM growth_log ORDER BY id DESC LIMIT ?").all(limit) as GrowthLog[];
}

// ============ 错题集 ============
export function getMistakes(limit = 200): Mistake[] {
  return db.prepare("SELECT * FROM mistake ORDER BY id DESC LIMIT ?").all(limit) as Mistake[];
}

/** 未掌握的错题数（用于展示「错题本里有几道题待复习」） */
export function getUnresolvedMistakeCount(): number {
  const r = db.prepare("SELECT COUNT(*) AS c FROM mistake WHERE resolved = 0").get() as { c: number };
  return r.c;
}

// ============ 第二阶段 · 性质 / 觉醒 ============
/** 精灵 id（1:1 元认知，规则同 seed：SP-{编号}） */
export const spiritIdOf = (metaId: string) => `SP-${metaId.slice(3)}`;

export function getProperties(): Property[] {
  return db.prepare("SELECT * FROM property ORDER BY CAST(SUBSTR(id, 4) AS INTEGER)").all() as Property[];
}

export function getProperty(id: string): Property | null {
  return db.prepare("SELECT * FROM property WHERE id = ?").get(id) as Property | null;
}

/** 某元认知的全部性质（按觉醒顺序） */
export function getPropertiesByMeta(metaId: string): Property[] {
  return db
    .prepare('SELECT * FROM property WHERE belongs_to LIKE ? ORDER BY "order" ASC')
    .all(`%${metaId}%`) as Property[];
}

/** 该性质是否已被觉醒（打赢守卫） */
export function isPropertyAwakened(propertyId: string): boolean {
  return !!db.prepare("SELECT 1 FROM internalized_property WHERE property_id = ?").get(propertyId);
}

export function isPropertyAwakenedByMeta(metaId: string, propertyId: string): boolean {
  return !!db
    .prepare("SELECT 1 FROM internalized_property WHERE spirit_id = ? AND property_id = ?")
    .get(spiritIdOf(metaId), propertyId);
}

export function getAwakenedPropertyIds(): string[] {
  return (db.prepare("SELECT property_id FROM internalized_property").all() as { property_id: string }[]).map(
    (r) => r.property_id
  );
}

/** 某精灵已觉醒的性质（按顺序） */
export function getAwakenedPropertiesByMeta(metaId: string): Property[] {
  return db
    .prepare(
      `SELECT p.* FROM property p JOIN internalized_property ip ON ip.property_id = p.id
       WHERE ip.spirit_id = ? ORDER BY p."order" ASC`
    )
    .all(spiritIdOf(metaId)) as Property[];
}

/**
 * 该精灵下一档可觉醒的性质（教育顺序，不跳序）：
 * 已觉醒跳过；等级门槛 = order + 1（第 1 条 Lv2、第 2 条 Lv3、第 3 条 Lv4），
 * 门槛未到则后续也不会到，返回 null。
 */
export function getNextAwakenable(metaId: string, level: number): Property | null {
  const props = getPropertiesByMeta(metaId);
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
    "INSERT OR REPLACE INTO internalized_property (spirit_id, property_id, awakened_at, source) VALUES (?, ?, ?, ?)"
  ).run(spiritIdOf(metaId), propertyId, new Date().toISOString(), source);
}

// ============ 第二阶段 · 知识守卫 ============
export function getGuards(): Monster[] {
  return db.prepare("SELECT * FROM monster WHERE type = 'guard'").all() as Monster[];
}

export function getGuard(id: string): Monster | null {
  return db.prepare("SELECT * FROM monster WHERE id = ?").get(id) as Monster | null;
}

export function getGuardsByIsland(island: string): Monster[] {
  return db.prepare("SELECT * FROM monster WHERE type = 'guard' AND island = ?").all(island) as Monster[];
}

// ============ 第二阶段 · 岛屿等级 ============
export function getIslandLevel(island: string): number {
  return (db.prepare("SELECT level FROM island_level WHERE island = ?").get(island) as IslandLevel | undefined)?.level ?? 1;
}

/** 全部岛屿等级一次拉全量（首页 29 岛渲染用，避免循环内逐岛查询） */
export function getAllIslandLevels(): Record<string, number> {
  const rows = db.prepare("SELECT island, level FROM island_level").all() as IslandLevel[];
  const map: Record<string, number> = {};
  for (const r of rows) map[r.island] = r.level;
  return map;
}

export function setIslandLevel(island: string, level: number): void {
  db.prepare("INSERT OR REPLACE INTO island_level (island, level) VALUES (?, ?)").run(island, Math.max(1, Math.floor(level)));
}

/** 守卫打赢 → 岛等级 +1，返回新等级 */
export function bumpIslandLevel(island: string): number {
  const next = getIslandLevel(island) + 1;
  setIslandLevel(island, next);
  return next;
}

// ============ 第二阶段 · 参数化 config ============
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
  return (db.prepare("SELECT attempt_count FROM boss_progress WHERE boss_id = ?").get(bossId) as BossProgress | undefined)
    ?.attempt_count ?? 0;
}

/** Boss 失败 +1，返回累计次数 */
export function bumpBossAttempt(bossId: string): number {
  const n = getBossAttempts(bossId) + 1;
  db.prepare("INSERT OR REPLACE INTO boss_progress (boss_id, attempt_count, last_attempt_at) VALUES (?, ?, ?)").run(
    bossId,
    n,
    new Date().toISOString()
  );
  return n;
}

// ============ 第二阶段 · 策略 ============
export function getStrategies(): Strategy[] {
  return db.prepare("SELECT * FROM strategy ORDER BY CAST(SUBSTR(id, 4) AS INTEGER)").all() as Strategy[];
}

export function getInternalizedStrategies(): string[] {
  return (db.prepare("SELECT strategy_id FROM internalized_strategy").all() as { strategy_id: string }[]).map(
    (r) => r.strategy_id
  );
}

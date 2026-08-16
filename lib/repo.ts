import db from "./db";
import type { MetaCognition, Monster, Spirit, Explorer, InternalizedMeta, GrowthLog, EvolutionEdge, Mistake } from "./types";
import { parseBrainSettings, type BrainSettings } from "./brain";

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

// ============ 元认知 ============
export function getMeta(id: string): MetaCognition | null {
  return db.prepare("SELECT * FROM meta_cognition WHERE id = ?").get(id) as MetaCognition | null;
}

export function getMetas(): MetaCognition[] {
  // MK-id 数字序（MK-02 排在 MK-10 前，字典序会把 MK-10 排到 MK-02 前面）
  return db
    .prepare("SELECT * FROM meta_cognition ORDER BY CAST(SUBSTR(id, 4) AS INTEGER) ASC")
    .all() as MetaCognition[];
}

/** 进化路线（全部边） */
export function getEvolutionEdges(): EvolutionEdge[] {
  return db
    .prepare("SELECT * FROM evolution_edge ORDER BY CAST(SUBSTR(from_meta, 4) AS INTEGER), CAST(SUBSTR(to_meta, 4) AS INTEGER)")
    .all() as EvolutionEdge[];
}

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

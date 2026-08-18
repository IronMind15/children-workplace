import { cache } from "react";
import {
  WORLD_METAS,
  WORLD_EDGES,
  WORLD_SPIRITS,
  WORLD_PROPERTIES,
  WORLD_STRATEGIES,
  WORLD_MONSTERS,
} from "./seed";
import type { MetaCognition, EvolutionEdge, Monster, Spirit, Property, Strategy } from "./types";

/**
 * 静态内容内存源（方案 B：内容代码化）。
 * 全部游戏静态内容（29 元认知 / 31 进化边 / 29 精灵 / 126 怪 / 30 性质 / 19 策略）
 * 由 lib/seed.ts 常量构建，DB 不再落库 → 升级内容 = 改代码发版本，玩家数据零接触。
 * 形状与旧 DB 表完全一致（monster 的 options/steps/required_metas 等为 JSON 字符串）。
 */

const mkNum = (id: string) => parseInt(id.slice(3), 10) || 999;

/** 元认知（MK 数字序，与旧库查询排序一致） */
export const CONTENT_METAS: MetaCognition[] = [...WORLD_METAS]
  .sort((a, b) => mkNum(a.id) - mkNum(b.id))
  .map((m) => ({ id: m.id, name: m.name, meaning: m.meaning, domain: m.domain, is_mvp: m.isMvp }));

/** 进化边（按 from/to 数字序，与旧库一致） */
export const CONTENT_EDGES: EvolutionEdge[] = [...WORLD_EDGES].sort(
  (a, b) => mkNum(a.from_meta) - mkNum(b.from_meta) || mkNum(a.to_meta) - mkNum(b.to_meta)
);

export const CONTENT_SPIRITS: Spirit[] = [...WORLD_SPIRITS];

export const CONTENT_MONSTERS: Monster[] = [...WORLD_MONSTERS];

/** 性质（PP 数字序；belongs_to 序列化为 JSON 数组字符串，与旧库一致） */
export const CONTENT_PROPERTIES: Property[] = [...WORLD_PROPERTIES]
  .sort((a, b) => mkNum(a.id) - mkNum(b.id))
  .map((p) => ({
    id: p.id,
    name: p.name,
    belongs_to: JSON.stringify(p.belongsTo),
    order: p.order,
    explain: p.explain ?? null,
  }));

export const CONTENT_STRATEGIES: Strategy[] = [...WORLD_STRATEGIES].sort((a, b) => mkNum(a.id) - mkNum(b.id));

const metaMap = new Map(CONTENT_METAS.map((m) => [m.id, m]));
const spiritMap = new Map(CONTENT_SPIRITS.map((s) => [s.meta_id, s]));
const monsterMap = new Map(CONTENT_MONSTERS.map((m) => [m.id, m]));
const propertyMap = new Map(CONTENT_PROPERTIES.map((p) => [p.id, p]));

// ============ 查询函数（与 repo 旧签名一致，供 repo/game/actions/页面复用） ============

export function getMeta(id: string): MetaCognition | null {
  return metaMap.get(id) ?? null;
}

export const getMetas = cache((): MetaCognition[] => CONTENT_METAS);

export const getEvolutionEdges = cache((): EvolutionEdge[] => CONTENT_EDGES);

export const getMonsters = cache((): Monster[] => CONTENT_MONSTERS);

export function getMonster(id: string): Monster | null {
  return monsterMap.get(id) ?? null;
}

export function getMonstersByIsland(island: string): Monster[] {
  return CONTENT_MONSTERS.filter((m) => m.island === island);
}

export function getBossesByIsland(island: string): Monster[] {
  return CONTENT_MONSTERS.filter((m) => m.island === island && m.type === "boss");
}

export function getBossByTarget(metaId: string): Monster | null {
  return CONTENT_MONSTERS.find((m) => m.type === "boss" && m.target_meta === metaId) ?? null;
}

export function getSpirit(metaId: string): Spirit | null {
  return spiritMap.get(metaId) ?? null;
}

export function getProperties(): Property[] {
  return CONTENT_PROPERTIES;
}

export function getProperty(id: string): Property | null {
  return propertyMap.get(id) ?? null;
}

/** 某元认知的全部性质（按觉醒顺序 order 升序） */
export function getPropertiesByMeta(metaId: string): Property[] {
  return CONTENT_PROPERTIES.filter((p) => {
    try {
      return (JSON.parse(p.belongs_to) as string[]).includes(metaId);
    } catch {
      return p.belongs_to === metaId;
    }
  }).sort((a, b) => a.order - b.order);
}

/** 全部知识守卫（type=guard） */
export function getGuards(): Monster[] {
  return CONTENT_MONSTERS.filter((m) => m.type === "guard");
}

export function getGuard(id: string): Monster | null {
  const m = monsterMap.get(id) ?? null;
  return m && m.type === "guard" ? m : null;
}

export function getGuardsByIsland(island: string): Monster[] {
  return CONTENT_MONSTERS.filter((m) => m.type === "guard" && m.island === island);
}

export function getStrategies(): Strategy[] {
  return CONTENT_STRATEGIES;
}

/** 全部岛屿名（按元认知数字序，来自怪物分布的 distinct island） */
export function getIslandNames(): string[] {
  const names = new Set(CONTENT_MONSTERS.filter((m) => m.island !== "").map((m) => m.island));
  return [...names].sort((a, b) => {
    const na = a.replace(/岛$/, "");
    const nb = b.replace(/岛$/, "");
    const ma = CONTENT_METAS.find((m) => m.name === na);
    const mb = CONTENT_METAS.find((m) => m.name === nb);
    return (ma ? mkNum(ma.id) : 999) - (mb ? mkNum(mb.id) : 999);
  });
}

/** 精灵 id（1:1 元认知，规则同 seed：SP-{编号}） */
export const spiritIdOf = (metaId: string) => `SP-${metaId.slice(3)}`;

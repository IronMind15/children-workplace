// 像素画定义：16x16 字符画（"." 为透明，其余字符查 palette 上色）
// 风格参考保卫萝卜 / 宝可梦：大眼睛、圆身体、高饱和配色

export type SpriteDef = {
  rows: string[];
  palette: Record<string, string>;
};

// ============ 模板 ============

// 史莱姆小怪：圆润身体 + 大眼 + 嘟嘴
const SLIME = [
  "................",
  "................",
  ".....DDDDDD.....",
  "....DBBBBBBD....",
  "...DBBBBBBBBD...",
  "..DBBBBBBBBBBD..",
  "..DBWWKBBKWWBD..",
  "..DBWWKBBKWWBD..",
  ".DBBBBBBBBBBBBD.",
  ".DBBCCBBBBCCBBD.",
  ".DBBBBKKKKBBBBD.",
  ".DBBBBBBBBBBBBD.",
  "..DBBBBBBBBBBD..",
  "..DDBBBBBBBBDD..",
  "...DDDDDDDDDD...",
  "................",
];

// 苹果小怪：带叶子的圆苹果
const APPLE = [
  ".......TT.......",
  ".......TT.......",
  "....LLLTT.......",
  "...LLLLTT.......",
  "...RRRRRRRRRR...",
  "..RRRRRRRRRRRR..",
  ".RRRRRRRRRRRRRR.",
  ".RRWWKRRRRKWWRR.",
  ".RRWWKRRRRKWWRR.",
  ".RRRRRRRRRRRRRR.",
  ".RRCCRRKKRRCCRR.",
  ".RRRRRKKKKRRRRR.",
  ".RRRRRRRRRRRRRR.",
  "..RRRRRRRRRRRR..",
  "...RRRRRRRRRR...",
  "....DDDDDDDD....",
];

// 渡海 Boss：长角獠牙的大家伙
const BOSSBEAST = [
  "..H..........H..",
  "..HH........HH..",
  "..HHD......DHH..",
  "...DPPPPPPPPD...",
  "..DPPPPPPPPPPD..",
  ".DPPPPPPPPPPPPD.",
  ".DPKWWPPPPWWKPD.",
  ".DPPWWPPPPWWPPD.",
  ".DPPPPPPPPPPPPD.",
  ".DPPKPKPKPKPKPD.",
  ".DPPKKKKKKKKPPD.",
  ".DPPWPWPWPWPPPD.",
  ".DPPPPPPPPPPPPD.",
  "..DPPPPPPPPPPD..",
  "..DDDPPPPPPDDD..",
  "...DDDDDDDDDD...",
];

// 精灵（我方伙伴）：竖耳朵小圆兽
const SPIRIT = [
  ".EE..........EE.",
  ".EEE........EEE.",
  ".EEEE......EEEE.",
  "..EEGGGGGGGGEE..",
  "..GGGGGGGGGGGG..",
  ".GGGGGGGGGGGGGG.",
  ".GGWWKGGGGKWWGG.",
  ".GGWWKGGGGKWWGG.",
  ".GGCCGGGGGGCCGG.",
  ".GGGGGKKKKGGGGG.",
  ".GGGGGGGGGGGGGG.",
  ".GGGGGGGGGGGGGG.",
  "..GGGGGGGGGGGG..",
  "..GGGGGGGGGGGG..",
  "...DGGGGGGGGD...",
  "....DDDDDDDD....",
];

// ============ 地图装饰 ============

const TREE = [
  "................",
  "................",
  ".....AAAAAA.....",
  "...AAAAAAAAAA...",
  "..AAAAAAAAAAAA..",
  "..AABAAAAAABAA..",
  ".AAAAAAAAAAAAAA.",
  ".AABAAAAAAAABAA.",
  ".AAAAAAAAAAAAAA.",
  "..AAAAAAAAAAAA..",
  "...AAABBBBAAA...",
  ".....NNNNNN.....",
  ".....NNNNNN.....",
  ".....NNNNNN.....",
  "....NNNNNNNN....",
  "...NNNNNNNNNN...",
];

const BUSH = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "....BBBBBBBB....",
  "..BBBBBBBBBBBB..",
  ".BBDBBBBBBBDBBB.",
  ".BBBBBBBBBBBBBB.",
  "..BBBBBBBBBBBB..",
  "...BBBBBBBBBB...",
  "................",
];

const ROCK = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......SSSS......",
  "....SSSSSSSS....",
  "...SSSSSSSSSS...",
  "..SSSSSSSSSSSS..",
  "..SSSSSSSSSSSS..",
  "................",
];

const FLOWER = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".......PP.......",
  "......PYYP......",
  "......PYYP......",
  ".......PP.......",
  ".......G........",
  ".......G........",
  "................",
];

// ============ 怪物配色（按 id，找不到时用默认） ============

const MONSTER_SPRITES: Record<string, SpriteDef> = {
  "minion-add-01": { rows: SLIME, palette: { B: "#5AB1E0", D: "#2F7FB5", W: "#FFFFFF", K: "#20304A", C: "#FFB3C1" } },
  "minion-add-02": { rows: APPLE, palette: { R: "#FF6B6B", D: "#D64545", L: "#6FBF4A", T: "#8B5A2B", W: "#FFFFFF", K: "#4A1520", C: "#FFD3DA" } },
  "minion-sub-01": { rows: SLIME, palette: { B: "#A78BE0", D: "#6F5BB8", W: "#FFFFFF", K: "#241A3A", C: "#FFB3C1" } },
  "minion-sub-02": { rows: APPLE, palette: { R: "#9CCC65", D: "#7CB342", L: "#66BB6A", T: "#795548", W: "#FFFFFF", K: "#2E3B1E", C: "#DCEDC8" } },
  "minion-mul-01": { rows: SLIME, palette: { B: "#FFA94D", D: "#F08C00", W: "#FFFFFF", K: "#4A2A08", C: "#FFD8A8" } },
  "minion-mul-02": { rows: SLIME, palette: { B: "#C89666", D: "#A0714B", W: "#FFFFFF", K: "#3A2513", C: "#FFD8A8" } },
  "boss-add": { rows: BOSSBEAST, palette: { P: "#FF8A65", D: "#E2582E", H: "#FFD54F", W: "#FFFFFF", K: "#3A1408" } },
  // 计数岛小怪（v2 补充）
  "minion-count-01": { rows: APPLE, palette: { R: "#FF8A80", D: "#E57373", L: "#81C784", T: "#8D6E63", W: "#FFFFFF", K: "#4E1B1B", C: "#FFD8D8" } },
  "minion-count-02": { rows: SLIME, palette: { B: "#FFF176", D: "#FDD835", W: "#FFFFFF", K: "#4A3A08", C: "#FFF59D" } },
  // 位值岛（v3 全岛屿拓展）
  "boss-place": { rows: BOSSBEAST, palette: { P: "#90CAF9", D: "#64B5F6", H: "#FFE082", W: "#FFFFFF", K: "#0D2440" } },
  "minion-place-01": { rows: SLIME, palette: { B: "#80DEEA", D: "#4DD0E1", W: "#FFFFFF", K: "#08333A", C: "#B2EBF2" } },
  "minion-place-02": { rows: APPLE, palette: { R: "#90A4AE", D: "#78909C", L: "#A1887F", T: "#5D4037", W: "#FFFFFF", K: "#263238", C: "#CFD8DC" } },
  "boss-sub": { rows: BOSSBEAST, palette: { P: "#7986CB", D: "#5C6BC0", H: "#B39DDB", W: "#FFFFFF", K: "#141A3A" } },
  "boss-mul": { rows: BOSSBEAST, palette: { P: "#4DB6AC", D: "#26A69A", H: "#FFE082", W: "#FFFFFF", K: "#0A2E2A" } },
  // 神秘小怪（好奇心火花解锁）
  "minion-why-01": { rows: SLIME, palette: { B: "#4DD0E1", D: "#26B0C4", W: "#FFFFFF", K: "#0A2E38", C: "#B2EBF2" } },
  "minion-riddle-01": { rows: APPLE, palette: { R: "#B39DDB", D: "#9575CD", L: "#8BC34A", T: "#5D4037", W: "#FFFFFF", K: "#241A3A", C: "#E1BEE7" } },
  "minion-star-01": { rows: SLIME, palette: { B: "#FFE082", D: "#FFCA28", W: "#FFFFFF", K: "#4A3A08", C: "#FFF3C4" } },
};

const DEFAULT_MONSTER: SpriteDef = { rows: SLIME, palette: { B: "#8FBF6A", D: "#6A9C4A", W: "#FFFFFF", K: "#2A3A1A", C: "#FFB3C1" } };

// ---- 兜底配色池：没有手绘皮肤的怪按 id 哈希取色（28 岛全员有独一无二的外观） ----
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

const SLIME_PALETTES: Record<string, string>[] = [
  { B: "#4DD0E1", D: "#26B0C4", W: "#FFFFFF", K: "#0A2E38", C: "#B2EBF2" },
  { B: "#FFB74D", D: "#FB8C00", W: "#FFFFFF", K: "#4E2A05", C: "#FFE0B2" },
  { B: "#AED581", D: "#8BC34A", W: "#FFFFFF", K: "#223312", C: "#DCEDC8" },
  { B: "#F48FB1", D: "#EC6B9B", W: "#FFFFFF", K: "#4A1028", C: "#FCE4EC" },
  { B: "#90CAF9", D: "#64B5F6", W: "#FFFFFF", K: "#0D2440", C: "#E3F2FD" },
  { B: "#B39DDB", D: "#9575CD", W: "#FFFFFF", K: "#241A3A", C: "#EDE7F6" },
  { B: "#FFF176", D: "#FDD835", W: "#FFFFFF", K: "#4A3A08", C: "#FFF9C4" },
  { B: "#FF8A65", D: "#F4511E", W: "#FFFFFF", K: "#3E1505", C: "#FFCCBC" },
];

const APPLE_PALETTES: Record<string, string>[] = [
  { R: "#EF5350", D: "#C62828", L: "#66BB6A", T: "#795548", W: "#FFFFFF", K: "#3E0A0A", C: "#FFCDD2" },
  { R: "#66BB6A", D: "#43A047", L: "#A5D6A7", T: "#6D4C41", W: "#FFFFFF", K: "#1B3A1B", C: "#C8E6C9" },
  { R: "#AB47BC", D: "#8E24AA", L: "#CE93D8", T: "#6D4C41", W: "#FFFFFF", K: "#33124A", C: "#E1BEE7" },
  { R: "#FFA726", D: "#F57C00", L: "#FFD54F", T: "#8D6E63", W: "#FFFFFF", K: "#4E2A05", C: "#FFE0B2" },
];

const BOSS_PALETTES: Record<string, string>[] = [
  { P: "#FF8A65", D: "#E2582E", H: "#FFD54F", W: "#FFFFFF", K: "#3A1408" },
  { P: "#7986CB", D: "#5C6BC0", H: "#B39DDB", W: "#FFFFFF", K: "#141A3A" },
  { P: "#4DB6AC", D: "#26A69A", H: "#FFE082", W: "#FFFFFF", K: "#0A2E2A" },
  { P: "#90CAF9", D: "#64B5F6", H: "#FFE082", W: "#FFFFFF", K: "#0D2440" },
  { P: "#F06292", D: "#D81B60", H: "#FFF176", W: "#FFFFFF", K: "#4A0A26" },
  { P: "#BA68C8", D: "#8E24AA", H: "#4DD0E1", W: "#FFFFFF", K: "#33124A" },
  { P: "#FFD54F", D: "#FFB300", H: "#FF7043", W: "#FFFFFF", K: "#4A3A08" },
  { P: "#8BC34A", D: "#558B2F", H: "#FFD54F", W: "#FFFFFF", K: "#22330F" },
];

export function getMonsterSprite(monsterId: string): SpriteDef {
  const hand = MONSTER_SPRITES[monsterId];
  if (hand) return hand;
  const h = hashStr(monsterId);
  if (monsterId.startsWith("boss-")) {
    return { rows: BOSSBEAST, palette: BOSS_PALETTES[h % BOSS_PALETTES.length] };
  }
  if (monsterId.startsWith("minion-")) {
    return h % 2 === 0
      ? { rows: SLIME, palette: SLIME_PALETTES[h % SLIME_PALETTES.length] }
      : { rows: APPLE, palette: APPLE_PALETTES[h % APPLE_PALETTES.length] };
  }
  return DEFAULT_MONSTER;
}

// ============ 精灵配色（按元认知 id） ============

const SPIRIT_COLORS: Record<string, { g: string; e: string; d: string }> = {
  "MK-01": { g: "#FFE082", e: "#FFCA28", d: "#E6A817" },
  "MK-02": { g: "#90CAF9", e: "#64B5F6", d: "#3E9BE0" },
  "MK-03": { g: "#FFAB91", e: "#FF8A65", d: "#F0704F" },
  "MK-04": { g: "#A5D6A7", e: "#81C784", d: "#5FB362" },
  "MK-05": { g: "#CE93D8", e: "#BA68C8", d: "#A050B0" },
  "MK-06": { g: "#4DD0E1", e: "#26C0C4", d: "#1B95A0" },
  "MK-07": { g: "#FFAB91", e: "#FF7043", d: "#E05325" },
  "MK-08": { g: "#FFE082", e: "#FFD54F", d: "#E8B820" },
  "MK-09": { g: "#F48FB1", e: "#EC6B9B", d: "#D14B82" },
  "MK-10": { g: "#90A4AE", e: "#78909C", d: "#5A6B76" },
  "MK-11": { g: "#A5D6A7", e: "#9CCC65", d: "#7CB342" },
  "MK-12": { g: "#FFCC80", e: "#FFB74D", d: "#F09A25" },
  "MK-13": { g: "#B3E5FC", e: "#81D4FA", d: "#4FC3F7" },
  "MK-14": { g: "#B39DDB", e: "#9575CD", d: "#7E57C2" },
  "MK-15": { g: "#81D4FA", e: "#4FC3F7", d: "#29B6F6" },
  "MK-16": { g: "#FFF59D", e: "#FFF176", d: "#FDD835" },
  "MK-17": { g: "#AED581", e: "#9CCC65", d: "#8BC34A" },
  "MK-18": { g: "#81C784", e: "#66BB6A", d: "#4CAF50" },
  "MK-19": { g: "#4FC3F7", e: "#29B6F6", d: "#039BE5" },
  "MK-20": { g: "#F48FB1", e: "#F06292", d: "#EC407A" },
  "MK-21": { g: "#FFD180", e: "#FFCA28", d: "#FFB300" },
  "MK-22": { g: "#DCE775", e: "#D4E157", d: "#C0CA33" },
  "MK-23": { g: "#FFAB40", e: "#FF9100", d: "#F57C00" },
  "MK-24": { g: "#A1887F", e: "#8D6E63", d: "#6D4C41" },
  "MK-25": { g: "#64B5F6", e: "#42A5F5", d: "#1E88E5" },
  "MK-26": { g: "#4DB6AC", e: "#26A69A", d: "#00897B" },
  "MK-27": { g: "#BA68C8", e: "#AB47BC", d: "#8E24AA" },
  "MK-28": { g: "#80DEEA", e: "#4DD0E1", d: "#26C6DA" },
};

const DEFAULT_SPIRIT_COLOR = { g: "#FFB74D", e: "#FFA726", d: "#EF8C00" };

export function getSpiritSprite(metaId: string): SpriteDef {
  const c = SPIRIT_COLORS[metaId] ?? DEFAULT_SPIRIT_COLOR;
  return {
    rows: SPIRIT,
    palette: { G: c.g, E: c.e, D: c.d, W: "#FFFFFF", K: "#26303F", C: "#FF9FB2" },
  };
}

// 伙伴狐狸（Boss 战里陪伴孩子的那只）：橙色精灵配色
export function getCompanionSprite(): SpriteDef {
  const c = DEFAULT_SPIRIT_COLOR;
  return {
    rows: SPIRIT,
    palette: { G: c.g, E: c.e, D: c.d, W: "#FFFFFF", K: "#26303F", C: "#FF9FB2" },
  };
}

// ============ 精灵进化阶段（熟练度等级 → 形态） ============
export type SpiritStage = { title: string; aura: boolean; crown: boolean; size: number };

/** Lv.1 宝宝体 → Lv.2 成长体（光环）→ Lv.3+ 完全体（皇冠） */
export function getSpiritStage(level: number): SpiritStage {
  if (level >= 3) return { title: "完全体", aura: true, crown: true, size: 88 };
  if (level === 2) return { title: "成长体", aura: true, crown: false, size: 76 };
  return { title: "宝宝体", aura: false, crown: false, size: 64 };
}

export function getDecorSprite(kind: "tree" | "bush" | "rock" | "flower"): SpriteDef {
  switch (kind) {
    case "tree":
      return { rows: TREE, palette: { A: "#3E9B4F", B: "#2F7A3D", N: "#8B5A2B" } };
    case "bush":
      return { rows: BUSH, palette: { B: "#57B85F", D: "#3E8F4A" } };
    case "rock":
      return { rows: ROCK, palette: { S: "#AEB8BF" } };
    case "flower":
      return { rows: FLOWER, palette: { P: "#FF8FB1", Y: "#FFD54F", G: "#57B85F" } };
  }
}

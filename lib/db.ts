import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// 数据库文件放 data/ 下（运行时生成，gitignore）
const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

// 构建阶段（next build 会用 15 个 worker 并发加载本模块）：只读打开 + 跳过建表，
// 避免多进程并发执行 CREATE TABLE（写事务）在 DELETE 模式下竞争，
// 留下 0 字节 app.db-journal 导致运行时所有写库报 readonly(errcode 8)。
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

export const db = new DatabaseSync(path.join(dataDir, "app_data.db"), {
  readOnly: isBuildPhase,
});

// 并发场景（如 next build 多 worker）下，锁等待重试而不是立即报 database is locked
db.exec("PRAGMA busy_timeout = 5000;");

if (!isBuildPhase) {
  // 自愈：清理上次异常退出残留的 0 字节 journal（否则 SQLite 写事务报 readonly）
  try {
    fs.rmSync(path.join(dataDir, "app_data.db-journal"), { force: true });
  } catch {
    /* 忽略 */
  }
  db.exec(`
  PRAGMA journal_mode = DELETE;

  CREATE TABLE IF NOT EXISTS meta_cognition (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    meaning TEXT NOT NULL,
    domain TEXT NOT NULL,
    is_mvp INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS evolution_edge (
    id TEXT PRIMARY KEY,
    from_meta TEXT NOT NULL,
    to_meta TEXT NOT NULL,
    operator TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS property (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    belongs_to TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    explain TEXT
  );

  CREATE TABLE IF NOT EXISTS strategy (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    effect TEXT NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS monster (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    island TEXT NOT NULL,
    question TEXT NOT NULL,
    correct_meta TEXT,
    target_meta TEXT,
    prerequisites TEXT,
    options TEXT,
    steps TEXT,
    required_metas TEXT,
    required_level INTEGER,
    spawn_mode TEXT,
    spawn_islands TEXT
  );

  CREATE TABLE IF NOT EXISTS spirit (
    id TEXT PRIMARY KEY,
    meta_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    nickname TEXT
  );

  CREATE TABLE IF NOT EXISTS explorer (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brain_settings TEXT,
    current_island TEXT
  );

  CREATE TABLE IF NOT EXISTS internalized_meta (
    meta_id TEXT PRIMARY KEY,
    acquired_at TEXT NOT NULL,
    source TEXT,
    mastery_level INTEGER NOT NULL DEFAULT 1,
    mastery_xp INTEGER NOT NULL DEFAULT 0
  );

  -- 觉醒进度：打赢知识守卫 = 觉醒该性质（精灵镀金）
  CREATE TABLE IF NOT EXISTS internalized_property (
    spirit_id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    awakened_at TEXT NOT NULL,
    source TEXT,
    PRIMARY KEY (spirit_id, property_id)
  );

  -- 连招进度（策略掌握度）
  CREATE TABLE IF NOT EXISTS internalized_strategy (
    strategy_id TEXT PRIMARY KEY,
    mastery INTEGER NOT NULL DEFAULT 0
  );

  -- 岛屿等级（守卫打赢 → level+1 → 解锁进阶练习）
  CREATE TABLE IF NOT EXISTS island_level (
    island TEXT PRIMARY KEY,
    level INTEGER NOT NULL DEFAULT 1
  );

  -- 参数化配置（升级场次 / 题目数量公式 / 难度权重 / 觉醒门槛 / 广播开关）
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Boss 失败计数（卡关退路判定：同 Boss 失败 ≥2）
  CREATE TABLE IF NOT EXISTS boss_progress (
    boss_id TEXT PRIMARY KEY,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TEXT
  );

  CREATE TABLE IF NOT EXISTS growth_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS curiosity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,
    label TEXT NOT NULL,
    sparks INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
    api_key TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mistake (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meta_id TEXT NOT NULL,
    question TEXT NOT NULL,
    user_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    created_at TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0
  );
`);
}

export default db;

// 老库兼容：难度微调偏置列（已存在的库没有这列，新建库也不需要，故单独容错补列）
try {
  db.exec("ALTER TABLE explorer ADD COLUMN difficulty_bias INTEGER NOT NULL DEFAULT 0");
} catch {
  // 列已存在则忽略
}

// 老库兼容：property / strategy / monster 新列（老库已建表，CREATE TABLE IF NOT EXISTS 不会补列）
try {
  db.exec("ALTER TABLE property ADD COLUMN \"order\" INTEGER NOT NULL DEFAULT 0");
} catch {
  /* 已存在 */
}
try {
  db.exec("ALTER TABLE property ADD COLUMN explain TEXT");
} catch {
  /* 已存在 */
}
try {
  db.exec("ALTER TABLE strategy ADD COLUMN tier INTEGER NOT NULL DEFAULT 1");
} catch {
  /* 已存在 */
}
try {
  db.exec("ALTER TABLE monster ADD COLUMN required_metas TEXT");
} catch {
  /* 已存在 */
}
try {
  db.exec("ALTER TABLE monster ADD COLUMN required_level INTEGER");
} catch {
  /* 已存在 */
}
try {
  db.exec("ALTER TABLE monster ADD COLUMN spawn_mode TEXT");
} catch {
  /* 已存在 */
}
try {
  db.exec("ALTER TABLE monster ADD COLUMN spawn_islands TEXT");
} catch {
  /* 已存在 */
}

// 老库兼容：探险家身份与等级（第三轮 · 头像选角 + 等级头衔）
try {
  db.exec("ALTER TABLE explorer ADD COLUMN gender TEXT");
} catch {
  /* 已存在 */
}
try {
  db.exec("ALTER TABLE explorer ADD COLUMN avatar_id TEXT");
} catch {
  /* 已存在 */
}
try {
  db.exec("ALTER TABLE explorer ADD COLUMN level INTEGER NOT NULL DEFAULT 1");
} catch {
  /* 已存在 */
}
try {
  db.exec("ALTER TABLE explorer ADD COLUMN xp INTEGER NOT NULL DEFAULT 0");
} catch {
  /* 已存在 */
}
try {
  db.exec("ALTER TABLE explorer ADD COLUMN title TEXT");
} catch {
  /* 已存在 */
}


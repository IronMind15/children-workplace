import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// 数据库文件放 data/ 下（运行时生成，gitignore）
const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "app.db"));

// 并发场景（如 next build 多 worker）下，锁等待重试而不是立即报 database is locked
db.exec("PRAGMA busy_timeout = 5000;");

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
    belongs_to TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS strategy (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    effect TEXT NOT NULL
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
    steps TEXT
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

export default db;

// 老库兼容：难度微调偏置列（已存在的库没有这列，新建库也不需要，故单独容错补列）
try {
  db.exec("ALTER TABLE explorer ADD COLUMN difficulty_bias INTEGER NOT NULL DEFAULT 0");
} catch {
  // 列已存在则忽略
}


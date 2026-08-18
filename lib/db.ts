import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// 数据库文件放 data/ 下（运行时生成，gitignore 整目录排除）
const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

// 构建阶段（next build 会用多个 worker 并发加载本模块）：只读打开 + 跳过建表/迁移，
// 避免多进程并发执行写事务（CREATE TABLE / DROP / INSERT）在 DELETE 模式下竞争，
// 留下 0 字节 journal 导致运行时所有写库报 readonly(errcode 8)。
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

export const db = new DatabaseSync(path.join(dataDir, "app_data.db"), {
  readOnly: isBuildPhase,
});

// 并发场景（如 next build 多 worker / 局域网多设备）下，锁等待重试而不是立即报 database is locked
db.exec("PRAGMA busy_timeout = 5000;");

if (!isBuildPhase) {
  // 自愈：清理上次异常退出残留的 0 字节 journal（否则 SQLite 写事务报 readonly）
  try {
    fs.rmSync(path.join(dataDir, "app_data.db-journal"), { force: true });
  } catch {
    /* 忽略 */
  }
  db.exec("PRAGMA journal_mode = DELETE;");

  // ============ 玩家数据 + 配置表（多用户：一律带 user_id 维度） ============
  // 静态内容（29 元认知/31 边/29 精灵/126 怪/30 性质/19 策略）已全部代码化（lib/content.ts），不再落库。
  // explorer.id 即用户 id（登录体系）；其余玩家表以 user_id 区分不同档案。
  db.exec(`
  CREATE TABLE IF NOT EXISTS explorer (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    brain_settings TEXT,
    current_island TEXT NOT NULL DEFAULT '计数岛',
    difficulty_bias INTEGER NOT NULL DEFAULT 0,
    gender TEXT,
    avatar_id TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    title TEXT
  );

  CREATE TABLE IF NOT EXISTS internalized_meta (
    user_id TEXT NOT NULL,
    meta_id TEXT NOT NULL,
    acquired_at TEXT NOT NULL,
    source TEXT,
    mastery_level INTEGER NOT NULL DEFAULT 1,
    mastery_xp INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, meta_id)
  );

  -- 觉醒进度：打赢知识守卫 = 觉醒该性质（精灵镀金）
  CREATE TABLE IF NOT EXISTS internalized_property (
    user_id TEXT NOT NULL,
    spirit_id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    awakened_at TEXT NOT NULL,
    source TEXT,
    PRIMARY KEY (user_id, spirit_id, property_id)
  );

  -- 连招进度（策略掌握度）
  CREATE TABLE IF NOT EXISTS internalized_strategy (
    user_id TEXT NOT NULL,
    strategy_id TEXT NOT NULL,
    mastery INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, strategy_id)
  );

  -- 岛屿等级（守卫打赢 → level+1 → 解锁进阶练习）
  CREATE TABLE IF NOT EXISTS island_level (
    user_id TEXT NOT NULL,
    island TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, island)
  );

  -- 参数化配置（升级场次 / 题目数量公式 / 难度权重 / 觉醒门槛 / 广播开关）——全局，非用户级
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Boss 失败计数（卡关退路判定：同 Boss 失败 ≥2）
  CREATE TABLE IF NOT EXISTS boss_progress (
    user_id TEXT NOT NULL,
    boss_id TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TEXT,
    PRIMARY KEY (user_id, boss_id)
  );

  CREATE TABLE IF NOT EXISTS growth_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    event TEXT NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS curiosity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    label TEXT NOT NULL,
    sparks INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  -- AI 配置（全局单行；key 存本地）
  CREATE TABLE IF NOT EXISTS ai_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
    api_key TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mistake (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    meta_id TEXT NOT NULL,
    question TEXT NOT NULL,
    user_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    created_at TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0
  );
`);

  // ============ 老库兼容 · 第二段静态内容表迁移（v7：内容代码化） ============
  // 老库（schema v6 及更早）的静态内容表已废弃（数据 = seed 复制品，无用户价值），直接 DROP。
  for (const t of ["meta_cognition", "evolution_edge", "spirit", "property", "strategy", "monster"]) {
    db.exec(`DROP TABLE IF EXISTS ${t}`);
  }

  // ============ 老库兼容 · 多用户化（v7）：玩家表加 user_id 并重建复合主键 ============
  // 幂等：以「表是否存在 user_id 列」判断，缺则重建并把旧数据归到 default 用户
  const hasColumn = (table: string, col: string): boolean => {
    const rows = db.prepare(`SELECT name FROM pragma_table_info(?)`).all(table) as { name: string }[];
    return rows.some((r) => r.name === col);
  };

  /** 重建表：新建 _new（新结构）→ 旧数据 COPY 进（user_id 归 default）→ 删旧表 → 改名 */
  const rebuild = (table: string, createSql: string, copySql: string) => {
    if (hasColumn(table, "user_id")) return;
    db.exec(`BEGIN`);
    try {
      db.exec(`CREATE TABLE ${table}_new (${createSql})`);
      db.exec(copySql);
      db.exec(`DROP TABLE ${table}`);
      db.exec(`ALTER TABLE ${table}_new RENAME TO ${table}`);
      db.exec(`COMMIT`);
    } catch (e) {
      db.exec(`ROLLBACK`);
      db.exec(`DROP TABLE IF EXISTS ${table}_new`);
      throw e;
    }
  };

  rebuild(
    "internalized_meta",
    `user_id TEXT NOT NULL, meta_id TEXT NOT NULL, acquired_at TEXT NOT NULL, source TEXT,
     mastery_level INTEGER NOT NULL DEFAULT 1, mastery_xp INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (user_id, meta_id)`,
    `INSERT INTO internalized_meta_new (user_id, meta_id, acquired_at, source, mastery_level, mastery_xp)
     SELECT 'default', meta_id, acquired_at, source, mastery_level, mastery_xp FROM internalized_meta`
  );
  rebuild(
    "internalized_property",
    `user_id TEXT NOT NULL, spirit_id TEXT NOT NULL, property_id TEXT NOT NULL,
     awakened_at TEXT NOT NULL, source TEXT, PRIMARY KEY (user_id, spirit_id, property_id)`,
    `INSERT INTO internalized_property_new (user_id, spirit_id, property_id, awakened_at, source)
     SELECT 'default', spirit_id, property_id, awakened_at, source FROM internalized_property`
  );
  rebuild(
    "internalized_strategy",
    `user_id TEXT NOT NULL, strategy_id TEXT NOT NULL, mastery INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (user_id, strategy_id)`,
    `INSERT INTO internalized_strategy_new (user_id, strategy_id, mastery)
     SELECT 'default', strategy_id, mastery FROM internalized_strategy`
  );
  rebuild(
    "island_level",
    `user_id TEXT NOT NULL, island TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 1,
     PRIMARY KEY (user_id, island)`,
    `INSERT INTO island_level_new (user_id, island, level)
     SELECT 'default', island, level FROM island_level`
  );
  rebuild(
    "boss_progress",
    `user_id TEXT NOT NULL, boss_id TEXT NOT NULL, attempt_count INTEGER NOT NULL DEFAULT 0,
     last_attempt_at TEXT, PRIMARY KEY (user_id, boss_id)`,
    `INSERT INTO boss_progress_new (user_id, boss_id, attempt_count, last_attempt_at)
     SELECT 'default', boss_id, attempt_count, last_attempt_at FROM boss_progress`
  );
  rebuild(
    "growth_log",
    `id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, event TEXT NOT NULL, detail TEXT,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))`,
    `INSERT INTO growth_log_new (id, user_id, event, detail, created_at)
     SELECT id, 'default', event, detail, created_at FROM growth_log`
  );
  rebuild(
    "curiosity_log",
    `id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, question_id TEXT NOT NULL, label TEXT NOT NULL,
     sparks INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL`,
    `INSERT INTO curiosity_log_new (id, user_id, question_id, label, sparks, created_at)
     SELECT id, 'default', question_id, label, sparks, created_at FROM curiosity_log`
  );
  rebuild(
    "mistake",
    `id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, meta_id TEXT NOT NULL, question TEXT NOT NULL,
     user_answer TEXT NOT NULL, correct_answer TEXT NOT NULL, created_at TEXT NOT NULL, resolved INTEGER NOT NULL DEFAULT 0`,
    `INSERT INTO mistake_new (id, user_id, meta_id, question, user_answer, correct_answer, created_at, resolved)
     SELECT id, 'default', meta_id, question, user_answer, correct_answer, created_at, resolved FROM mistake`
  );

  // ============ 老库兼容 · explorer 列补齐（历史遗留 ALTER，幂等） ============
  for (const [col, ddl] of [
    ["difficulty_bias", "ALTER TABLE explorer ADD COLUMN difficulty_bias INTEGER NOT NULL DEFAULT 0"],
    ["gender", "ALTER TABLE explorer ADD COLUMN gender TEXT"],
    ["avatar_id", "ALTER TABLE explorer ADD COLUMN avatar_id TEXT"],
    ["level", "ALTER TABLE explorer ADD COLUMN level INTEGER NOT NULL DEFAULT 1"],
    ["xp", "ALTER TABLE explorer ADD COLUMN xp INTEGER NOT NULL DEFAULT 0"],
    ["title", "ALTER TABLE explorer ADD COLUMN title TEXT"],
  ] as [string, string][]) {
    if (!hasColumn("explorer", col)) {
      try {
        db.exec(ddl);
      } catch {
        /* 忽略 */
      }
    }
  }
}

export default db;

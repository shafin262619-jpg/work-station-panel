'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'work-station-panel.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  current_phase TEXT NOT NULL DEFAULT 'Plan',
  github_link TEXT,
  pinned INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('monkey', 'claude')),
  label TEXT NOT NULL,
  login_link TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'limit_reached')),
  note TEXT,
  last_used_project TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  basic_plan TEXT,
  basic_plan_updated_at TEXT,
  data_collector_log TEXT,
  data_collector_log_updated_at TEXT,
  data_collector_tool_link TEXT,
  final_plan TEXT,
  final_plan_updated_at TEXT,
  prompt_guide_file TEXT,
  prompt_guide_file_updated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coding_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  active_monkey_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  todo_list TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  brief TEXT,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checker_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('self', 'claude')),
  description TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  ai_helping_enabled INTEGER NOT NULL DEFAULT 0,
  gemini_api_key TEXT,
  last_account_reset_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

// Migrates DBs created before a schema change (chunk A3 added `pinned` and
// `updated_at` to projects). `CREATE TABLE IF NOT EXISTS` never alters an
// existing table, so missing columns are added here. New columns are also
// part of SCHEMA so fresh DBs get them directly.
function migrate(db) {
  const projectCols = db
    .prepare('PRAGMA table_info(projects)')
    .all()
    .map((c) => c.name);
  if (!projectCols.includes('pinned')) {
    db.exec('ALTER TABLE projects ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0');
  }
  if (!projectCols.includes('updated_at')) {
    db.exec('ALTER TABLE projects ADD COLUMN updated_at TEXT');
    db.prepare('UPDATE projects SET updated_at = created_at WHERE updated_at IS NULL').run();
  }
  const planTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plan_data'")
    .get();
  if (planTable) {
    const planCols = db
      .prepare('PRAGMA table_info(plan_data)')
      .all()
      .map((c) => c.name);
    if (!planCols.includes('data_collector_tool_link')) {
      db.exec('ALTER TABLE plan_data ADD COLUMN data_collector_tool_link TEXT');
    }
  }
}

function createDb(dbPath = DEFAULT_DB_PATH) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

module.exports = { createDb, migrate, DEFAULT_DB_PATH, SCHEMA };

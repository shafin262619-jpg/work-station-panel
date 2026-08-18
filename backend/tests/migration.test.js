'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert');
const Database = require('better-sqlite3');
const { migrate } = require('../src/db');

// Builds a DB with the pre-A3 projects schema (no pinned / updated_at).
function createLegacyDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      current_phase TEXT NOT NULL DEFAULT 'Plan',
      github_link TEXT
    );
  `);
  db.prepare('INSERT INTO projects (name, created_at) VALUES (?, ?)').run(
    'Legacy',
    '2026-08-01T00:00:00.000Z'
  );
  return db;
}

describe('projects schema migration (A3)', () => {
  test('adds pinned and updated_at columns to an existing projects table', () => {
    const db = createLegacyDb();
    migrate(db);

    const cols = db
      .prepare('PRAGMA table_info(projects)')
      .all()
      .map((c) => c.name);
    assert.ok(cols.includes('pinned'));
    assert.ok(cols.includes('updated_at'));

    const row = db.prepare('SELECT * FROM projects').get();
    assert.strictEqual(row.pinned, 0);
    assert.strictEqual(row.updated_at, '2026-08-01T00:00:00.000Z');
    db.close();
  });

  test('is idempotent — running migrate twice leaves the schema intact', () => {
    const db = createLegacyDb();
    migrate(db);
    migrate(db);

    const cols = db
      .prepare('PRAGMA table_info(projects)')
      .all()
      .map((c) => c.name);
    assert.ok(cols.includes('pinned'));
    assert.ok(cols.includes('updated_at'));
    db.close();
  });
});

// Builds a DB with the pre-C1 plan_data schema (no data_collector_tool_link).
function createLegacyPlanDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      current_phase TEXT NOT NULL DEFAULT 'Plan',
      github_link TEXT
    );
    CREATE TABLE plan_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
      basic_plan TEXT,
      basic_plan_updated_at TEXT,
      data_collector_log TEXT,
      data_collector_log_updated_at TEXT,
      final_plan TEXT,
      final_plan_updated_at TEXT,
      prompt_guide_file TEXT,
      prompt_guide_file_updated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

describe('plan_data schema migration (C1)', () => {
  test('adds data_collector_tool_link to an existing plan_data table', () => {
    const db = createLegacyPlanDb();
    migrate(db);

    const cols = db
      .prepare('PRAGMA table_info(plan_data)')
      .all()
      .map((c) => c.name);
    assert.ok(cols.includes('data_collector_tool_link'));
    db.close();
  });

  test('migrate is idempotent on plan_data', () => {
    const db = createLegacyPlanDb();
    migrate(db);
    migrate(db);

    const cols = db
      .prepare('PRAGMA table_info(plan_data)')
      .all()
      .map((c) => c.name);
    assert.strictEqual(
      cols.filter((c) => c === 'data_collector_tool_link').length,
      1
    );
    db.close();
  });
});

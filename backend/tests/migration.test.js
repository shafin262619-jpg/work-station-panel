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

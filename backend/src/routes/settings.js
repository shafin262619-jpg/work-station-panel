'use strict';

const express = require('express');
const { now, toBool } = require('../helpers');

const SINGLETON_ID = 1;

function buildRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ai_helping_enabled: !!row.ai_helping_enabled,
    has_gemini_api_key: !!row.gemini_api_key,
    last_account_reset_date: row.last_account_reset_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function ensureRow(db) {
  const existing = db.prepare('SELECT * FROM settings WHERE id = ?').get(SINGLETON_ID);
  if (existing) return existing;
  const ts = now();
  db.prepare(
    'INSERT INTO settings (id, ai_helping_enabled, created_at, updated_at) VALUES (?, 0, ?, ?)'
  ).run(SINGLETON_ID, ts, ts);
  return db.prepare('SELECT * FROM settings WHERE id = ?').get(SINGLETON_ID);
}

module.exports = function settingsRouter(db) {
  const router = express.Router();

  // GET /api/settings — auto-creates the singleton row if missing.
  // The gemini_api_key is never returned; only has_gemini_api_key boolean.
  router.get('/', (req, res) => {
    const row = ensureRow(db);
    res.json(buildRow(row));
  });

  // POST /api/settings — create the singleton (409 if it already exists).
  router.post('/', (req, res) => {
    const existing = db.prepare('SELECT * FROM settings WHERE id = ?').get(SINGLETON_ID);
    if (existing) {
      return res.status(409).json({ error: 'Settings singleton already exists; use PUT to update' });
    }
    const row = ensureRow(db);
    applyUpdates(db, req.body || {});
    res.status(201).json(buildRow(db.prepare('SELECT * FROM settings WHERE id = ?').get(SINGLETON_ID)));
  });

  // PUT /api/settings — partial update of the singleton (upserts if missing).
  router.put('/', (req, res) => {
    const body = req.body || {};
    if (body.ai_helping_enabled !== undefined && typeof body.ai_helping_enabled !== 'boolean') {
      return res.status(400).json({ error: 'ai_helping_enabled must be a boolean' });
    }
    ensureRow(db);
    applyUpdates(db, body);
    res.json(buildRow(db.prepare('SELECT * FROM settings WHERE id = ?').get(SINGLETON_ID)));
  });

  // DELETE /api/settings — removes the singleton; GET will recreate defaults.
  router.delete('/', (req, res) => {
    const result = db.prepare('DELETE FROM settings WHERE id = ?').run(SINGLETON_ID);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    res.status(204).end();
  });

  return router;
};

function applyUpdates(db, body) {
  const sets = [];
  const params = { id: SINGLETON_ID, updated_at: now() };
  if (body.ai_helping_enabled !== undefined) {
    sets.push('ai_helping_enabled = @ai_helping_enabled');
    params.ai_helping_enabled = toBool(body.ai_helping_enabled) ? 1 : 0;
  }
  if (body.gemini_api_key !== undefined) {
    sets.push('gemini_api_key = @gemini_api_key');
    params.gemini_api_key = body.gemini_api_key || null;
  }
  if (body.last_account_reset_date !== undefined) {
    sets.push('last_account_reset_date = @last_account_reset_date');
    params.last_account_reset_date = body.last_account_reset_date || null;
  }
  if (sets.length > 0) {
    db.prepare(`UPDATE settings SET ${sets.join(', ')}, updated_at = @updated_at WHERE id = @id`).run(params);
  }
}

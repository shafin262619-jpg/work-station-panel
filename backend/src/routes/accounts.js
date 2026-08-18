'use strict';

const express = require('express');
const { now, parseId } = require('../helpers');
const { getTodayKey, maybeRunLazyReset, runDailyReset } = require('../accountReset');

const ACCOUNT_TYPES = ['monkey', 'claude'];
const ACCOUNT_STATUSES = ['available', 'limit_reached'];

function buildRow(row) {
  if (!row) return null;
  return { ...row };
}

module.exports = function accountsRouter(db, deps = {}) {
  const router = express.Router();
  const todayKey = deps.getTodayKey || getTodayKey;

  // GET /api/accounts — lazy-reset fallback first, then the list.
  router.get('/', (req, res) => {
    maybeRunLazyReset(db, todayKey());
    const rows = db
      .prepare('SELECT * FROM accounts ORDER BY id ASC')
      .all();
    res.json({ data: rows.map(buildRow) });
  });

  // POST /api/accounts/reset-all — manual reset anytime; also records today
  // as the reset date so the lazy-reset does not override it again today.
  router.post('/reset-all', (req, res) => {
    runDailyReset(db, todayKey());
    const rows = db
      .prepare('SELECT * FROM accounts ORDER BY id ASC')
      .all();
    res.json({ data: rows.map(buildRow) });
  });

  // POST /api/accounts/:id/mark-used — mark an account as used in a project.
  router.post('/:id/mark-used', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Account not found' });
    const { last_used_project } = req.body || {};
    if (!last_used_project || typeof last_used_project !== 'string' || !last_used_project.trim()) {
      return res.status(400).json({ error: 'last_used_project is required' });
    }
    db.prepare('UPDATE accounts SET last_used_project = ?, last_used_at = ? WHERE id = ?').run(
      last_used_project.trim(),
      now(),
      id
    );
    res.json(buildRow(db.prepare('SELECT * FROM accounts WHERE id = ?').get(id)));
  });

  // POST /api/accounts
  router.post('/', (req, res) => {
    const { type, label, login_link, status, note } = req.body || {};
    if (!type || !ACCOUNT_TYPES.includes(type)) {
      return res.status(400).json({ error: 'type must be either "monkey" or "claude"' });
    }
    if (!label || typeof label !== 'string' || !label.trim()) {
      return res.status(400).json({ error: 'label is required' });
    }
    const accountStatus = status !== undefined ? status : 'available';
    if (!ACCOUNT_STATUSES.includes(accountStatus)) {
      return res.status(400).json({ error: 'status must be either "available" or "limit_reached"' });
    }
    const result = db
      .prepare(
        'INSERT INTO accounts (type, label, login_link, status, note, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(type, label.trim(), login_link || null, accountStatus, note || null, now());
    const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(buildRow(row));
  });

  // GET /api/accounts/:id
  router.get('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Account not found' });
    res.json(buildRow(row));
  });

  // PUT /api/accounts/:id
  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Account not found' });
    const { type, label, login_link, status, note, last_used_project, last_used_at } = req.body || {};
    if (type !== undefined && !ACCOUNT_TYPES.includes(type)) {
      return res.status(400).json({ error: 'type must be either "monkey" or "claude"' });
    }
    if (label !== undefined && (typeof label !== 'string' || !label.trim())) {
      return res.status(400).json({ error: 'label must be a non-empty string' });
    }
    if (status !== undefined && !ACCOUNT_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'status must be either "available" or "limit_reached"' });
    }
    const nullable = (v, current) => (v !== undefined ? v || null : current);
    db.prepare(
      `UPDATE accounts SET
        type = ?, label = ?, login_link = ?, status = ?, note = ?,
        last_used_project = ?, last_used_at = ?
        WHERE id = ?`
    ).run(
      type !== undefined ? type : row.type,
      label !== undefined ? label.trim() : row.label,
      nullable(login_link, row.login_link),
      status !== undefined ? status : row.status,
      nullable(note, row.note),
      nullable(last_used_project, row.last_used_project),
      nullable(last_used_at, row.last_used_at),
      id
    );
    res.json(buildRow(db.prepare('SELECT * FROM accounts WHERE id = ?').get(id)));
  });

  // DELETE /api/accounts/:id
  router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.status(204).end();
  });

  return router;
};

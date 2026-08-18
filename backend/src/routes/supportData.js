'use strict';

const express = require('express');
const { now, parseId } = require('../helpers');

function buildRow(row) {
  if (!row) return null;
  return { ...row };
}

function validateAccountId(db, id, res) {
  if (id === null) return true;
  const account = db.prepare('SELECT id, type FROM accounts WHERE id = ?').get(id);
  if (!account) {
    res.status(400).json({ error: 'active_claude_account_id does not reference an existing account' });
    return false;
  }
  if (account.type !== 'claude') {
    res.status(400).json({ error: 'active_claude_account_id must reference a claude-type account' });
    return false;
  }
  return true;
}

module.exports = function supportDataRouter(db) {
  const router = express.Router({ mergeParams: true });

  const selectByProject = db.prepare('SELECT * FROM support_data WHERE project_id = ?');

  // GET /api/projects/:projectId/support
  router.get('/', (req, res) => {
    const row = selectByProject.get(req.projectId);
    if (!row) return res.status(404).json({ error: 'SupportData not found' });
    res.json(buildRow(row));
  });

  // POST /api/projects/:projectId/support
  router.post('/', (req, res) => {
    if (selectByProject.get(req.projectId)) {
      return res.status(409).json({ error: 'SupportData already exists for this project' });
    }
    const body = req.body || {};
    let accountId = null;
    if (body.active_claude_account_id !== undefined && body.active_claude_account_id !== null) {
      accountId = parseId(body.active_claude_account_id);
      if (!accountId) {
        return res.status(400).json({ error: 'active_claude_account_id must be a positive integer' });
      }
      if (!validateAccountId(db, accountId, res)) return;
    }
    const ts = now();
    const result = db
      .prepare(
        'INSERT INTO support_data (project_id, active_claude_account_id, created_at, updated_at) VALUES (?, ?, ?, ?)'
      )
      .run(req.projectId, accountId, ts, ts);
    const row = db.prepare('SELECT * FROM support_data WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(buildRow(row));
  });

  // PUT /api/projects/:projectId/support — partial update, upserts if missing
  router.put('/', (req, res) => {
    const existing = selectByProject.get(req.projectId);
    const body = req.body || {};

    let accountId;
    if (body.active_claude_account_id !== undefined) {
      if (body.active_claude_account_id === null) {
        accountId = null;
      } else {
        accountId = parseId(body.active_claude_account_id);
        if (!accountId) {
          return res.status(400).json({ error: 'active_claude_account_id must be a positive integer' });
        }
        if (!validateAccountId(db, accountId, res)) return;
      }
    }

    const ts = now();

    if (existing) {
      db.prepare('UPDATE support_data SET active_claude_account_id = ?, updated_at = ? WHERE id = ?').run(
        accountId !== undefined ? accountId : existing.active_claude_account_id,
        ts,
        existing.id
      );
      res.json(buildRow(selectByProject.get(req.projectId)));
    } else {
      const result = db
        .prepare(
          'INSERT INTO support_data (project_id, active_claude_account_id, created_at, updated_at) VALUES (?, ?, ?, ?)'
        )
        .run(req.projectId, accountId ?? null, ts, ts);
      const row = db.prepare('SELECT * FROM support_data WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(buildRow(row));
    }
  });

  // DELETE /api/projects/:projectId/support
  router.delete('/', (req, res) => {
    const result = db.prepare('DELETE FROM support_data WHERE project_id = ?').run(req.projectId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'SupportData not found' });
    }
    res.status(204).end();
  });

  return router;
};

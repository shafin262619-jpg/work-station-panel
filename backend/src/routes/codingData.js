'use strict';

const express = require('express');
const { now, parseId } = require('../helpers');

function parseTodoList(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function buildRow(row) {
  if (!row) return null;
  const out = { ...row };
  if (out.todo_list !== null) {
    try {
      out.todo_list = JSON.parse(out.todo_list);
    } catch {
      // keep raw string if not valid JSON
    }
  }
  return out;
}

function validateAccountId(db, id, res) {
  if (id === null) return true;
  const account = db.prepare('SELECT id, type FROM accounts WHERE id = ?').get(id);
  if (!account) {
    res.status(400).json({ error: 'active_monkey_account_id does not reference an existing account' });
    return false;
  }
  if (account.type !== 'monkey') {
    res.status(400).json({ error: 'active_monkey_account_id must reference a monkey-type account' });
    return false;
  }
  return true;
}

module.exports = function codingDataRouter(db) {
  const router = express.Router({ mergeParams: true });

  const selectByProject = db.prepare('SELECT * FROM coding_data WHERE project_id = ?');

  // GET /api/projects/:projectId/coding
  router.get('/', (req, res) => {
    const row = selectByProject.get(req.projectId);
    if (!row) return res.status(404).json({ error: 'CodingData not found' });
    res.json(buildRow(row));
  });

  // POST /api/projects/:projectId/coding
  router.post('/', (req, res) => {
    if (selectByProject.get(req.projectId)) {
      return res.status(409).json({ error: 'CodingData already exists for this project' });
    }
    const body = req.body || {};
    let accountId = null;
    if (body.active_monkey_account_id !== undefined && body.active_monkey_account_id !== null) {
      accountId = parseId(body.active_monkey_account_id);
      if (!accountId) {
        return res.status(400).json({ error: 'active_monkey_account_id must be a positive integer' });
      }
      if (!validateAccountId(db, accountId, res)) return;
    }
    const ts = now();
    const todoList = parseTodoList(body.todo_list);
    const result = db
      .prepare(
        'INSERT INTO coding_data (project_id, active_monkey_account_id, todo_list, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(req.projectId, accountId, todoList, ts, ts);
    const row = db.prepare('SELECT * FROM coding_data WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(buildRow(row));
  });

  // PUT /api/projects/:projectId/coding — partial update, upserts if missing
  router.put('/', (req, res) => {
    const existing = selectByProject.get(req.projectId);
    const body = req.body || {};

    let accountId;
    if (body.active_monkey_account_id !== undefined) {
      if (body.active_monkey_account_id === null) {
        accountId = null;
      } else {
        accountId = parseId(body.active_monkey_account_id);
        if (!accountId) {
          return res.status(400).json({ error: 'active_monkey_account_id must be a positive integer' });
        }
        if (!validateAccountId(db, accountId, res)) return;
      }
    }

    const ts = now();
    const values = {};
    if (body.active_monkey_account_id !== undefined) values.active_monkey_account_id = accountId;
    if (body.todo_list !== undefined) values.todo_list = parseTodoList(body.todo_list);

    if (existing) {
      const sets = [];
      const params = { id: existing.id, updated_at: ts };
      for (const [key, value] of Object.entries(values)) {
        sets.push(`${key} = @${key}`);
        params[key] = value;
      }
      if (sets.length > 0) {
        db.prepare(`UPDATE coding_data SET ${sets.join(', ')}, updated_at = @updated_at WHERE id = @id`).run(params);
      }
      res.json(buildRow(selectByProject.get(req.projectId)));
    } else {
      if (Object.keys(values).length === 0) {
        return res.status(400).json({
          error: 'No updatable field provided (active_monkey_account_id, todo_list)',
        });
      }
      const result = db
        .prepare(
          'INSERT INTO coding_data (project_id, active_monkey_account_id, todo_list, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        )
        .run(req.projectId, values.active_monkey_account_id ?? null, values.todo_list ?? null, ts, ts);
      const row = db.prepare('SELECT * FROM coding_data WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(buildRow(row));
    }
  });

  // DELETE /api/projects/:projectId/coding
  router.delete('/', (req, res) => {
    const result = db.prepare('DELETE FROM coding_data WHERE project_id = ?').run(req.projectId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'CodingData not found' });
    }
    res.status(204).end();
  });

  return router;
};

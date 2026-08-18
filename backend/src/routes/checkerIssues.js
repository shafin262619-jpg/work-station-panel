'use strict';

const express = require('express');
const { now, parseId, toBool } = require('../helpers');

function buildRow(row) {
  if (!row) return null;
  return {
    ...row,
    resolved: !!row.resolved,
    archived: !!row.archived,
  };
}

module.exports = function checkerIssuesRouter(db) {
  const router = express.Router({ mergeParams: true });

  const selectById = db.prepare(
    'SELECT * FROM checker_issues WHERE id = ? AND project_id = ?'
  );

  // GET /api/projects/:projectId/checker-issues
  // Supports ?resolved=true|false and ?archived=true|false filters.
  router.get('/', (req, res) => {
    let sql = 'SELECT * FROM checker_issues WHERE project_id = ?';
    const params = [req.projectId];
    if (req.query.resolved !== undefined) {
      sql += ' AND resolved = ?';
      params.push(toBool(req.query.resolved) ? 1 : 0);
    }
    if (req.query.archived !== undefined) {
      sql += ' AND archived = ?';
      params.push(toBool(req.query.archived) ? 1 : 0);
    }
    sql += ' ORDER BY id DESC';
    const rows = db.prepare(sql).all(...params);
    res.json({ data: rows.map(buildRow) });
  });

  // POST /api/projects/:projectId/checker-issues
  router.post('/', (req, res) => {
    const { source, description } = req.body || {};
    if (!source || !['self', 'claude'].includes(source)) {
      return res.status(400).json({ error: 'source must be either "self" or "claude"' });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'description is required' });
    }
    const resolved = toBool(req.body.resolved) ? 1 : 0;
    const archived = toBool(req.body.archived) ? 1 : 0;
    const ts = now();
    const result = db
      .prepare(
        'INSERT INTO checker_issues (project_id, source, description, resolved, archived, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(req.projectId, source, description.trim(), resolved, archived, ts);
    const row = selectById.get(result.lastInsertRowid, req.projectId);
    res.status(201).json(buildRow(row));
  });

  // GET /api/projects/:projectId/checker-issues/:id
  router.get('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const row = selectById.get(id, req.projectId);
    if (!row) return res.status(404).json({ error: 'CheckerIssue not found' });
    res.json(buildRow(row));
  });

  // PUT /api/projects/:projectId/checker-issues/:id
  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const row = selectById.get(id, req.projectId);
    if (!row) return res.status(404).json({ error: 'CheckerIssue not found' });
    const { source, description, resolved, archived } = req.body || {};
    if (source !== undefined && !['self', 'claude'].includes(source)) {
      return res.status(400).json({ error: 'source must be either "self" or "claude"' });
    }
    if (description !== undefined && (typeof description !== 'string' || !description.trim())) {
      return res.status(400).json({ error: 'description must be a non-empty string' });
    }
    db.prepare(
      'UPDATE checker_issues SET source = ?, description = ?, resolved = ?, archived = ? WHERE id = ?'
    ).run(
      source !== undefined ? source : row.source,
      description !== undefined ? description.trim() : row.description,
      resolved !== undefined ? (toBool(resolved) ? 1 : 0) : row.resolved,
      archived !== undefined ? (toBool(archived) ? 1 : 0) : row.archived,
      id
    );
    res.json(buildRow(selectById.get(id, req.projectId)));
  });

  // DELETE /api/projects/:projectId/checker-issues/:id
  router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const result = db.prepare('DELETE FROM checker_issues WHERE id = ? AND project_id = ?').run(id, req.projectId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'CheckerIssue not found' });
    }
    res.status(204).end();
  });

  return router;
};

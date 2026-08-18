'use strict';

const express = require('express');
const { now, parseId } = require('../helpers');

function buildRow(row) {
  if (!row) return null;
  return { ...row };
}

module.exports = function supportLogsRouter(db) {
  const router = express.Router({ mergeParams: true });

  const selectById = db.prepare(
    'SELECT * FROM support_logs WHERE id = ? AND project_id = ?'
  );

  // GET /api/projects/:projectId/support-logs
  router.get('/', (req, res) => {
    const rows = db
      .prepare(
        'SELECT * FROM support_logs WHERE project_id = ? ORDER BY timestamp DESC, id DESC'
      )
      .all(req.projectId);
    res.json({ data: rows.map(buildRow) });
  });

  // POST /api/projects/:projectId/support-logs
  router.post('/', (req, res) => {
    const { prompt, brief, timestamp } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    const ts = timestamp || now();
    const result = db
      .prepare(
        'INSERT INTO support_logs (project_id, prompt, brief, timestamp) VALUES (?, ?, ?, ?)'
      )
      .run(req.projectId, prompt.trim(), brief || null, ts);
    const row = selectById.get(result.lastInsertRowid, req.projectId);
    res.status(201).json(buildRow(row));
  });

  // GET /api/projects/:projectId/support-logs/:id
  router.get('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const row = selectById.get(id, req.projectId);
    if (!row) return res.status(404).json({ error: 'SupportLog not found' });
    res.json(buildRow(row));
  });

  // PUT /api/projects/:projectId/support-logs/:id
  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const row = selectById.get(id, req.projectId);
    if (!row) return res.status(404).json({ error: 'SupportLog not found' });
    const { prompt, brief, timestamp } = req.body || {};
    if (prompt !== undefined && (typeof prompt !== 'string' || !prompt.trim())) {
      return res.status(400).json({ error: 'prompt must be a non-empty string' });
    }
    const newPrompt = prompt !== undefined ? prompt.trim() : row.prompt;
    const newBrief = brief !== undefined ? brief || null : row.brief;
    const newTimestamp = timestamp !== undefined ? timestamp : row.timestamp;
    db.prepare(
      'UPDATE support_logs SET prompt = ?, brief = ?, timestamp = ? WHERE id = ?'
    ).run(newPrompt, newBrief, newTimestamp, id);
    res.json(buildRow(selectById.get(id, req.projectId)));
  });

  // DELETE /api/projects/:projectId/support-logs/:id
  router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const result = db.prepare('DELETE FROM support_logs WHERE id = ? AND project_id = ?').run(id, req.projectId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'SupportLog not found' });
    }
    res.status(204).end();
  });

  return router;
};

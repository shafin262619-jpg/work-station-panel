'use strict';

const express = require('express');
const { now, parseId, toBool } = require('../helpers');

function buildRow(row) {
  if (!row) return null;
  return {
    ...row,
    pinned: !!row.pinned,
  };
}

module.exports = function notesRouter(db) {
  const router = express.Router();

  // GET /api/notes — supports ?category= and ?pinned=true|false filters.
  router.get('/', (req, res) => {
    let sql = 'SELECT * FROM notes WHERE 1 = 1';
    const params = [];
    if (req.query.category !== undefined) {
      sql += ' AND category = ?';
      params.push(req.query.category);
    }
    if (req.query.pinned !== undefined) {
      sql += ' AND pinned = ?';
      params.push(toBool(req.query.pinned) ? 1 : 0);
    }
    sql += ' ORDER BY pinned DESC, updated_at DESC, id DESC';
    const rows = db.prepare(sql).all(...params);
    res.json({ data: rows.map(buildRow) });
  });

  // POST /api/notes
  router.post('/', (req, res) => {
    const { title, content, category, pinned } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const ts = now();
    const result = db
      .prepare(
        'INSERT INTO notes (title, content, category, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(title.trim(), content || null, category || null, toBool(pinned) ? 1 : 0, ts, ts);
    const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(buildRow(row));
  });

  // GET /api/notes/:id
  router.get('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Note not found' });
    res.json(buildRow(row));
  });

  // PUT /api/notes/:id
  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Note not found' });
    const { title, content, category, pinned } = req.body || {};
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'title must be a non-empty string' });
    }
    const nullable = (v, current) => (v !== undefined ? v || null : current);
    db.prepare(
      'UPDATE notes SET title = ?, content = ?, category = ?, pinned = ?, updated_at = ? WHERE id = ?'
    ).run(
      title !== undefined ? title.trim() : row.title,
      nullable(content, row.content),
      nullable(category, row.category),
      pinned !== undefined ? (toBool(pinned) ? 1 : 0) : row.pinned,
      now(),
      id
    );
    res.json(buildRow(db.prepare('SELECT * FROM notes WHERE id = ?').get(id)));
  });

  // DELETE /api/notes/:id
  router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const result = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.status(204).end();
  });

  return router;
};

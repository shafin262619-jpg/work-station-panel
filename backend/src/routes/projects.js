'use strict';

const express = require('express');
const { now, parseId } = require('../helpers');

const planDataRouter = require('./planData');
const codingDataRouter = require('./codingData');
const supportLogsRouter = require('./supportLogs');
const checkerIssuesRouter = require('./checkerIssues');

module.exports = function projectsRouter(db) {
  const router = express.Router();

  // GET /api/projects
  router.get('/', (req, res) => {
    const rows = db
      .prepare('SELECT * FROM projects ORDER BY created_at DESC, id DESC')
      .all();
    res.json({ data: rows });
  });

  // POST /api/projects
  router.post('/', (req, res) => {
    const { name, github_link } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const result = db
      .prepare(
        'INSERT INTO projects (name, created_at, current_phase, github_link) VALUES (?, ?, ?, ?)'
      )
      .run(name.trim(), now(), 'Plan', github_link || null);
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  });

  // GET /api/projects/:id
  router.get('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid project id' });
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    res.json(row);
  });

  // PUT /api/projects/:id
  // current_phase is a forward-only auto-advance field (Coding/Support/Checker
  // chunks D1/D2/E1). It is never settable via this route.
  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid project id' });
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const { name, github_link } = req.body || {};
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'name must be a non-empty string' });
    }
    const newName = name !== undefined ? name.trim() : row.name;
    const newLink = github_link !== undefined ? github_link || null : row.github_link;
    db.prepare('UPDATE projects SET name = ?, github_link = ? WHERE id = ?').run(
      newName,
      newLink,
      id
    );
    res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
  });

  // DELETE /api/projects/:id
  router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid project id' });
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Project not found' });
    res.status(204).end();
  });

  // Nested project-scoped resources. A shared middleware resolves + verifies the
  // project first, then each sub-router handles its own CRUD.
  const scopeRouter = express.Router({ mergeParams: true });
  scopeRouter.use((req, res, next) => {
    const projectId = parseId(req.params.projectId);
    if (!projectId) return res.status(400).json({ error: 'Invalid project id' });
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    req.projectId = projectId;
    next();
  });
  scopeRouter.use('/plan', planDataRouter(db));
  scopeRouter.use('/coding', codingDataRouter(db));
  scopeRouter.use('/support-logs', supportLogsRouter(db));
  scopeRouter.use('/checker-issues', checkerIssuesRouter(db));
  router.use('/:projectId', scopeRouter);

  return router;
};

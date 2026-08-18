'use strict';

const express = require('express');
const { now, parseId, toBool } = require('../helpers');

const planDataRouter = require('./planData');
const codingDataRouter = require('./codingData');
const supportDataRouter = require('./supportData');
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

  // POST /api/projects — creates the project plus its empty per-project
  // datasets: a blank PlanData row, a blank CodingData row and a blank
  // SupportData row (singletons). SupportLog / CheckerIssue are lists, so an
  // empty list needs no rows. current_phase always starts at "Plan"; pinned
  // defaults to 0.
  router.post('/', (req, res) => {
    const { name, github_link } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const ts = now();
    const result = db
      .prepare(
        'INSERT INTO projects (name, created_at, updated_at, current_phase, github_link, pinned) VALUES (?, ?, ?, ?, ?, 0)'
      )
      .run(name.trim(), ts, ts, 'Plan', github_link || null);
    const projectId = result.lastInsertRowid;
    db.prepare(
      'INSERT INTO plan_data (project_id, created_at, updated_at) VALUES (?, ?, ?)'
    ).run(projectId, ts, ts);
    db.prepare(
      'INSERT INTO coding_data (project_id, created_at, updated_at) VALUES (?, ?, ?)'
    ).run(projectId, ts, ts);
    db.prepare(
      'INSERT INTO support_data (project_id, created_at, updated_at) VALUES (?, ?, ?)'
    ).run(projectId, ts, ts);
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
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

  // PUT /api/projects/:id — name, github_link, pinned.
  // current_phase is a forward-only auto-advance field (Coding/Support/Checker
  // chunks D1/D2/E1). It is never settable via this route.
  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid project id' });
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const { name, github_link, pinned } = req.body || {};
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'name must be a non-empty string' });
    }
    const newName = name !== undefined ? name.trim() : row.name;
    const newLink = github_link !== undefined ? github_link || null : row.github_link;
    const newPinned = pinned !== undefined ? (toBool(pinned) ? 1 : 0) : row.pinned;
    db.prepare(
      'UPDATE projects SET name = ?, github_link = ?, pinned = ?, updated_at = ? WHERE id = ?'
    ).run(newName, newLink, newPinned, now(), id);
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
  scopeRouter.use('/support', supportDataRouter(db));
  scopeRouter.use('/support-logs', supportLogsRouter(db));
  scopeRouter.use('/checker-issues', checkerIssuesRouter(db));
  router.use('/:projectId', scopeRouter);

  return router;
};

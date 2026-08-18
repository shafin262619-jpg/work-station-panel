'use strict';

const express = require('express');
const { now } = require('../helpers');

const FIELD_TIMESTAMP_COLUMNS = {
  basic_plan: 'basic_plan_updated_at',
  data_collector_log: 'data_collector_log_updated_at',
  final_plan: 'final_plan_updated_at',
  prompt_guide_file: 'prompt_guide_file_updated_at',
};

const CONTENT_FIELDS = Object.keys(FIELD_TIMESTAMP_COLUMNS);

function buildRow(row) {
  if (!row) return null;
  return { ...row };
}

module.exports = function planDataRouter(db) {
  const router = express.Router({ mergeParams: true });

  const selectByProject = db.prepare('SELECT * FROM plan_data WHERE project_id = ?');

  // GET /api/projects/:projectId/plan
  router.get('/', (req, res) => {
    const row = selectByProject.get(req.projectId);
    if (!row) return res.status(404).json({ error: 'PlanData not found' });
    res.json(buildRow(row));
  });

  // POST /api/projects/:projectId/plan
  router.post('/', (req, res) => {
    if (selectByProject.get(req.projectId)) {
      return res.status(409).json({ error: 'PlanData already exists for this project' });
    }
    const ts = now();
    const values = {};
    for (const field of CONTENT_FIELDS) {
      values[field] = req.body && req.body[field] !== undefined ? req.body[field] : null;
      values[FIELD_TIMESTAMP_COLUMNS[field]] = values[field] !== null ? ts : null;
    }
    const result = db
      .prepare(
        `INSERT INTO plan_data (
          project_id, basic_plan, basic_plan_updated_at,
          data_collector_log, data_collector_log_updated_at,
          final_plan, final_plan_updated_at,
          prompt_guide_file, prompt_guide_file_updated_at,
          created_at, updated_at
        ) VALUES (
          @project_id, @basic_plan, @basic_plan_updated_at,
          @data_collector_log, @data_collector_log_updated_at,
          @final_plan, @final_plan_updated_at,
          @prompt_guide_file, @prompt_guide_file_updated_at,
          @created_at, @updated_at
        )`
      )
      .run({ project_id: req.projectId, ...values, created_at: ts, updated_at: ts });
    const row = db
      .prepare('SELECT * FROM plan_data WHERE id = ?')
      .get(result.lastInsertRowid);
    res.status(201).json(buildRow(row));
  });

  // PUT /api/projects/:projectId/plan — partial update with per-field timestamps.
  // Upserts: if no row exists yet, one is created.
  router.put('/', (req, res) => {
    const existing = selectByProject.get(req.projectId);
    const ts = now();
    const body = req.body || {};

    const values = {};
    let changed = false;
    for (const field of CONTENT_FIELDS) {
      if (body[field] !== undefined) {
        values[field] = body[field];
        values[FIELD_TIMESTAMP_COLUMNS[field]] = body[field] !== null ? ts : null;
        changed = true;
      }
    }

    if (existing) {
      const sets = [];
      const params = { id: existing.id, updated_at: ts };
      for (const [key, value] of Object.entries(values)) {
        sets.push(`${key} = @${key}`);
        params[key] = value;
      }
      if (changed) {
        db.prepare(`UPDATE plan_data SET ${sets.join(', ')}, updated_at = @updated_at WHERE id = @id`).run(params);
      }
      res.json(buildRow(selectByProject.get(req.projectId)));
    } else {
      if (!changed) {
        return res.status(400).json({
          error: 'No updatable field provided (basic_plan, data_collector_log, final_plan, prompt_guide_file)',
        });
      }
      for (const field of CONTENT_FIELDS) {
        if (values[field] === undefined) {
          values[field] = null;
          values[FIELD_TIMESTAMP_COLUMNS[field]] = null;
        }
      }
      const result = db
        .prepare(
          `INSERT INTO plan_data (
            project_id, basic_plan, basic_plan_updated_at,
            data_collector_log, data_collector_log_updated_at,
            final_plan, final_plan_updated_at,
            prompt_guide_file, prompt_guide_file_updated_at,
            created_at, updated_at
          ) VALUES (
            @project_id, @basic_plan, @basic_plan_updated_at,
            @data_collector_log, @data_collector_log_updated_at,
            @final_plan, @final_plan_updated_at,
            @prompt_guide_file, @prompt_guide_file_updated_at,
            @created_at, @updated_at
          )`
        )
        .run({ project_id: req.projectId, ...values, created_at: ts, updated_at: ts });
      const row = db
        .prepare('SELECT * FROM plan_data WHERE id = ?')
        .get(result.lastInsertRowid);
      res.status(201).json(buildRow(row));
    }
  });

  // DELETE /api/projects/:projectId/plan
  router.delete('/', (req, res) => {
    const result = db.prepare('DELETE FROM plan_data WHERE project_id = ?').run(req.projectId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'PlanData not found' });
    }
    res.status(204).end();
  });

  return router;
};

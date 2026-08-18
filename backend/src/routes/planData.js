'use strict';

const express = require('express');
const { now } = require('../helpers');

// Content fields that each carry their own updated_at timestamp, so editing
// one field never touches another field's "last updated" version marker.
const FIELD_TIMESTAMP_COLUMNS = {
  basic_plan: 'basic_plan_updated_at',
  data_collector_log: 'data_collector_log_updated_at',
  final_plan: 'final_plan_updated_at',
  prompt_guide_file: 'prompt_guide_file_updated_at',
};

const CONTENT_FIELDS = Object.keys(FIELD_TIMESTAMP_COLUMNS);

// Tool link for the Master Data Collector Log sub-section. It shares the log's
// timestamp: editing it bumps data_collector_log_updated_at.
const TOOL_LINK_FIELD = 'data_collector_tool_link';

// Fields patchable via PATCH /plan/:field.
const PATCHABLE_FIELDS = [...CONTENT_FIELDS, TOOL_LINK_FIELD];

const INSERT_COLUMNS = [
  'project_id',
  'basic_plan', 'basic_plan_updated_at',
  'data_collector_log', 'data_collector_log_updated_at',
  'data_collector_tool_link',
  'final_plan', 'final_plan_updated_at',
  'prompt_guide_file', 'prompt_guide_file_updated_at',
  'created_at', 'updated_at',
];

function buildRow(row) {
  if (!row) return null;
  return { ...row };
}

// Applies a single field value to an existing row, or upserts a fresh row when
// none exists yet. Returns { created } so callers can pick 200 vs 201.
function applyFieldValue(db, projectId, existing, field, value, ts) {
  if (field === TOOL_LINK_FIELD) {
    if (existing) {
      db.prepare(
        `UPDATE plan_data SET data_collector_tool_link = ?, data_collector_log_updated_at = ?, updated_at = ? WHERE id = ?`
      ).run(value, ts, ts, existing.id);
      return { created: false };
    }
    db.prepare(
      `INSERT INTO plan_data (project_id, data_collector_tool_link, data_collector_log_updated_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(projectId, value, ts, ts, ts);
    return { created: true };
  }

  const timestampColumn = FIELD_TIMESTAMP_COLUMNS[field];
  const timestampValue = value !== null ? ts : null;
  if (existing) {
    db.prepare(
      `UPDATE plan_data SET ${field} = ?, ${timestampColumn} = ?, updated_at = ? WHERE id = ?`
    ).run(value, timestampValue, ts, existing.id);
    return { created: false };
  }

  const values = { project_id: projectId, created_at: ts, updated_at: ts };
  for (const f of CONTENT_FIELDS) {
    values[f] = null;
    values[FIELD_TIMESTAMP_COLUMNS[f]] = null;
  }
  values[TOOL_LINK_FIELD] = null;
  values[field] = value;
  values[timestampColumn] = timestampValue;
  db.prepare(
    `INSERT INTO plan_data (
       project_id,
       basic_plan, basic_plan_updated_at,
       data_collector_log, data_collector_log_updated_at,
       data_collector_tool_link,
       final_plan, final_plan_updated_at,
       prompt_guide_file, prompt_guide_file_updated_at,
       created_at, updated_at
     ) VALUES (
       @project_id,
       @basic_plan, @basic_plan_updated_at,
       @data_collector_log, @data_collector_log_updated_at,
       @data_collector_tool_link,
       @final_plan, @final_plan_updated_at,
       @prompt_guide_file, @prompt_guide_file_updated_at,
       @created_at, @updated_at
     )`
  ).run(values);
  return { created: true };
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
    const body = req.body || {};
    const values = { project_id: req.projectId, created_at: ts, updated_at: ts };
    for (const field of CONTENT_FIELDS) {
      const v = body[field] !== undefined ? body[field] : null;
      values[field] = v;
      values[FIELD_TIMESTAMP_COLUMNS[field]] = v !== null ? ts : null;
    }
    values[TOOL_LINK_FIELD] = body[TOOL_LINK_FIELD] !== undefined ? body[TOOL_LINK_FIELD] : null;
    if (values[TOOL_LINK_FIELD] !== null && values.data_collector_log_updated_at === null) {
      values.data_collector_log_updated_at = ts;
    }
    db.prepare(
      `INSERT INTO plan_data (${INSERT_COLUMNS.join(', ')}) VALUES (${INSERT_COLUMNS.map((c) => `@${c}`).join(', ')})`
    ).run(values);
    res.status(201).json(buildRow(selectByProject.get(req.projectId)));
  });

  // PATCH /api/projects/:projectId/plan/:field — update one field at a time so
  // only that field's timestamp changes. Body: { "value": string | null }.
  router.patch('/:field', (req, res) => {
    const field = req.params.field;
    if (!PATCHABLE_FIELDS.includes(field)) {
      return res.status(400).json({
        error: `Unknown field '${field}'. Allowed: ${PATCHABLE_FIELDS.join(', ')}`,
      });
    }
    const { value } = req.body || {};
    if (value === undefined) {
      return res.status(400).json({ error: 'value is required' });
    }
    if (value !== null && typeof value !== 'string') {
      return res.status(400).json({ error: 'value must be a string or null' });
    }
    const existing = selectByProject.get(req.projectId);
    const { created } = applyFieldValue(db, req.projectId, existing, field, value, now());
    res.status(created ? 201 : 200).json(buildRow(selectByProject.get(req.projectId)));
  });

  // PUT /api/projects/:projectId/plan — partial update (upserts if missing).
  router.put('/', (req, res) => {
    const body = req.body || {};
    const provided = PATCHABLE_FIELDS.filter((f) => body[f] !== undefined);
    if (provided.length === 0) {
      return res.status(400).json({
        error: 'No updatable field provided (basic_plan, data_collector_log, data_collector_tool_link, final_plan, prompt_guide_file)',
      });
    }
    for (const f of provided) {
      const value = body[f];
      if (value !== null && typeof value !== 'string') {
        return res.status(400).json({ error: `${f} must be a string or null` });
      }
    }
    const ts = now();
    const existing = selectByProject.get(req.projectId);
    const created = !existing;
    if (!existing) {
      db.prepare(
        'INSERT INTO plan_data (project_id, created_at, updated_at) VALUES (?, ?, ?)'
      ).run(req.projectId, ts, ts);
    }
    const row = selectByProject.get(req.projectId);
    for (const f of provided) {
      applyFieldValue(db, req.projectId, row, f, body[f], ts);
    }
    res.status(created ? 201 : 200).json(buildRow(selectByProject.get(req.projectId)));
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

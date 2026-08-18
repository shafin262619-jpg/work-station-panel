'use strict';

const { now } = require('./helpers');

// The workflow phases are ordered: Plan → Coding → Support → Checker.
// current_phase only ever moves forward. A chunk can request an advance to a
// later phase (e.g. D1 asks for "Coding" when a monkey account is selected or
// a todo is added; D2 will ask for "Support" on the first support log). If the
// project is already at or past the requested phase, nothing changes — this is
// what makes the field forward-only and never regressible via these routes.
const PHASE_ORDER = ['Plan', 'Coding', 'Support', 'Checker'];

function maybeAdvancePhase(db, projectId, targetPhase) {
  const targetIndex = PHASE_ORDER.indexOf(targetPhase);
  if (targetIndex === -1) return false;
  const project = db.prepare('SELECT current_phase FROM projects WHERE id = ?').get(projectId);
  if (!project) return false;
  const currentIndex = PHASE_ORDER.indexOf(project.current_phase);
  if (currentIndex === -1 || targetIndex <= currentIndex) return false;
  db.prepare('UPDATE projects SET current_phase = ?, updated_at = ? WHERE id = ?').run(
    targetPhase,
    now(),
    projectId
  );
  return true;
}

module.exports = { maybeAdvancePhase, PHASE_ORDER };

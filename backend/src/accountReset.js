'use strict';

const cron = require('node-cron');
const { now } = require('./helpers');

// Local-midnight cron expression (best-effort layer — only fires while the
// server is running). The lazy-reset fallback (maybeRunLazyReset) is the
// reliable mechanism that catches missed resets whenever accounts are loaded.
const DAILY_RESET_CRON = '0 0 * * *';

// Local calendar date as YYYY-MM-DD. Used both for the lazy-reset comparison
// and as the marker stored in Settings.last_account_reset_date.
function getTodayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Reset every account to 'available' and record the reset date in the
// singleton settings row (created on first use; existing values like
// ai_helping_enabled / gemini_api_key are preserved).
function runDailyReset(db, todayKey = getTodayKey()) {
  db.prepare("UPDATE accounts SET status = 'available'").run();
  db.prepare(
    `INSERT INTO settings (id, ai_helping_enabled, gemini_api_key, last_account_reset_date, created_at, updated_at)
     VALUES (1, 0, NULL, @todayKey, @now, @now)
     ON CONFLICT(id) DO UPDATE SET
       last_account_reset_date = excluded.last_account_reset_date,
       updated_at = excluded.updated_at`
  ).run({ todayKey, now: now() });
  return true;
}

// Lazy-reset fallback: if the recorded reset date is older than today, a
// missed midnight reset is caught here. Returns true when a reset ran.
function maybeRunLazyReset(db, todayKey = getTodayKey()) {
  const settings = db.prepare('SELECT last_account_reset_date FROM settings WHERE id = 1').get();
  const lastReset = settings ? settings.last_account_reset_date : null;
  if (!lastReset || todayKey > lastReset) {
    runDailyReset(db, todayKey);
    return true;
  }
  return false;
}

// Best-effort daily reset at local midnight. cronModule / expression are
// injectable so tests can drive the tick with a fake scheduler.
function setupDailyResetCron(db, { cronModule = cron, expression = DAILY_RESET_CRON, onTick } = {}) {
  const task = cronModule.schedule(expression, () => {
    runDailyReset(db);
    if (onTick) onTick();
  });
  task.start();
  return task;
}

module.exports = {
  DAILY_RESET_CRON,
  getTodayKey,
  runDailyReset,
  maybeRunLazyReset,
  setupDailyResetCron,
};

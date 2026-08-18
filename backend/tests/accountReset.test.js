'use strict';

const { describe, before, after, beforeEach, test } = require('node:test');
const assert = require('node:assert');
const { createDb } = require('../src/db');
const {
  DAILY_RESET_CRON,
  getTodayKey,
  runDailyReset,
  maybeRunLazyReset,
  setupDailyResetCron,
} = require('../src/accountReset');
const { startTestServer, request } = require('./helpers');

describe('getTodayKey', () => {
  test('formats a date as YYYY-MM-DD using local time', () => {
    const date = new Date(2026, 7, 18, 23, 59, 59);
    assert.strictEqual(getTodayKey(date), '2026-08-18');
  });

  test('pads month and day with a leading zero', () => {
    const date = new Date(2026, 0, 5, 0, 0, 0);
    assert.strictEqual(getTodayKey(date), '2026-01-05');
  });
});

describe('runDailyReset', () => {
  let db;

  beforeEach(() => {
    db = createDb(':memory:');
  });

  test('sets every account to available and records the reset date', () => {
    db.prepare("INSERT INTO accounts (type, label, status, created_at) VALUES ('monkey', 'a', 'limit_reached', 'x')").run();
    db.prepare("INSERT INTO accounts (type, label, status, created_at) VALUES ('claude', 'b', 'available', 'x')").run();
    runDailyReset(db, '2026-08-19');
    const statuses = db.prepare('SELECT status FROM accounts ORDER BY id').all();
    assert.deepStrictEqual(statuses, [{ status: 'available' }, { status: 'available' }]);
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    assert.strictEqual(settings.last_account_reset_date, '2026-08-19');
  });

  test('preserves existing settings values like ai_helping_enabled', () => {
    db.prepare("INSERT INTO settings (id, ai_helping_enabled, created_at, updated_at) VALUES (1, 1, 'x', 'x')").run();
    runDailyReset(db, '2026-08-19');
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    assert.strictEqual(settings.ai_helping_enabled, 1);
    assert.strictEqual(settings.last_account_reset_date, '2026-08-19');
  });

  test('creates the settings singleton row when it does not exist yet', () => {
    runDailyReset(db, '2026-08-19');
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    assert.strictEqual(settings.last_account_reset_date, '2026-08-19');
  });
});

describe('maybeRunLazyReset', () => {
  let db;

  beforeEach(() => {
    db = createDb(':memory:');
  });

  test('runs when no reset date has been recorded yet', () => {
    db.prepare("INSERT INTO accounts (type, label, status, created_at) VALUES ('monkey', 'a', 'limit_reached', 'x')").run();
    assert.strictEqual(maybeRunLazyReset(db, '2026-08-18'), true);
    assert.strictEqual(db.prepare('SELECT status FROM accounts').get().status, 'available');
    assert.strictEqual(
      db.prepare('SELECT last_account_reset_date FROM settings WHERE id = 1').get().last_account_reset_date,
      '2026-08-18'
    );
  });

  test('runs when today is newer than the recorded reset date (missed reset)', () => {
    db.prepare("INSERT INTO accounts (type, label, status, created_at) VALUES ('monkey', 'a', 'limit_reached', 'x')").run();
    runDailyReset(db, '2026-08-17');
    db.prepare("UPDATE accounts SET status = 'limit_reached'").run();
    assert.strictEqual(maybeRunLazyReset(db, '2026-08-18'), true);
    assert.strictEqual(db.prepare('SELECT status FROM accounts').get().status, 'available');
    assert.strictEqual(
      db.prepare('SELECT last_account_reset_date FROM settings WHERE id = 1').get().last_account_reset_date,
      '2026-08-18'
    );
  });

  test('does not run twice on the same day', () => {
    db.prepare("INSERT INTO accounts (type, label, status, created_at) VALUES ('monkey', 'a', 'limit_reached', 'x')").run();
    maybeRunLazyReset(db, '2026-08-18');
    db.prepare("UPDATE accounts SET status = 'limit_reached'").run();
    assert.strictEqual(maybeRunLazyReset(db, '2026-08-18'), false);
    assert.strictEqual(db.prepare('SELECT status FROM accounts').get().status, 'limit_reached');
  });

  test('does not run when the recorded reset date is in the future', () => {
    db.prepare("INSERT INTO accounts (type, label, status, created_at) VALUES ('monkey', 'a', 'limit_reached', 'x')").run();
    runDailyReset(db, '2030-01-02');
    db.prepare("UPDATE accounts SET status = 'limit_reached'").run();
    assert.strictEqual(maybeRunLazyReset(db, '2026-08-18'), false);
    assert.strictEqual(db.prepare('SELECT status FROM accounts').get().status, 'limit_reached');
  });
});

describe('setupDailyResetCron (best-effort, mocked scheduler)', () => {
  let db;

  beforeEach(() => {
    db = createDb(':memory:');
  });

  test('schedules the local-midnight expression and starts the task', () => {
    const scheduled = [];
    let started = false;
    const fakeCron = {
      schedule(expression, cb) {
        scheduled.push({ expression, cb });
        return {
          start() {
            started = true;
          },
          stop() {},
        };
      },
    };
    setupDailyResetCron(db, { cronModule: fakeCron });
    assert.strictEqual(DAILY_RESET_CRON, '0 0 * * *');
    assert.strictEqual(scheduled.length, 1);
    assert.strictEqual(scheduled[0].expression, '0 0 * * *');
    assert.strictEqual(started, true);
  });

  test('tick resets accounts and records today as the reset date', () => {
    db.prepare("INSERT INTO accounts (type, label, status, created_at) VALUES ('monkey', 'a', 'limit_reached', 'x')").run();
    const expected = getTodayKey();
    let tick = null;
    const fakeCron = {
      schedule(expression, cb) {
        tick = cb;
        return { start() {}, stop() {} };
      },
    };
    setupDailyResetCron(db, { cronModule: fakeCron });
    assert.ok(tick, 'callback should be registered');
    tick();
    assert.strictEqual(db.prepare('SELECT status FROM accounts').get().status, 'available');
    assert.strictEqual(
      db.prepare('SELECT last_account_reset_date FROM settings WHERE id = 1').get().last_account_reset_date,
      expected
    );
  });

  test('default expression is a valid node-cron schedule', () => {
    const cron = require('node-cron');
    assert.strictEqual(cron.validate(DAILY_RESET_CRON), true);
  });
});

describe('GET /accounts lazy-reset over HTTP (mocked system date)', () => {
  let ctx;
  const MOCK_TODAY = '2030-01-02';
  const PREVIOUS_DAY = '2030-01-01';

  before(async () => {
    ctx = await startTestServer({ getTodayKey: () => MOCK_TODAY });
    await request(ctx.baseUrl, 'PUT', '/settings', { last_account_reset_date: PREVIOUS_DAY });
  });

  after(async () => {
    await ctx.close();
  });

  test('resets a missed daily reset when the date has advanced', async () => {
    const created = await request(ctx.baseUrl, 'POST', '/accounts', {
      type: 'monkey',
      label: 'Stale',
      status: 'limit_reached',
    });
    const { status, body } = await request(ctx.baseUrl, 'GET', '/accounts');
    assert.strictEqual(status, 200);
    const stale = body.data.find((a) => a.id === created.body.id);
    assert.strictEqual(stale.status, 'available');
    const settings = await request(ctx.baseUrl, 'GET', '/settings');
    assert.strictEqual(settings.body.last_account_reset_date, MOCK_TODAY);
  });

  test('second GET on the same day does not reset again', async () => {
    await request(ctx.baseUrl, 'POST', '/accounts', {
      type: 'claude',
      label: 'Same day',
      status: 'limit_reached',
    });
    const before = (await request(ctx.baseUrl, 'GET', '/settings')).body.updated_at;
    const { body } = await request(ctx.baseUrl, 'GET', '/accounts');
    assert.ok(
      body.data.some((a) => a.status === 'limit_reached'),
      'the account created today must stay limit_reached (no auto-reset)'
    );
    const after = (await request(ctx.baseUrl, 'GET', '/settings')).body.updated_at;
    assert.strictEqual(after, before, 'settings untouched => lazy reset did not run again');
  });
});

'use strict';

const { describe, before, after, test } = require('node:test');
const assert = require('node:assert');
const { startTestServer, request, createProject, createAccount } = require('./helpers');
const { maybeAdvancePhase, PHASE_ORDER } = require('../src/phaseAdvance');

describe('maybeAdvancePhase — forward-only helper', () => {
  let ctx;

  before(async () => {
    ctx = await startTestServer();
  });

  after(async () => {
    await ctx.close();
  });

  test('PHASE_ORDER is Plan → Coding → Support → Checker', () => {
    assert.deepStrictEqual(PHASE_ORDER, ['Plan', 'Coding', 'Support', 'Checker']);
  });

  test('advances Plan → Coding', async () => {
    const project = await createProject(ctx.baseUrl, { name: 'Advance' });
    const changed = maybeAdvancePhase(ctx.db, project.id, 'Coding');
    assert.strictEqual(changed, true);
    const row = ctx.db.prepare('SELECT current_phase FROM projects WHERE id = ?').get(project.id);
    assert.strictEqual(row.current_phase, 'Coding');
  });

  test('advances Coding → Support', async () => {
    const project = await createProject(ctx.baseUrl, { name: 'Advance2' });
    maybeAdvancePhase(ctx.db, project.id, 'Coding');
    const changed = maybeAdvancePhase(ctx.db, project.id, 'Support');
    assert.strictEqual(changed, true);
    const row = ctx.db.prepare('SELECT current_phase FROM projects WHERE id = ?').get(project.id);
    assert.strictEqual(row.current_phase, 'Support');
  });

  test('does not go backward (Support request while already Checker)', async () => {
    const project = await createProject(ctx.baseUrl, { name: 'Backward' });
    ctx.db
      .prepare('UPDATE projects SET current_phase = ? WHERE id = ?')
      .run('Checker', project.id);
    const changed = maybeAdvancePhase(ctx.db, project.id, 'Support');
    assert.strictEqual(changed, false);
    const row = ctx.db.prepare('SELECT current_phase FROM projects WHERE id = ?').get(project.id);
    assert.strictEqual(row.current_phase, 'Checker');
  });

  test('does nothing when already at the requested phase', async () => {
    const project = await createProject(ctx.baseUrl, { name: 'Already' });
    ctx.db
      .prepare('UPDATE projects SET current_phase = ? WHERE id = ?')
      .run('Coding', project.id);
    const changed = maybeAdvancePhase(ctx.db, project.id, 'Coding');
    assert.strictEqual(changed, false);
  });

  test('returns false for a missing project or unknown phase', () => {
    assert.strictEqual(maybeAdvancePhase(ctx.db, 99999, 'Coding'), false);
    assert.strictEqual(maybeAdvancePhase(ctx.db, 1, 'Nope'), false);
  });
});

describe('CodingData phase auto-advance (chunk D1)', () => {
  let ctx;

  before(async () => {
    ctx = await startTestServer();
  });

  after(async () => {
    await ctx.close();
  });

  async function phaseOf(projectId) {
    const { body } = await request(ctx.baseUrl, 'GET', `/projects/${projectId}`);
    return body.current_phase;
  }

  async function forcePhase(projectId, phase) {
    ctx.db
      .prepare('UPDATE projects SET current_phase = ? WHERE id = ?')
      .run(phase, projectId);
  }

  test('selecting a monkey account advances Plan → Coding', async () => {
    const project = await createProject(ctx.baseUrl, { name: 'AccSelect' });
    await request(ctx.baseUrl, 'DELETE', `/projects/${project.id}/coding`);
    const account = await createAccount(ctx.baseUrl);
    const { status } = await request(ctx.baseUrl, 'POST', `/projects/${project.id}/coding`, {
      active_monkey_account_id: account.id,
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(await phaseOf(project.id), 'Coding');
  });

  test('adding a first todo item advances Plan → Coding', async () => {
    const project = await createProject(ctx.baseUrl, { name: 'TodoAdvance' });
    const { status } = await request(ctx.baseUrl, 'PUT', `/projects/${project.id}/coding`, {
      todo_list: [{ id: 1, text: 'write the handler', done: false }],
    });
    assert.ok(status === 200 || status === 201);
    assert.strictEqual(await phaseOf(project.id), 'Coding');
  });

  test('empty todo list or deselecting an account does not advance', async () => {
    const empty = await createProject(ctx.baseUrl, { name: 'EmptyTodo' });
    await request(ctx.baseUrl, 'PUT', `/projects/${empty.id}/coding`, { todo_list: [] });
    assert.strictEqual(await phaseOf(empty.id), 'Plan');

    const deselect = await createProject(ctx.baseUrl, { name: 'Deselect' });
    const account = await createAccount(ctx.baseUrl);
    await request(ctx.baseUrl, 'PUT', `/projects/${deselect.id}/coding`, {
      active_monkey_account_id: account.id,
    });
    assert.strictEqual(await phaseOf(deselect.id), 'Coding');
    await request(ctx.baseUrl, 'PUT', `/projects/${deselect.id}/coding`, {
      active_monkey_account_id: null,
    });
    assert.strictEqual(await phaseOf(deselect.id), 'Coding');
  });

  test('does not overwrite when the phase is already past Coding', async () => {
    const support = await createProject(ctx.baseUrl, { name: 'PastCoding' });
    await forcePhase(support.id, 'Support');
    await request(ctx.baseUrl, 'PUT', `/projects/${support.id}/coding`, {
      todo_list: [{ id: 1, text: 'later', done: false }],
    });
    assert.strictEqual(await phaseOf(support.id), 'Support');

    const checker = await createProject(ctx.baseUrl, { name: 'CheckerAdv' });
    await forcePhase(checker.id, 'Checker');
    const account = await createAccount(ctx.baseUrl);
    await request(ctx.baseUrl, 'PUT', `/projects/${checker.id}/coding`, {
      active_monkey_account_id: account.id,
    });
    assert.strictEqual(await phaseOf(checker.id), 'Checker');
  });

  test('non-account-only writes do not change the phase', async () => {
    const project = await createProject(ctx.baseUrl, { name: 'NoAdvance' });
    await request(ctx.baseUrl, 'PUT', `/projects/${project.id}/coding`, { todo_list: [] });
    assert.strictEqual(await phaseOf(project.id), 'Plan');
  });
});

describe('SupportLog phase auto-advance (chunk D2)', () => {
  let ctx;

  before(async () => {
    ctx = await startTestServer();
  });

  after(async () => {
    await ctx.close();
  });

  async function phaseOf(projectId) {
    const { body } = await request(ctx.baseUrl, 'GET', `/projects/${projectId}`);
    return body.current_phase;
  }

  async function forcePhase(projectId, phase) {
    ctx.db
      .prepare('UPDATE projects SET current_phase = ? WHERE id = ?')
      .run(phase, projectId);
  }

  test('saving the first support log advances Plan → Support', async () => {
    const project = await createProject(ctx.baseUrl, { name: 'FirstSupport' });
    const { status } = await request(ctx.baseUrl, 'POST', `/projects/${project.id}/support-logs`, {
      prompt: 'Debug X',
      brief: 'done',
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(await phaseOf(project.id), 'Support');
  });

  test('saving the first support log advances Coding → Support', async () => {
    const project = await createProject(ctx.baseUrl, { name: 'CodingToSupport' });
    await forcePhase(project.id, 'Coding');
    await request(ctx.baseUrl, 'POST', `/projects/${project.id}/support-logs`, {
      prompt: 'Help',
    });
    assert.strictEqual(await phaseOf(project.id), 'Support');
  });

  test('adding more logs keeps the phase at Support', async () => {
    const project = await createProject(ctx.baseUrl, { name: 'MoreSupport' });
    await request(ctx.baseUrl, 'POST', `/projects/${project.id}/support-logs`, {
      prompt: 'First',
    });
    assert.strictEqual(await phaseOf(project.id), 'Support');
    await request(ctx.baseUrl, 'POST', `/projects/${project.id}/support-logs`, {
      prompt: 'Second',
    });
    assert.strictEqual(await phaseOf(project.id), 'Support');
  });

  test('does not overwrite Checker with Support', async () => {
    const project = await createProject(ctx.baseUrl, { name: 'CheckerSupport' });
    await forcePhase(project.id, 'Checker');
    await request(ctx.baseUrl, 'POST', `/projects/${project.id}/support-logs`, {
      prompt: 'Late log',
    });
    assert.strictEqual(await phaseOf(project.id), 'Checker');
  });

  test('selecting a claude account alone does not advance the phase', async () => {
    const project = await createProject(ctx.baseUrl, { name: 'ClaudeSelectOnly' });
    const claude = await createAccount(ctx.baseUrl, { type: 'claude', label: 'Claude A' });
    await request(ctx.baseUrl, 'PUT', `/projects/${project.id}/support`, {
      active_claude_account_id: claude.id,
    });
    assert.strictEqual(await phaseOf(project.id), 'Plan');
  });
});

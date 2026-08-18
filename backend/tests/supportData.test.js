'use strict';

const { describe, before, after, test } = require('node:test');
const assert = require('node:assert');
const { startTestServer, request, createProject, createAccount } = require('./helpers');

describe('SupportData API (active_claude_account_id)', () => {
  let ctx;
  let projectId;

  before(async () => {
    ctx = await startTestServer();
    projectId = (await createProject(ctx.baseUrl)).id;
    // A3/A4: POST /projects auto-creates an empty SupportData row. Remove it so
    // the suite can exercise creation-from-scratch semantics.
    await request(ctx.baseUrl, 'DELETE', `/projects/${projectId}/support`);
  });

  after(async () => {
    await ctx.close();
  });

  test('GET /support returns 404 when no SupportData exists', async () => {
    const { status } = await request(ctx.baseUrl, 'GET', `/projects/${projectId}/support`);
    assert.strictEqual(status, 404);
  });

  test('POST /support creates SupportData with a claude account', async () => {
    const claude = await createAccount(ctx.baseUrl, { type: 'claude', label: 'Claude 1' });
    const { status, body } = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/support`, {
      active_claude_account_id: claude.id,
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.project_id, projectId);
    assert.strictEqual(body.active_claude_account_id, claude.id);
    assert.ok(body.created_at);
  });

  test('POST /support rejects non-existent account id', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'BadClaudeAccount' });
    await request(ctx.baseUrl, 'DELETE', `/projects/${other.id}/support`);
    const { status, body } = await request(ctx.baseUrl, 'POST', `/projects/${other.id}/support`, {
      active_claude_account_id: 99999,
    });
    assert.strictEqual(status, 400);
    assert.ok(body.error);
  });

  test('POST /support rejects a monkey-type account', async () => {
    const monkey = await createAccount(ctx.baseUrl);
    const other = await createProject(ctx.baseUrl, { name: 'WrongSupportType' });
    await request(ctx.baseUrl, 'DELETE', `/projects/${other.id}/support`);
    const { status } = await request(ctx.baseUrl, 'POST', `/projects/${other.id}/support`, {
      active_claude_account_id: monkey.id,
    });
    assert.strictEqual(status, 400);
  });

  test('POST /support again returns 409', async () => {
    const { status } = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/support`, {
      active_claude_account_id: null,
    });
    assert.strictEqual(status, 409);
  });

  test('PUT /support updates active_claude_account_id', async () => {
    const claude = await createAccount(ctx.baseUrl, { type: 'claude', label: 'Claude 2' });
    const { status, body } = await request(ctx.baseUrl, 'PUT', `/projects/${projectId}/support`, {
      active_claude_account_id: claude.id,
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.active_claude_account_id, claude.id);
    assert.ok(body.updated_at);
  });

  test('PUT /support can clear the account with null', async () => {
    const { status, body } = await request(ctx.baseUrl, 'PUT', `/projects/${projectId}/support`, {
      active_claude_account_id: null,
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.active_claude_account_id, null);
  });

  test('PUT /support upserts when missing', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'NoSupportData' });
    await request(ctx.baseUrl, 'DELETE', `/projects/${other.id}/support`);
    const claude = await createAccount(ctx.baseUrl, { type: 'claude', label: 'Claude 3' });
    const { status, body } = await request(ctx.baseUrl, 'PUT', `/projects/${other.id}/support`, {
      active_claude_account_id: claude.id,
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.active_claude_account_id, claude.id);
  });

  test('DELETE /support removes SupportData', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'DeleteSupportData' });
    const { status } = await request(ctx.baseUrl, 'DELETE', `/projects/${other.id}/support`);
    assert.strictEqual(status, 204);
    const getRes = await request(ctx.baseUrl, 'GET', `/projects/${other.id}/support`);
    assert.strictEqual(getRes.status, 404);
  });

  test('SupportData is scoped per project', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'ScopedSupportData' });
    const claude = await createAccount(ctx.baseUrl, { type: 'claude', label: 'Claude 4' });
    await request(ctx.baseUrl, 'PUT', `/projects/${other.id}/support`, {
      active_claude_account_id: claude.id,
    });
    const mine = await request(ctx.baseUrl, 'GET', `/projects/${projectId}/support`);
    assert.strictEqual(mine.body.project_id, projectId);
    const theirs = await request(ctx.baseUrl, 'GET', `/projects/${other.id}/support`);
    assert.strictEqual(theirs.body.active_claude_account_id, claude.id);
  });
});

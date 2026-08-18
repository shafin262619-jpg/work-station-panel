'use strict';

const { describe, before, after, test } = require('node:test');
const assert = require('node:assert');
const { startTestServer, request, createProject, createAccount } = require('./helpers');

describe('CodingData API', () => {
  let ctx;
  let projectId;

  before(async () => {
    ctx = await startTestServer();
    projectId = (await createProject(ctx.baseUrl)).id;
    // A3: POST /projects auto-creates an empty CodingData row. Remove it so
    // the suite can exercise creation-from-scratch semantics.
    await request(ctx.baseUrl, 'DELETE', `/projects/${projectId}/coding`);
  });

  after(async () => {
    await ctx.close();
  });

  test('GET coding returns 404 when no CodingData exists', async () => {
    const { status } = await request(ctx.baseUrl, 'GET', `/projects/${projectId}/coding`);
    assert.strictEqual(status, 404);
  });

  test('POST /coding creates CodingData with todo_list round-tripped as array', async () => {
    const account = await createAccount(ctx.baseUrl);
    const { status, body } = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/coding`, {
      active_monkey_account_id: account.id,
      todo_list: ['task a', 'task b'],
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.active_monkey_account_id, account.id);
    assert.deepStrictEqual(body.todo_list, ['task a', 'task b']);
    assert.ok(body.created_at);
  });

  test('POST /coding rejects non-existent account id', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'BadAccount' });
    await request(ctx.baseUrl, 'DELETE', `/projects/${other.id}/coding`);
    const { status, body } = await request(ctx.baseUrl, 'POST', `/projects/${other.id}/coding`, {
      active_monkey_account_id: 99999,
    });
    assert.strictEqual(status, 400);
    assert.ok(body.error);
  });

  test('POST /coding rejects a claude-type account', async () => {
    const claude = await createAccount(ctx.baseUrl, { type: 'claude', label: 'Claude 1' });
    const other = await createProject(ctx.baseUrl, { name: 'WrongType' });
    await request(ctx.baseUrl, 'DELETE', `/projects/${other.id}/coding`);
    const { status } = await request(ctx.baseUrl, 'POST', `/projects/${other.id}/coding`, {
      active_monkey_account_id: claude.id,
    });
    assert.strictEqual(status, 400);
  });

  test('POST /coding again returns 409', async () => {
    const { status } = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/coding`, {
      todo_list: ['duplicate'],
    });
    assert.strictEqual(status, 409);
  });

  test('PUT /coding updates fields and updated_at', async () => {
    const { status, body } = await request(ctx.baseUrl, 'PUT', `/projects/${projectId}/coding`, {
      todo_list: ['task c'],
    });
    assert.strictEqual(status, 200);
    assert.deepStrictEqual(body.todo_list, ['task c']);
    assert.ok(body.updated_at);
  });

  test('PUT /coding upserts when missing', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'NoCoding' });
    await request(ctx.baseUrl, 'DELETE', `/projects/${other.id}/coding`);
    const { status, body } = await request(ctx.baseUrl, 'PUT', `/projects/${other.id}/coding`, {
      todo_list: [],
    });
    assert.strictEqual(status, 201);
    assert.deepStrictEqual(body.todo_list, []);
  });

  test('DELETE /coding removes CodingData', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'DeleteCoding' });
    const { status } = await request(ctx.baseUrl, 'DELETE', `/projects/${other.id}/coding`);
    assert.strictEqual(status, 204);
    const getRes = await request(ctx.baseUrl, 'GET', `/projects/${other.id}/coding`);
    assert.strictEqual(getRes.status, 404);
  });

  test('CodingData is scoped per project', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'ScopedCoding' });
    await request(ctx.baseUrl, 'PUT', `/projects/${other.id}/coding`, { todo_list: ['other'] });
    const mine = await request(ctx.baseUrl, 'GET', `/projects/${projectId}/coding`);
    assert.deepStrictEqual(mine.body.todo_list, ['task c']);
  });
});

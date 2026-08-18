'use strict';

const { describe, before, after, test } = require('node:test');
const assert = require('node:assert');
const { startTestServer, request, createProject } = require('./helpers');

describe('SupportLog API', () => {
  let ctx;
  let projectId;

  before(async () => {
    ctx = await startTestServer();
    projectId = (await createProject(ctx.baseUrl)).id;
  });

  after(async () => {
    await ctx.close();
  });

  test('POST /support-logs creates a log entry', async () => {
    const { status, body } = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/support-logs`, {
      prompt: 'Help me debug X',
      brief: 'Short summary',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    assert.strictEqual(status, 201);
    assert.ok(body.id);
    assert.strictEqual(body.prompt, 'Help me debug X');
    assert.strictEqual(body.brief, 'Short summary');
    assert.ok(body.timestamp);
  });

  test('POST /support-logs requires prompt', async () => {
    const { status } = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/support-logs`, {
      brief: 'no prompt',
    });
    assert.strictEqual(status, 400);
  });

  test('GET /support-logs lists entries newest first', async () => {
    await request(ctx.baseUrl, 'POST', `/projects/${projectId}/support-logs`, {
      prompt: 'Older entry',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    await request(ctx.baseUrl, 'POST', `/projects/${projectId}/support-logs`, {
      prompt: 'Second entry',
      timestamp: '2026-01-02T00:00:00.000Z',
    });
    const { status, body } = await request(ctx.baseUrl, 'GET', `/projects/${projectId}/support-logs`);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.data.length, 3);
    assert.strictEqual(body.data[0].prompt, 'Second entry');
  });

  test('GET /support-logs/:id returns one entry', async () => {
    const created = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/support-logs`, {
      prompt: 'Single',
    });
    const { status, body } = await request(
      ctx.baseUrl,
      'GET',
      `/projects/${projectId}/support-logs/${created.body.id}`
    );
    assert.strictEqual(status, 200);
    assert.strictEqual(body.prompt, 'Single');
  });

  test('GET /support-logs/:id returns 404 for missing entry', async () => {
    const { status } = await request(
      ctx.baseUrl,
      'GET',
      `/projects/${projectId}/support-logs/99999`
    );
    assert.strictEqual(status, 404);
  });

  test('PUT /support-logs/:id updates an entry', async () => {
    const created = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/support-logs`, {
      prompt: 'Before',
      brief: 'b1',
    });
    const { status, body } = await request(
      ctx.baseUrl,
      'PUT',
      `/projects/${projectId}/support-logs/${created.body.id}`,
      { brief: 'b2' }
    );
    assert.strictEqual(status, 200);
    assert.strictEqual(body.prompt, 'Before');
    assert.strictEqual(body.brief, 'b2');
  });

  test('DELETE /support-logs/:id removes an entry', async () => {
    const created = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/support-logs`, {
      prompt: 'Delete me',
    });
    const { status } = await request(
      ctx.baseUrl,
      'DELETE',
      `/projects/${projectId}/support-logs/${created.body.id}`
    );
    assert.strictEqual(status, 204);
    const getRes = await request(
      ctx.baseUrl,
      'GET',
      `/projects/${projectId}/support-logs/${created.body.id}`
    );
    assert.strictEqual(getRes.status, 404);
  });

  test('SupportLog is scoped per project', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'ScopedSupport' });
    await request(ctx.baseUrl, 'POST', `/projects/${other.id}/support-logs`, { prompt: 'other' });
    const { body } = await request(ctx.baseUrl, 'GET', `/projects/${projectId}/support-logs`);
    assert.ok(body.data.every((l) => l.project_id === projectId));
  });
});

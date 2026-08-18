'use strict';

const { describe, before, after, test } = require('node:test');
const assert = require('node:assert');
const { startTestServer, request, createProject } = require('./helpers');

describe('CheckerIssue API', () => {
  let ctx;
  let projectId;

  before(async () => {
    ctx = await startTestServer();
    projectId = (await createProject(ctx.baseUrl)).id;
  });

  after(async () => {
    await ctx.close();
  });

  test('POST /checker-issues creates an issue with defaults resolved=false archived=false', async () => {
    const { status, body } = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/checker-issues`, {
      source: 'self',
      description: 'README missing',
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.source, 'self');
    assert.strictEqual(body.description, 'README missing');
    assert.strictEqual(body.resolved, false);
    assert.strictEqual(body.archived, false);
  });

  test('POST /checker-issues validates source', async () => {
    const { status } = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/checker-issues`, {
      source: 'github',
      description: 'x',
    });
    assert.strictEqual(status, 400);
  });

  test('POST /checker-issues requires description', async () => {
    const { status } = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/checker-issues`, {
      source: 'claude',
    });
    assert.strictEqual(status, 400);
  });

  test('GET /checker-issues lists issues and supports filters', async () => {
    await request(ctx.baseUrl, 'POST', `/projects/${projectId}/checker-issues`, {
      source: 'claude',
      description: 'Syntax error',
      resolved: true,
    });
    const all = await request(ctx.baseUrl, 'GET', `/projects/${projectId}/checker-issues`);
    assert.strictEqual(all.status, 200);
    assert.strictEqual(all.body.data.length, 2);

    const resolved = await request(
      ctx.baseUrl,
      'GET',
      `/projects/${projectId}/checker-issues?resolved=true`
    );
    assert.strictEqual(resolved.body.data.length, 1);
    assert.strictEqual(resolved.body.data[0].resolved, true);

    const unresolved = await request(
      ctx.baseUrl,
      'GET',
      `/projects/${projectId}/checker-issues?resolved=false`
    );
    assert.strictEqual(unresolved.body.data.length, 1);
    assert.strictEqual(unresolved.body.data[0].resolved, false);
  });

  test('GET /checker-issues/:id returns one issue', async () => {
    const created = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/checker-issues`, {
      source: 'self',
      description: 'Single issue',
    });
    const { status, body } = await request(
      ctx.baseUrl,
      'GET',
      `/projects/${projectId}/checker-issues/${created.body.id}`
    );
    assert.strictEqual(status, 200);
    assert.strictEqual(body.description, 'Single issue');
  });

  test('PUT /checker-issues/:id updates resolved and archived', async () => {
    const created = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/checker-issues`, {
      source: 'self',
      description: 'Fix me',
    });
    const { status, body } = await request(
      ctx.baseUrl,
      'PUT',
      `/projects/${projectId}/checker-issues/${created.body.id}`,
      { resolved: true, archived: true }
    );
    assert.strictEqual(status, 200);
    assert.strictEqual(body.resolved, true);
    assert.strictEqual(body.archived, true);
  });

  test('DELETE /checker-issues/:id removes an issue', async () => {
    const created = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/checker-issues`, {
      source: 'self',
      description: 'Delete me',
    });
    const { status } = await request(
      ctx.baseUrl,
      'DELETE',
      `/projects/${projectId}/checker-issues/${created.body.id}`
    );
    assert.strictEqual(status, 204);
    const getRes = await request(
      ctx.baseUrl,
      'GET',
      `/projects/${projectId}/checker-issues/${created.body.id}`
    );
    assert.strictEqual(getRes.status, 404);
  });

  test('CheckerIssue is scoped per project', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'ScopedIssue' });
    await request(ctx.baseUrl, 'POST', `/projects/${other.id}/checker-issues`, {
      source: 'self',
      description: 'other issue',
    });
    const { body } = await request(ctx.baseUrl, 'GET', `/projects/${projectId}/checker-issues`);
    assert.ok(body.data.every((i) => i.project_id === projectId));
    const otherList = await request(ctx.baseUrl, 'GET', `/projects/${other.id}/checker-issues`);
    assert.strictEqual(otherList.body.data.length, 1);
  });
});

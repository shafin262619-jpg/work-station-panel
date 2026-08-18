'use strict';

const { describe, before, after, test } = require('node:test');
const assert = require('node:assert');
const { startTestServer, request } = require('./helpers');

describe('Projects API', () => {
  let ctx;

  before(async () => {
    ctx = await startTestServer();
  });

  after(async () => {
    await ctx.close();
  });

  test('POST /projects creates a project with current_phase "Plan"', async () => {
    const { status, body } = await request(ctx.baseUrl, 'POST', '/projects', {
      name: 'Alpha',
      github_link: 'https://github.com/org/alpha',
      current_phase: 'Coding',
    });
    assert.strictEqual(status, 201);
    assert.ok(body.id);
    assert.strictEqual(body.name, 'Alpha');
    assert.strictEqual(body.github_link, 'https://github.com/org/alpha');
    assert.strictEqual(body.current_phase, 'Plan');
    assert.ok(body.created_at);
  });

  test('POST /projects requires a name', async () => {
    const { status } = await request(ctx.baseUrl, 'POST', '/projects', { github_link: 'x' });
    assert.strictEqual(status, 400);
  });

  test('GET /projects lists projects', async () => {
    const { status, body } = await request(ctx.baseUrl, 'GET', '/projects');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.data.length, 1);
  });

  test('GET /projects/:id returns one project', async () => {
    const project = await request(ctx.baseUrl, 'POST', '/projects', { name: 'Beta' });
    const { status, body } = await request(ctx.baseUrl, 'GET', `/projects/${project.body.id}`);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.name, 'Beta');
  });

  test('GET /projects/:id returns 404 for missing project', async () => {
    const { status } = await request(ctx.baseUrl, 'GET', '/projects/99999');
    assert.strictEqual(status, 404);
  });

  test('PUT /projects/:id updates name and github_link but not current_phase', async () => {
    const { body: project } = await request(ctx.baseUrl, 'POST', '/projects', { name: 'Gamma' });
    const { status, body } = await request(ctx.baseUrl, 'PUT', `/projects/${project.id}`, {
      name: 'Gamma 2',
      github_link: 'https://github.com/org/gamma2',
      current_phase: 'Checker',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.name, 'Gamma 2');
    assert.strictEqual(body.github_link, 'https://github.com/org/gamma2');
    assert.strictEqual(body.current_phase, 'Plan');
  });

  test('DELETE /projects/:id removes a project', async () => {
    const { body: project } = await request(ctx.baseUrl, 'POST', '/projects', { name: 'Delta' });
    const { status } = await request(ctx.baseUrl, 'DELETE', `/projects/${project.id}`);
    assert.strictEqual(status, 204);
    const getRes = await request(ctx.baseUrl, 'GET', `/projects/${project.id}`);
    assert.strictEqual(getRes.status, 404);
  });

  test('scoped routes reject unknown projects with 404', async () => {
    const { status } = await request(ctx.baseUrl, 'GET', '/projects/99999/plan');
    assert.strictEqual(status, 404);
  });
});

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

  test('POST creates the project plus empty PlanData, CodingData and SupportData rows', async () => {
    const { status, body } = await request(ctx.baseUrl, 'POST', '/projects', {
      name: 'With Datasets',
    });
    assert.strictEqual(status, 201);
    assert.ok(body.id);

    const planRes = await request(ctx.baseUrl, 'GET', `/projects/${body.id}/plan`);
    assert.strictEqual(planRes.status, 200);
    assert.strictEqual(planRes.body.project_id, body.id);
    assert.strictEqual(planRes.body.basic_plan, null);
    assert.strictEqual(planRes.body.final_plan, null);

    const codingRes = await request(ctx.baseUrl, 'GET', `/projects/${body.id}/coding`);
    assert.strictEqual(codingRes.status, 200);
    assert.strictEqual(codingRes.body.project_id, body.id);
    assert.strictEqual(codingRes.body.active_monkey_account_id, null);
    assert.strictEqual(codingRes.body.todo_list, null);

    const supportRes = await request(ctx.baseUrl, 'GET', `/projects/${body.id}/support`);
    assert.strictEqual(supportRes.status, 200);
    assert.strictEqual(supportRes.body.project_id, body.id);
    assert.strictEqual(supportRes.body.active_claude_account_id, null);
  });

  test('POST defaults pinned to false and sets updated_at', async () => {
    const { body } = await request(ctx.baseUrl, 'POST', '/projects', { name: 'Pinned Default' });
    assert.strictEqual(body.pinned, 0);
    assert.ok(body.updated_at);
    assert.strictEqual(body.current_phase, 'Plan');
  });

  test('PUT toggles pinned and bumps updated_at', async () => {
    const { body: project } = await request(ctx.baseUrl, 'POST', '/projects', {
      name: 'Toggle Pin',
    });
    assert.strictEqual(project.pinned, 0);

    const pinRes = await request(ctx.baseUrl, 'PUT', `/projects/${project.id}`, { pinned: true });
    assert.strictEqual(pinRes.status, 200);
    assert.strictEqual(pinRes.body.pinned, 1);

    const unpinRes = await request(ctx.baseUrl, 'PUT', `/projects/${project.id}`, {
      pinned: false,
    });
    assert.strictEqual(unpinRes.status, 200);
    assert.strictEqual(unpinRes.body.pinned, 0);

    const getRes = await request(ctx.baseUrl, 'GET', `/projects/${project.id}`);
    assert.strictEqual(getRes.body.pinned, 0);
  });

  test('PUT with pinned preserves updated_at freshness (updated_at changes)', async () => {
    const { body: project } = await request(ctx.baseUrl, 'POST', '/projects', {
      name: 'Timestamp Bump',
    });
    const before = project.updated_at;
    await new Promise((r) => setTimeout(r, 5));
    const { body } = await request(ctx.baseUrl, 'PUT', `/projects/${project.id}`, {
      pinned: true,
    });
    assert.ok(body.updated_at > before);
  });
});

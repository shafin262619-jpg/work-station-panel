'use strict';

const { describe, before, after, test } = require('node:test');
const assert = require('node:assert');
const { startTestServer, request, createProject } = require('./helpers');

describe('PlanData API', () => {
  let ctx;
  let projectId;

  before(async () => {
    ctx = await startTestServer();
    projectId = (await createProject(ctx.baseUrl)).id;
  });

  after(async () => {
    await ctx.close();
  });

  test('GET plan returns 404 when no PlanData exists', async () => {
    const { status } = await request(ctx.baseUrl, 'GET', `/projects/${projectId}/plan`);
    assert.strictEqual(status, 404);
  });

  test('POST /plan creates PlanData with per-field timestamps', async () => {
    const { status, body } = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/plan`, {
      basic_plan: 'step by step',
      final_plan: 'final text',
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.basic_plan, 'step by step');
    assert.strictEqual(body.final_plan, 'final text');
    assert.strictEqual(body.data_collector_log, null);
    assert.ok(body.basic_plan_updated_at);
    assert.ok(body.final_plan_updated_at);
    assert.strictEqual(body.data_collector_log_updated_at, null);
  });

  test('POST /plan again returns 409', async () => {
    const { status } = await request(ctx.baseUrl, 'POST', `/projects/${projectId}/plan`, {
      basic_plan: 'duplicate',
    });
    assert.strictEqual(status, 409);
  });

  test('PUT /plan updates only provided fields and their timestamps', async () => {
    const before = await request(ctx.baseUrl, 'GET', `/projects/${projectId}/plan`);
    const { status, body } = await request(ctx.baseUrl, 'PUT', `/projects/${projectId}/plan`, {
      data_collector_log: 'collected notes',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data_collector_log, 'collected notes');
    assert.ok(body.data_collector_log_updated_at);
    assert.strictEqual(body.basic_plan, 'step by step');
    assert.strictEqual(
      body.basic_plan_updated_at,
      before.body.basic_plan_updated_at,
      'untouched field timestamp must stay unchanged'
    );
  });

  test('PUT /plan upserts when no row exists', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'Planless' });
    const { status, body } = await request(ctx.baseUrl, 'PUT', `/projects/${other.id}/plan`, {
      prompt_guide_file: 'guide.md',
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.prompt_guide_file, 'guide.md');
  });

  test('DELETE /plan removes PlanData', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'ToDelete' });
    await request(ctx.baseUrl, 'POST', `/projects/${other.id}/plan`, { basic_plan: 'x' });
    const { status } = await request(ctx.baseUrl, 'DELETE', `/projects/${other.id}/plan`);
    assert.strictEqual(status, 204);
    const getRes = await request(ctx.baseUrl, 'GET', `/projects/${other.id}/plan`);
    assert.strictEqual(getRes.status, 404);
  });

  test('PlanData is scoped per project (never mixed)', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'Scoped' });
    await request(ctx.baseUrl, 'POST', `/projects/${other.id}/plan`, { basic_plan: 'other plan' });
    const mine = await request(ctx.baseUrl, 'GET', `/projects/${projectId}/plan`);
    assert.strictEqual(mine.body.basic_plan, 'step by step');
    const theirs = await request(ctx.baseUrl, 'GET', `/projects/${other.id}/plan`);
    assert.strictEqual(theirs.body.basic_plan, 'other plan');
  });

  test('deleting a project cascades to its PlanData', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'Cascade' });
    await request(ctx.baseUrl, 'POST', `/projects/${other.id}/plan`, { basic_plan: 'cascade me' });
    await request(ctx.baseUrl, 'DELETE', `/projects/${other.id}`);
    const getRes = await request(ctx.baseUrl, 'GET', `/projects/${other.id}/plan`);
    assert.strictEqual(getRes.status, 404);
  });
});

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
    // A3: POST /projects auto-creates an empty PlanData row. Remove it so the
    // suite can exercise creation-from-scratch semantics.
    await request(ctx.baseUrl, 'DELETE', `/projects/${projectId}/plan`);
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
    await request(ctx.baseUrl, 'DELETE', `/projects/${other.id}/plan`);
    const { status, body } = await request(ctx.baseUrl, 'PUT', `/projects/${other.id}/plan`, {
      prompt_guide_file: 'guide.md',
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.prompt_guide_file, 'guide.md');
  });

  test('DELETE /plan removes PlanData', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'ToDelete' });
    const { status } = await request(ctx.baseUrl, 'DELETE', `/projects/${other.id}/plan`);
    assert.strictEqual(status, 204);
    const getRes = await request(ctx.baseUrl, 'GET', `/projects/${other.id}/plan`);
    assert.strictEqual(getRes.status, 404);
  });

  test('PlanData is scoped per project (never mixed)', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'Scoped' });
    await request(ctx.baseUrl, 'PUT', `/projects/${other.id}/plan`, { basic_plan: 'other plan' });
    const mine = await request(ctx.baseUrl, 'GET', `/projects/${projectId}/plan`);
    assert.strictEqual(mine.body.basic_plan, 'step by step');
    const theirs = await request(ctx.baseUrl, 'GET', `/projects/${other.id}/plan`);
    assert.strictEqual(theirs.body.basic_plan, 'other plan');
  });

  test('deleting a project cascades to its PlanData', async () => {
    const other = await createProject(ctx.baseUrl, { name: 'Cascade' });
    await request(ctx.baseUrl, 'PUT', `/projects/${other.id}/plan`, { basic_plan: 'cascade me' });
    await request(ctx.baseUrl, 'DELETE', `/projects/${other.id}`);
    const getRes = await request(ctx.baseUrl, 'GET', `/projects/${other.id}/plan`);
    assert.strictEqual(getRes.status, 404);
  });
});

describe('PlanData per-field timestamps via PATCH', () => {
  let ctx;
  let projectId;

  before(async () => {
    ctx = await startTestServer();
    projectId = (await createProject(ctx.baseUrl)).id;
    await request(ctx.baseUrl, 'DELETE', `/projects/${projectId}/plan`);
    await request(ctx.baseUrl, 'PATCH', `/projects/${projectId}/plan/basic_plan`, { value: 'bp v1' });
    await request(ctx.baseUrl, 'PATCH', `/projects/${projectId}/plan/data_collector_log`, { value: 'dcl v1' });
    await request(ctx.baseUrl, 'PATCH', `/projects/${projectId}/plan/final_plan`, { value: 'fp v1' });
    await request(ctx.baseUrl, 'PATCH', `/projects/${projectId}/plan/prompt_guide_file`, { value: 'pgf v1' });
  });

  after(async () => {
    await ctx.close();
  });

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const planUrl = () => `/projects/${projectId}/plan`;
  const getPlan = async () => (await request(ctx.baseUrl, 'GET', planUrl())).body;

  test('PATCH basic_plan bumps only basic_plan_updated_at', async () => {
    const before = await getPlan();
    await sleep(10);
    const { status, body } = await request(ctx.baseUrl, 'PATCH', `${planUrl()}/basic_plan`, {
      value: 'bp v2',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.basic_plan, 'bp v2');
    assert.notStrictEqual(body.basic_plan_updated_at, before.basic_plan_updated_at);
    assert.strictEqual(body.data_collector_log_updated_at, before.data_collector_log_updated_at);
    assert.strictEqual(body.final_plan_updated_at, before.final_plan_updated_at);
    assert.strictEqual(body.prompt_guide_file_updated_at, before.prompt_guide_file_updated_at);
  });

  test('PATCH data_collector_log bumps only data_collector_log_updated_at', async () => {
    const before = await getPlan();
    await sleep(10);
    const { status, body } = await request(ctx.baseUrl, 'PATCH', `${planUrl()}/data_collector_log`, {
      value: 'dcl v2',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data_collector_log, 'dcl v2');
    assert.notStrictEqual(body.data_collector_log_updated_at, before.data_collector_log_updated_at);
    assert.strictEqual(body.basic_plan_updated_at, before.basic_plan_updated_at);
    assert.strictEqual(body.final_plan_updated_at, before.final_plan_updated_at);
    assert.strictEqual(body.prompt_guide_file_updated_at, before.prompt_guide_file_updated_at);
  });

  test('PATCH final_plan bumps only final_plan_updated_at', async () => {
    const before = await getPlan();
    await sleep(10);
    const { status, body } = await request(ctx.baseUrl, 'PATCH', `${planUrl()}/final_plan`, {
      value: 'fp v2',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.final_plan, 'fp v2');
    assert.notStrictEqual(body.final_plan_updated_at, before.final_plan_updated_at);
    assert.strictEqual(body.basic_plan_updated_at, before.basic_plan_updated_at);
    assert.strictEqual(body.data_collector_log_updated_at, before.data_collector_log_updated_at);
    assert.strictEqual(body.prompt_guide_file_updated_at, before.prompt_guide_file_updated_at);
  });

  test('PATCH prompt_guide_file bumps only prompt_guide_file_updated_at', async () => {
    const before = await getPlan();
    await sleep(10);
    const { status, body } = await request(ctx.baseUrl, 'PATCH', `${planUrl()}/prompt_guide_file`, {
      value: 'pgf v2',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.prompt_guide_file, 'pgf v2');
    assert.notStrictEqual(body.prompt_guide_file_updated_at, before.prompt_guide_file_updated_at);
    assert.strictEqual(body.basic_plan_updated_at, before.basic_plan_updated_at);
    assert.strictEqual(body.data_collector_log_updated_at, before.data_collector_log_updated_at);
    assert.strictEqual(body.final_plan_updated_at, before.final_plan_updated_at);
  });

  test('PATCH data_collector_tool_link bumps data_collector_log_updated_at only', async () => {
    const before = await getPlan();
    await sleep(10);
    const { status, body } = await request(ctx.baseUrl, 'PATCH', `${planUrl()}/data_collector_tool_link`, {
      value: 'https://tool.example.com',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data_collector_tool_link, 'https://tool.example.com');
    assert.notStrictEqual(body.data_collector_log_updated_at, before.data_collector_log_updated_at);
    assert.strictEqual(body.basic_plan_updated_at, before.basic_plan_updated_at);
    assert.strictEqual(body.final_plan_updated_at, before.final_plan_updated_at);
    assert.strictEqual(body.prompt_guide_file_updated_at, before.prompt_guide_file_updated_at);
  });

  test('PATCH rejects an unknown field', async () => {
    const { status, body } = await request(ctx.baseUrl, 'PATCH', `${planUrl()}/not_a_field`, {
      value: 'x',
    });
    assert.strictEqual(status, 400);
    assert.ok(body.error.includes('Unknown field'));
  });

  test('PATCH requires a value', async () => {
    const { status } = await request(ctx.baseUrl, 'PATCH', `${planUrl()}/basic_plan`, {});
    assert.strictEqual(status, 400);
  });

  test('PATCH rejects a non-string value', async () => {
    const { status } = await request(ctx.baseUrl, 'PATCH', `${planUrl()}/basic_plan`, {
      value: 42,
    });
    assert.strictEqual(status, 400);
  });

  test('PATCH value null clears the field and its timestamp', async () => {
    const { status, body } = await request(ctx.baseUrl, 'PATCH', `${planUrl()}/basic_plan`, {
      value: null,
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.basic_plan, null);
    assert.strictEqual(body.basic_plan_updated_at, null);
    assert.strictEqual(body.final_plan, 'fp v2');
    assert.ok(body.final_plan_updated_at, 'other fields must keep their timestamps');
  });

  test('PATCH upserts a row when none exists yet', async () => {
    const fresh = await createProject(ctx.baseUrl, { name: 'Fresh plan' });
    await request(ctx.baseUrl, 'DELETE', `/projects/${fresh.id}/plan`);
    const { status, body } = await request(ctx.baseUrl, 'PATCH', `/projects/${fresh.id}/plan/basic_plan`, {
      value: 'first write',
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.basic_plan, 'first write');
    assert.ok(body.basic_plan_updated_at);
    assert.strictEqual(body.final_plan, null);
  });

  test('PUT supports the data_collector_tool_link field', async () => {
    const { status, body } = await request(ctx.baseUrl, 'PUT', planUrl(), {
      data_collector_tool_link: 'https://put-tool.example.com',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data_collector_tool_link, 'https://put-tool.example.com');
  });
});

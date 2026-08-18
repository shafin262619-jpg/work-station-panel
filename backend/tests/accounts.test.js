'use strict';

const { describe, before, after, test } = require('node:test');
const assert = require('node:assert');
const { startTestServer, request } = require('./helpers');

describe('Account API', () => {
  let ctx;

  before(async () => {
    ctx = await startTestServer();
  });

  after(async () => {
    await ctx.close();
  });

  test('POST /accounts creates monkey account with default status available', async () => {
    const { status, body } = await request(ctx.baseUrl, 'POST', '/accounts', {
      type: 'monkey',
      label: 'Monkey 1',
      login_link: 'https://chatgpt.com',
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.type, 'monkey');
    assert.strictEqual(body.label, 'Monkey 1');
    assert.strictEqual(body.status, 'available');
    assert.strictEqual(body.login_link, 'https://chatgpt.com');
  });

  test('POST /accounts creates claude account', async () => {
    const { status, body } = await request(ctx.baseUrl, 'POST', '/accounts', {
      type: 'claude',
      label: 'Claude 1',
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.type, 'claude');
  });

  test('POST /accounts validates type', async () => {
    const { status } = await request(ctx.baseUrl, 'POST', '/accounts', {
      type: 'gemini',
      label: 'Bad',
    });
    assert.strictEqual(status, 400);
  });

  test('POST /accounts validates status', async () => {
    const { status } = await request(ctx.baseUrl, 'POST', '/accounts', {
      type: 'monkey',
      label: 'Bad status',
      status: 'busy',
    });
    assert.strictEqual(status, 400);
  });

  test('POST /accounts requires label', async () => {
    const { status } = await request(ctx.baseUrl, 'POST', '/accounts', { type: 'monkey' });
    assert.strictEqual(status, 400);
  });

  test('GET /accounts lists accounts', async () => {
    const { status, body } = await request(ctx.baseUrl, 'GET', '/accounts');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data.length, 2);
  });

  test('GET /accounts/:id returns one account', async () => {
    const created = await request(ctx.baseUrl, 'POST', '/accounts', { type: 'monkey', label: 'Solo' });
    const { status, body } = await request(ctx.baseUrl, 'GET', `/accounts/${created.body.id}`);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.label, 'Solo');
  });

  test('GET /accounts/:id returns 404 for missing account', async () => {
    const { status } = await request(ctx.baseUrl, 'GET', '/accounts/99999');
    assert.strictEqual(status, 404);
  });

  test('PUT /accounts/:id updates status, note, last_used_*', async () => {
    const created = await request(ctx.baseUrl, 'POST', '/accounts', { type: 'monkey', label: 'Upd' });
    const { status, body } = await request(ctx.baseUrl, 'PUT', `/accounts/${created.body.id}`, {
      status: 'limit_reached',
      note: 'used today',
      last_used_project: 'Alpha',
      last_used_at: '2026-08-18T00:00:00.000Z',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.status, 'limit_reached');
    assert.strictEqual(body.note, 'used today');
    assert.strictEqual(body.last_used_project, 'Alpha');
    assert.strictEqual(body.last_used_at, '2026-08-18T00:00:00.000Z');
  });

  test('DELETE /accounts/:id removes an account', async () => {
    const created = await request(ctx.baseUrl, 'POST', '/accounts', { type: 'claude', label: 'Delete' });
    const { status } = await request(ctx.baseUrl, 'DELETE', `/accounts/${created.body.id}`);
    assert.strictEqual(status, 204);
    const getRes = await request(ctx.baseUrl, 'GET', `/accounts/${created.body.id}`);
    assert.strictEqual(getRes.status, 404);
  });
});

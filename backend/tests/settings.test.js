'use strict';

const { describe, before, after, test } = require('node:test');
const assert = require('node:assert');
const { startTestServer, request } = require('./helpers');

describe('Settings API (singleton)', () => {
  let ctx;

  before(async () => {
    ctx = await startTestServer();
  });

  after(async () => {
    await ctx.close();
  });

  test('GET /settings auto-creates the singleton with defaults', async () => {
    const { status, body } = await request(ctx.baseUrl, 'GET', '/settings');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.id, 1);
    assert.strictEqual(body.ai_helping_enabled, false);
    assert.strictEqual(body.has_gemini_api_key, false);
    assert.strictEqual(body.last_account_reset_date, null);
    assert.strictEqual(body.gemini_api_key, undefined, 'key must never be returned');
  });

  test('GET /settings always returns the same singleton row', async () => {
    const first = await request(ctx.baseUrl, 'GET', '/settings');
    const second = await request(ctx.baseUrl, 'GET', '/settings');
    assert.strictEqual(first.body.id, 1);
    assert.strictEqual(second.body.id, 1);
  });

  test('PUT /settings stores gemini_api_key but only returns has_gemini_api_key', async () => {
    const { status, body } = await request(ctx.baseUrl, 'PUT', '/settings', {
      gemini_api_key: 'secret-key-123',
      ai_helping_enabled: true,
      last_account_reset_date: '2026-08-18',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ai_helping_enabled, true);
    assert.strictEqual(body.has_gemini_api_key, true);
    assert.strictEqual(body.last_account_reset_date, '2026-08-18');
    assert.strictEqual(body.gemini_api_key, undefined, 'key must never be returned');
    assert.strictEqual(JSON.stringify(body).includes('secret-key-123'), false);
  });

  test('clearing the key sets has_gemini_api_key back to false', async () => {
    await request(ctx.baseUrl, 'PUT', '/settings', { gemini_api_key: 'temp' });
    const { body } = await request(ctx.baseUrl, 'PUT', '/settings', { gemini_api_key: null });
    assert.strictEqual(body.has_gemini_api_key, false);
  });

  test('POST /settings returns 409 once the singleton exists', async () => {
    const { status } = await request(ctx.baseUrl, 'POST', '/settings', {});
    assert.strictEqual(status, 409);
  });

  test('DELETE /settings resets the singleton; GET recreates defaults', async () => {
    const { status } = await request(ctx.baseUrl, 'DELETE', '/settings');
    assert.strictEqual(status, 204);
    const { body } = await request(ctx.baseUrl, 'GET', '/settings');
    assert.strictEqual(body.id, 1);
    assert.strictEqual(body.ai_helping_enabled, false);
    assert.strictEqual(body.has_gemini_api_key, false);
  });

  test('PUT /settings rejects non-boolean ai_helping_enabled', async () => {
    const { status } = await request(ctx.baseUrl, 'PUT', '/settings', {
      ai_helping_enabled: 'yes',
    });
    assert.strictEqual(status, 400);
  });
});

'use strict';

const { describe, before, after, test } = require('node:test');
const assert = require('node:assert');
const { startTestServer, request } = require('./helpers');

describe('Note API', () => {
  let ctx;

  before(async () => {
    ctx = await startTestServer();
  });

  after(async () => {
    await ctx.close();
  });

  test('POST /notes creates a note with pinned default false', async () => {
    const { status, body } = await request(ctx.baseUrl, 'POST', '/notes', {
      title: 'Setup guide',
      content: 'install node first',
      category: 'tutorial',
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.title, 'Setup guide');
    assert.strictEqual(body.category, 'tutorial');
    assert.strictEqual(body.pinned, false);
    assert.ok(body.created_at);
    assert.ok(body.updated_at);
  });

  test('POST /notes requires title', async () => {
    const { status } = await request(ctx.baseUrl, 'POST', '/notes', { content: 'x' });
    assert.strictEqual(status, 400);
  });

  test('GET /notes lists notes with pinned sorting first', async () => {
    await request(ctx.baseUrl, 'POST', '/notes', { title: 'Regular' });
    const pinned = await request(ctx.baseUrl, 'POST', '/notes', {
      title: 'Pinned note',
      pinned: true,
    });
    assert.strictEqual(pinned.status, 201);
    assert.strictEqual(pinned.body.pinned, true);

    const { status, body } = await request(ctx.baseUrl, 'GET', '/notes');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data.length, 3);
    assert.strictEqual(body.data[0].title, 'Pinned note');
  });

  test('GET /notes filters by category', async () => {
    const { body } = await request(ctx.baseUrl, 'GET', '/notes?category=tutorial');
    assert.strictEqual(body.data.length, 1);
    assert.strictEqual(body.data[0].category, 'tutorial');
  });

  test('GET /notes filters by pinned', async () => {
    const { body } = await request(ctx.baseUrl, 'GET', '/notes?pinned=true');
    assert.strictEqual(body.data.length, 1);
    assert.strictEqual(body.data[0].pinned, true);
  });

  test('GET /notes/:id returns one note', async () => {
    const created = await request(ctx.baseUrl, 'POST', '/notes', { title: 'Solo note' });
    const { status, body } = await request(ctx.baseUrl, 'GET', `/notes/${created.body.id}`);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.title, 'Solo note');
  });

  test('GET /notes/:id returns 404 for missing note', async () => {
    const { status } = await request(ctx.baseUrl, 'GET', '/notes/99999');
    assert.strictEqual(status, 404);
  });

  test('PUT /notes/:id updates fields and updated_at', async () => {
    const created = await request(ctx.baseUrl, 'POST', '/notes', { title: 'Before' });
    const before = await request(ctx.baseUrl, 'GET', `/notes/${created.body.id}`);
    const { status, body } = await request(ctx.baseUrl, 'PUT', `/notes/${created.body.id}`, {
      title: 'After',
      pinned: true,
      category: 'work',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.title, 'After');
    assert.strictEqual(body.category, 'work');
    assert.strictEqual(body.pinned, true);
    assert.ok(body.updated_at >= before.body.updated_at);
  });

  test('DELETE /notes/:id removes a note', async () => {
    const created = await request(ctx.baseUrl, 'POST', '/notes', { title: 'Delete me' });
    const { status } = await request(ctx.baseUrl, 'DELETE', `/notes/${created.body.id}`);
    assert.strictEqual(status, 204);
    const getRes = await request(ctx.baseUrl, 'GET', `/notes/${created.body.id}`);
    assert.strictEqual(getRes.status, 404);
  });
});

'use strict';

const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

async function startTestServer() {
  const db = createDb(':memory:');
  const app = createApp(db);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  return {
    db,
    app,
    server,
    baseUrl,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

async function request(baseUrl, method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }
  return { status: res.status, body: json };
}

async function createProject(baseUrl, overrides = {}) {
  const { status, body } = await request(baseUrl, 'POST', '/projects', {
    name: 'Test Project',
    github_link: 'https://github.com/shafin262619-jpg/demo',
    ...overrides,
  });
  if (status !== 201) throw new Error(`Failed to create project: ${JSON.stringify(body)}`);
  return body;
}

async function createAccount(baseUrl, overrides = {}) {
  const { status, body } = await request(baseUrl, 'POST', '/accounts', {
    type: 'monkey',
    label: 'Monkey 1',
    ...overrides,
  });
  if (status !== 201) throw new Error(`Failed to create account: ${JSON.stringify(body)}`);
  return body;
}

module.exports = { startTestServer, request, createProject, createAccount };

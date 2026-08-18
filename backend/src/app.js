'use strict';

const express = require('express');
const projectsRouter = require('./routes/projects');
const accountsRouter = require('./routes/accounts');
const settingsRouter = require('./routes/settings');
const notesRouter = require('./routes/notes');

function createApp(db, options = {}) {
  const app = express();
  app.use(express.json());

  app.use('/api/projects', projectsRouter(db));
  app.use('/api/accounts', accountsRouter(db, { getTodayKey: options.getTodayKey }));
  app.use('/api/settings', settingsRouter(db));
  app.use('/api/notes', notesRouter(db));

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    if (err && err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Payload too large' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };

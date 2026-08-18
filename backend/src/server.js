'use strict';

const path = require('path');
const { createDb } = require('./db');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'work-station-panel.db');

const db = createDb(DB_PATH);
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`Work Station Panel API listening on http://localhost:${PORT}`);
});

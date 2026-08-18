'use strict';

function now() {
  return new Date().toISOString();
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toBool(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

module.exports = { now, parseId, toBool };

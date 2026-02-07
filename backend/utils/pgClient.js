const { Client } = require('pg');

function requireDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  return connectionString;
}

function sslConfigFromEnv() {
  const sslEnabled = process.env.DB_SSL === 'true' || process.env.PGSSLMODE === 'require';
  return sslEnabled ? { rejectUnauthorized: false } : undefined;
}

function createClient(overrides = {}) {
  return new Client({
    connectionString: requireDatabaseUrl(),
    ssl: sslConfigFromEnv(),
    ...overrides,
  });
}

function parseDatabaseUrl() {
  return new URL(requireDatabaseUrl());
}

module.exports = {
  createClient,
  parseDatabaseUrl,
  sslConfigFromEnv,
};
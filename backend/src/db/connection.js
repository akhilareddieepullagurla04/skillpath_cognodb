// db/connection.js
//
// This file owns the single Neo4j driver instance for the whole app.
// CognoDB speaks the same Bolt protocol as Neo4j, so we use the official
// `neo4j-driver` package — no custom SDK needed.
//
// WHY A SINGLE SHARED DRIVER?
// The driver itself manages a connection pool internally. You should
// create ONE driver when the app starts and reuse it for every query,
// rather than creating a new driver per request (that would open a new
// pool every time and exhaust connections fast).

const neo4j = require('neo4j-driver');

// Credentials come from environment variables ONLY.
// Never hardcode the URI or password here, and never commit a .env file.
const { COGNODB_URI, COGNODB_USER, COGNODB_PASSWORD } = process.env;

if (!COGNODB_URI || !COGNODB_USER || !COGNODB_PASSWORD) {
  // Fail loudly and early if config is missing, instead of letting
  // every route silently 500 later with a confusing driver error.
  console.error(
    'Missing CognoDB connection env vars. ' +
    'Please set COGNODB_URI, COGNODB_USER, COGNODB_PASSWORD (see .env.example).'
  );
}

const driver = neo4j.driver(
  COGNODB_URI,
  neo4j.auth.basic(COGNODB_USER, COGNODB_PASSWORD),
  {
    // Sensible pool defaults for a small free-tier instance.
    maxConnectionPoolSize: 20,
    connectionAcquisitionTimeout: 10000, // 10s
  }
);

/**
 * Verifies we can actually reach the database.
 * Call this once at startup so the app fails fast with a clear message
 * instead of hanging on the first real request.
 */
async function verifyConnection() {
  await driver.verifyConnectivity();
}

/**
 * Runs a single Cypher query inside a managed session and returns the
 * raw Neo4j result records.
 *
 * @param {string} cypher - the Cypher query text, with $param placeholders
 * @param {object} params - parameters object, NEVER string-concatenated into cypher
 */
async function runQuery(cypher, params = {}) {
  const session = driver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    // Always close the session, even if the query throws.
    await session.close();
  }
}

async function closeDriver() {
  await driver.close();
}

module.exports = { driver, verifyConnection, runQuery, closeDriver };

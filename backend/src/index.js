// index.js — app entry point
//
// Wires together middleware, routes, and starts the HTTP server.
// Also verifies the DB connection at startup so a misconfigured
// environment fails immediately with a clear message, rather than
// every request timing out mysteriously.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { verifyConnection } = require('./db/connection');
const entityRoutes = require('./routes/entities');
const matchRoutes = require('./routes/match');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Simple health check — useful for the hosting platform's uptime checks
// and for confirming the API is up before wiring the frontend to it.
app.get('/api/health', async (req, res) => {
  try {
    await verifyConnection();
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    // Graceful degradation: the API process is alive, it's just the DB
    // that's unreachable. Report that distinction instead of crashing.
    res.status(503).json({ status: 'degraded', db: 'unreachable', error: err.message });
  }
});

app.use('/api', entityRoutes);
app.use('/api', matchRoutes);

// Centralized error handler. Every route calls next(err) on failure,
// so all error responses (including DB-unreachable errors) end up here
// with a consistent shape instead of leaking stack traces to the client.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Something went wrong talking to the database.',
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

async function start() {
  try {
    await verifyConnection();
    console.log('CognoDB connection verified.');
  } catch (err) {
    console.error('WARNING: could not connect to CognoDB at startup:', err.message);
    console.error('The server will still start, but requests will fail until the DB is reachable.');
  }

  app.listen(PORT, () => {
    console.log(`SkillPath API listening on port ${PORT}`);
  });
}

start();

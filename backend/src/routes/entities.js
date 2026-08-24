// routes/entities.js
//
// Simple "list everything" and "get one" endpoints for each node type.
// These power the dropdowns/search boxes in the UI. Nothing fancy here —
// the interesting graph logic lives in routes/match.js.

const express = require('express');
const router = express.Router();
const { runQuery } = require('../db/connection');

// GET /api/people  -> [{ name }]
router.get('/people', async (req, res, next) => {
  try {
    const records = await runQuery(
      'MATCH (p:Person) RETURN p.name AS name ORDER BY p.name'
    );
    res.json(records.map((r) => ({ name: r.get('name') })));
  } catch (err) {
    next(err);
  }
});

// GET /api/people/:name -> { name, skills: [{ name, level, category }] }
router.get('/people/:name', async (req, res, next) => {
  try {
    const records = await runQuery(
      `MATCH (p:Person {name: $name})-[hs:HAS_SKILL]->(s:Skill)
       RETURN s.name AS name, s.category AS category, hs.level AS level
       ORDER BY hs.level DESC`,
      { name: req.params.name }
    );
    if (records.length === 0) {
      // Distinguish "person exists but has no skills" from "not found"
      // would need an extra query; for this app we keep it simple and
      // treat an empty skill list as a 404, since every seeded person
      // has at least one skill.
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json({
      name: req.params.name,
      skills: records.map((r) => ({
        name: r.get('name'),
        category: r.get('category'),
        level: r.get('level'),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs -> [{ title, company, seniority }]
router.get('/jobs', async (req, res, next) => {
  try {
    const records = await runQuery(
      `MATCH (j:Job) RETURN j.title AS title, j.company AS company, j.seniority AS seniority
       ORDER BY j.title`
    );
    res.json(
      records.map((r) => ({
        title: r.get('title'),
        company: r.get('company'),
        seniority: r.get('seniority'),
      }))
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/skills -> [{ name, category }]
router.get('/skills', async (req, res, next) => {
  try {
    const records = await runQuery(
      'MATCH (s:Skill) RETURN s.name AS name, s.category AS category ORDER BY s.category, s.name'
    );
    res.json(
      records.map((r) => ({ name: r.get('name'), category: r.get('category') }))
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/courses -> [{ title, provider, hours }]
router.get('/courses', async (req, res, next) => {
  try {
    const records = await runQuery(
      'MATCH (c:Course) RETURN c.title AS title, c.provider AS provider, c.hours AS hours ORDER BY c.title'
    );
    res.json(
      records.map((r) => ({
        title: r.get('title'),
        provider: r.get('provider'),
        hours: r.get('hours'),
      }))
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;

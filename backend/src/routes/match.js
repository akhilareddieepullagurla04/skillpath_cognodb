// routes/match.js
//
// This file holds the three queries the assignment asks for explicitly:
//   1. A multi-hop traversal (2+ hops)
//   2. A query that's awkward in SQL (variable-length path)
//   3. A useful aggregate/recommendation query
//
// All queries use parameters ($name, $jobTitle, ...) — never string
// concatenation — so user input can never be injected into Cypher.

const express = require('express');
const router = express.Router();
const { runQuery } = require('../db/connection');

/**
 * QUERY 1 — Multi-hop traversal
 * GET /api/match/:personName
 *
 * "Which jobs is this person already qualified for, and which jobs are
 * they ONE OR TWO skills away from?"
 *
 * Hops: Person -> HAS_SKILL -> Skill <- REQUIRES <- Job   (2 hops)
 * We walk this pattern for every job and use Cypher's EXISTS {} subquery
 * to check that every REQUIRES edge on a job is satisfied by a HAS_SKILL
 * edge at or above the required level.
 */
router.get('/match/:personName', async (req, res, next) => {
  try {
    const { personName } = req.params;

    // Jobs where every required skill is met at the required level.
    const qualified = await runQuery(
      `MATCH (p:Person {name: $name})
       MATCH (j:Job)
       WHERE NOT EXISTS {
         MATCH (j)-[r:REQUIRES]->(s:Skill)
         WHERE NOT EXISTS {
           MATCH (p)-[hs:HAS_SKILL]->(s)
           WHERE hs.level >= r.min_level
         }
       }
       RETURN j.title AS title, j.company AS company, j.seniority AS seniority
       ORDER BY j.title`,
      { name: personName }
    );

    // Jobs missing 1-2 skills, with the missing skill names attached,
    // so the UI can show "you need: TypeScript, System Design".
    const almost = await runQuery(
      `MATCH (p:Person {name: $name})
       MATCH (j:Job)-[r:REQUIRES]->(s:Skill)
       WHERE NOT EXISTS {
         MATCH (p)-[hs:HAS_SKILL]->(s)
         WHERE hs.level >= r.min_level
       }
       WITH j, collect(s.name) AS missingSkills
       WHERE size(missingSkills) > 0 AND size(missingSkills) <= 2
       RETURN j.title AS title, j.company AS company, j.seniority AS seniority, missingSkills
       ORDER BY size(missingSkills), j.title`,
      { name: personName }
    );

    res.json({
      person: personName,
      qualifiedJobs: qualified.map((r) => ({
        title: r.get('title'),
        company: r.get('company'),
        seniority: r.get('seniority'),
      })),
      almostQualifiedJobs: almost.map((r) => ({
        title: r.get('title'),
        company: r.get('company'),
        seniority: r.get('seniority'),
        missingSkills: r.get('missingSkills'),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * QUERY 2 — Variable-length shortest path (the "awkward in SQL" query)
 * GET /api/path/:personName/:jobTitle
 *
 * For each skill the target job requires that the person doesn't have,
 * find the shortest prerequisite chain from any skill the person already
 * knows to that missing skill, e.g. JavaScript -> React (1 hop) or
 * SQL -> Cypher -> Graph Modeling (2 hops).
 *
 * In a relational schema, "shortest chain through a self-referencing
 * prerequisite table of unknown depth" needs a recursive CTE with a
 * visited-set to avoid cycles. In Cypher it's a single shortestPath()
 * pattern with a bounded variable-length relationship.
 */
router.get('/path/:personName/:jobTitle', async (req, res, next) => {
  try {
    const { personName, jobTitle } = req.params;

    const records = await runQuery(
      `MATCH (p:Person {name: $name})
       MATCH (j:Job {title: $jobTitle})-[:REQUIRES]->(needed:Skill)
       WHERE NOT EXISTS {
         MATCH (p)-[hs:HAS_SKILL]->(needed)
       }
       WITH p, needed
       OPTIONAL MATCH path = shortestPath(
         (known:Skill)-[:PREREQUISITE_OF*1..5]->(needed)
       )
       WHERE (p)-[:HAS_SKILL]->(known)
       RETURN needed.name AS targetSkill,
              CASE WHEN path IS NULL THEN null ELSE [n IN nodes(path) | n.name] END AS learningPath
       ORDER BY targetSkill`,
      { name: personName, jobTitle }
    );

    res.json({
      person: personName,
      job: jobTitle,
      skillPaths: records.map((r) => ({
        targetSkill: r.get('targetSkill'),
        // null means: no prerequisite chain connects a known skill to
        // this one — the person would need to start it from scratch.
        learningPath: r.get('learningPath'),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * QUERY 3 — Best next course (recommendation / aggregate query)
 * GET /api/best-course/:personName/:jobTitle
 *
 * Of all courses, which single course covers the most of the skills
 * this person is missing for this specific job? Ranks courses by how
 * many gap skills they close.
 */
router.get('/best-course/:personName/:jobTitle', async (req, res, next) => {
  try {
    const { personName, jobTitle } = req.params;

    const records = await runQuery(
      `MATCH (p:Person {name: $name})
       MATCH (j:Job {title: $jobTitle})-[r:REQUIRES]->(s:Skill)
       WHERE NOT EXISTS {
         MATCH (p)-[hs:HAS_SKILL]->(s)
         WHERE hs.level >= r.min_level
       }
       WITH collect(s.name) AS missing
       MATCH (c:Course)-[:TEACHES]->(s:Skill)
       WHERE s.name IN missing
       WITH c, collect(s.name) AS covers, missing
       RETURN c.title AS course, c.provider AS provider, c.hours AS hours,
              covers, size(covers) AS coverage, size(missing) AS totalGap
       ORDER BY coverage DESC
       LIMIT 5`,
      { name: personName, jobTitle }
    );

    res.json({
      person: personName,
      job: jobTitle,
      recommendations: records.map((r) => ({
        course: r.get('course'),
        provider: r.get('provider'),
        hours: r.get('hours'),
        coversSkills: r.get('covers'),
        coverage: r.get('coverage'),
        totalGap: r.get('totalGap'),
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

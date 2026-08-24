// scripts/seed.js
//
// Populates CognoDB with a small but realistic dataset:
//   Skills, Courses, Jobs, People, and the relationships between them.
//
// WHY MERGE INSTEAD OF CREATE?
// `MERGE` is Cypher's "create if not exists" — it matches on the given
// key and only creates a new node/relationship if no match is found.
// That makes this script IDEMPOTENT: you can run it multiple times
// (e.g. after a schema tweak) without duplicating data.
//
// Run with:  npm run seed   (defined in package.json)

require('dotenv').config();
const { runQuery, verifyConnection, closeDriver } = require('../db/connection');

// ---- Skills -----------------------------------------------------------
// category is just a property for grouping/filtering in the UI.
const skills = [
  { name: 'HTML',        category: 'Frontend' },
  { name: 'CSS',         category: 'Frontend' },
  { name: 'JavaScript',  category: 'Frontend' },
  { name: 'React',       category: 'Frontend' },
  { name: 'TypeScript',  category: 'Frontend' },
  { name: 'Node.js',     category: 'Backend' },
  { name: 'Express',     category: 'Backend' },
  { name: 'REST APIs',   category: 'Backend' },
  { name: 'SQL',         category: 'Data' },
  { name: 'Cypher',      category: 'Data' },
  { name: 'Graph Modeling', category: 'Data' },
  { name: 'Python',      category: 'Backend' },
  { name: 'Data Analysis', category: 'Data' },
  { name: 'Machine Learning', category: 'Data' },
  { name: 'Docker',      category: 'DevOps' },
  { name: 'CI/CD',       category: 'DevOps' },
  { name: 'AWS',         category: 'DevOps' },
  { name: 'Git',         category: 'Tools' },
  { name: 'Testing',     category: 'Engineering' },
  { name: 'System Design', category: 'Engineering' },
];

// PREREQUISITE_OF edges model "you should learn A before B".
// This is what makes the shortest-path query interesting later.
const prerequisites = [
  ['HTML', 'CSS'],
  ['CSS', 'JavaScript'],
  ['JavaScript', 'React'],
  ['JavaScript', 'TypeScript'],
  ['JavaScript', 'Node.js'],
  ['Node.js', 'Express'],
  ['Express', 'REST APIs'],
  ['SQL', 'Cypher'],
  ['Cypher', 'Graph Modeling'],
  ['Python', 'Data Analysis'],
  ['Data Analysis', 'Machine Learning'],
  ['Git', 'CI/CD'],
  ['Docker', 'CI/CD'],
  ['CI/CD', 'AWS'],
  ['REST APIs', 'System Design'],
];

// ---- Courses ------------------------------------------------------------
// Each course TEACHES one or more skills, up to a given proficiency level.
const courses = [
  { title: 'Web Foundations',        provider: 'Coursera', hours: 20,
    teaches: [['HTML', 3], ['CSS', 3]] },
  { title: 'Modern JavaScript',      provider: 'Udemy', hours: 30,
    teaches: [['JavaScript', 4]] },
  { title: 'React from Scratch',     provider: 'Frontend Masters', hours: 25,
    teaches: [['React', 4], ['TypeScript', 2]] },
  { title: 'Node & Express APIs',    provider: 'Udemy', hours: 22,
    teaches: [['Node.js', 4], ['Express', 4], ['REST APIs', 3]] },
  { title: 'Graph Databases 101',    provider: 'Neo4j GraphAcademy', hours: 12,
    teaches: [['Cypher', 4], ['Graph Modeling', 3]] },
  { title: 'SQL for Everyone',       provider: 'Khan Academy', hours: 15,
    teaches: [['SQL', 4]] },
  { title: 'Python for Data',        provider: 'Coursera', hours: 28,
    teaches: [['Python', 4], ['Data Analysis', 3]] },
  { title: 'Applied Machine Learning', provider: 'edX', hours: 40,
    teaches: [['Machine Learning', 3]] },
  { title: 'Docker & Containers',    provider: 'Udemy', hours: 14,
    teaches: [['Docker', 4]] },
  { title: 'CI/CD Pipelines',        provider: 'Pluralsight', hours: 10,
    teaches: [['CI/CD', 3], ['Git', 3]] },
  { title: 'AWS Cloud Practitioner', provider: 'AWS Training', hours: 18,
    teaches: [['AWS', 3]] },
  { title: 'Software Testing Basics', provider: 'Udemy', hours: 12,
    teaches: [['Testing', 3]] },
  { title: 'System Design Interview Prep', provider: 'Educative', hours: 20,
    teaches: [['System Design', 4]] },
];

// ---- Jobs -----------------------------------------------------------
// Each job REQUIRES certain skills at a minimum level.
const jobs = [
  { title: 'Junior Frontend Developer', company: 'Nimbus Labs', seniority: 'Junior',
    requires: [['HTML', 2], ['CSS', 2], ['JavaScript', 3]] },
  { title: 'Frontend Engineer', company: 'Orbital', seniority: 'Mid',
    requires: [['JavaScript', 4], ['React', 4], ['TypeScript', 2]] },
  { title: 'Backend Engineer', company: 'Orbital', seniority: 'Mid',
    requires: [['Node.js', 4], ['Express', 3], ['REST APIs', 3], ['SQL', 3]] },
  { title: 'Full-Stack Developer', company: 'Wexa AI', seniority: 'Mid',
    requires: [['JavaScript', 4], ['React', 3], ['Node.js', 3], ['REST APIs', 3]] },
  { title: 'Graph Database Engineer', company: 'Cognita', seniority: 'Mid',
    requires: [['Cypher', 4], ['Graph Modeling', 4], ['REST APIs', 2]] },
  { title: 'Data Analyst', company: 'Fern & Co', seniority: 'Junior',
    requires: [['SQL', 3], ['Python', 2], ['Data Analysis', 3]] },
  { title: 'Machine Learning Engineer', company: 'Cognita', seniority: 'Senior',
    requires: [['Python', 4], ['Data Analysis', 4], ['Machine Learning', 4]] },
  { title: 'DevOps Engineer', company: 'Nimbus Labs', seniority: 'Mid',
    requires: [['Docker', 4], ['CI/CD', 4], ['AWS', 3]] },
  { title: 'Senior Full-Stack Engineer', company: 'Cognita', seniority: 'Senior',
    requires: [['React', 4], ['Node.js', 4], ['System Design', 3], ['Testing', 3]] },
  { title: 'Cloud Platform Engineer', company: 'Orbital', seniority: 'Senior',
    requires: [['AWS', 4], ['Docker', 3], ['CI/CD', 3], ['System Design', 3]] },
];

// ---- People -----------------------------------------------------------
// Each person HAS_SKILL at some level (1-5). Deliberately a mix of
// "close to several jobs" and "needs a lot more training" profiles.
const people = [
  { name: 'Asha Rao', skills: [['HTML', 3], ['CSS', 3], ['JavaScript', 3], ['Git', 3]] },
  { name: 'Vikram Shah', skills: [['JavaScript', 4], ['React', 3], ['CSS', 3], ['Git', 4]] },
  { name: 'Meera Nair', skills: [['SQL', 3], ['Python', 3], ['Data Analysis', 2]] },
  { name: 'Rohan Gupta', skills: [['Node.js', 3], ['Express', 3], ['JavaScript', 4], ['REST APIs', 2]] },
  { name: 'Ishaan Patel', skills: [['Cypher', 2], ['SQL', 4], ['Graph Modeling', 1]] },
  { name: 'Diya Kapoor', skills: [['Docker', 3], ['Git', 4], ['CI/CD', 2]] },
  { name: 'Kabir Mehta', skills: [['Python', 4], ['Data Analysis', 4], ['Machine Learning', 2]] },
  { name: 'Neha Joshi', skills: [['React', 4], ['TypeScript', 3], ['JavaScript', 4], ['Testing', 2]] },
  { name: 'Arjun Verma', skills: [['AWS', 2], ['Docker', 2], ['Git', 3]] },
  { name: 'Sara Khan', skills: [['HTML', 4], ['CSS', 4], ['JavaScript', 2]] },
];

async function seed() {
  await verifyConnection();
  console.log('Connected to CognoDB. Seeding...');

  // Clear existing data first so re-runs give a clean, predictable graph.
  // (Fine for a small free-tier demo dataset; wouldn't do this in prod.)
  await runQuery('MATCH (n) DETACH DELETE n');

  // Constraints ensure fast MERGE lookups and enforce uniqueness by name.
  await runQuery('CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE');
  await runQuery('CREATE CONSTRAINT course_title IF NOT EXISTS FOR (c:Course) REQUIRE c.title IS UNIQUE');
  await runQuery('CREATE CONSTRAINT job_title IF NOT EXISTS FOR (j:Job) REQUIRE j.title IS UNIQUE');
  await runQuery('CREATE CONSTRAINT person_name IF NOT EXISTS FOR (p:Person) REQUIRE p.name IS UNIQUE');

  // Skills
  for (const s of skills) {
    await runQuery(
      'MERGE (s:Skill {name: $name}) SET s.category = $category',
      s
    );
  }
  console.log(`Seeded ${skills.length} skills`);

  // Prerequisites
  for (const [from, to] of prerequisites) {
    await runQuery(
      `MATCH (a:Skill {name: $from}), (b:Skill {name: $to})
       MERGE (a)-[:PREREQUISITE_OF]->(b)`,
      { from, to }
    );
  }
  console.log(`Seeded ${prerequisites.length} prerequisite edges`);

  // Courses + TEACHES
  for (const c of courses) {
    await runQuery(
      'MERGE (c:Course {title: $title}) SET c.provider = $provider, c.hours = $hours',
      { title: c.title, provider: c.provider, hours: c.hours }
    );
    for (const [skillName, level] of c.teaches) {
      await runQuery(
        `MATCH (c:Course {title: $title}), (s:Skill {name: $skillName})
         MERGE (c)-[r:TEACHES]->(s)
         SET r.level_gained = $level`,
        { title: c.title, skillName, level }
      );
    }
  }
  console.log(`Seeded ${courses.length} courses`);

  // Jobs + REQUIRES
  for (const j of jobs) {
    await runQuery(
      `MERGE (j:Job {title: $title, company: $company})
       SET j.seniority = $seniority`,
      { title: j.title, company: j.company, seniority: j.seniority }
    );
    for (const [skillName, minLevel] of j.requires) {
      await runQuery(
        `MATCH (j:Job {title: $title, company: $company}), (s:Skill {name: $skillName})
         MERGE (j)-[r:REQUIRES]->(s)
         SET r.min_level = $minLevel`,
        { title: j.title, company: j.company, skillName, minLevel }
      );
    }
  }
  console.log(`Seeded ${jobs.length} jobs`);

  // People + HAS_SKILL
  for (const p of people) {
    await runQuery('MERGE (p:Person {name: $name})', { name: p.name });
    for (const [skillName, level] of p.skills) {
      await runQuery(
        `MATCH (p:Person {name: $name}), (s:Skill {name: $skillName})
         MERGE (p)-[r:HAS_SKILL]->(s)
         SET r.level = $level`,
        { name: p.name, skillName, level }
      );
    }
  }
  console.log(`Seeded ${people.length} people`);

  console.log('Seeding complete.');
  await closeDriver();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

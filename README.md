# SkillPath — Career & Skill-Gap Navigator

SkillPath answers a question a job seeker actually asks: *"Given the skills
I have right now, which jobs can I get, which are close, and what's the
fastest way to close the gap?"*

Built on **CognoDB** (a managed graph database speaking openCypher over
Bolt), with a Node/Express API and a React frontend.

---

## Why a graph database?

The core relationships here — *skills unlock jobs*, *courses teach skills*,
*skills build on other skills* — are naturally a graph, not a set of rows.

- **Multi-hop questions are the whole point of the app.** "Which jobs can
  this person get if they learn one more skill?" is a 2-hop traversal
  (Person → Skill ← Job). In SQL this needs a join between a
  `person_skills` table and a `job_requirements` table, grouped and
  compared per job — doable, but it stops scaling the moment you add a
  third hop (e.g. "...or a course that teaches that skill").
- **Skill prerequisite chains are a variable-depth graph problem.** Finding
  the shortest path from a skill someone knows to a skill they need (e.g.
  `SQL → Cypher → Graph Modeling`) requires walking a self-referencing
  relationship an *unknown number of times*. In a relational schema this is
  a recursive CTE with manual cycle-detection. In Cypher it's one line:
  `shortestPath((a)-[:PREREQUISITE_OF*1..5]->(b))`.
- **The schema will keep growing sideways.** Add "mentors," "certifications,"
  "companies with similar tech stacks" — each is just a new node label and
  relationship type, no new join tables or migrations to redesign existing
  queries around.
- **The queries read like the question you're asking.** `(Person)-[:HAS_SKILL]->(Skill)<-[:REQUIRES]-(Job)`
  *is* the sentence "a person has skills that jobs require" — that
  readability is worth a lot for something reviewers need to audit.

A relational database would still *work* here — it's not an impossible
fit — but every interesting query (multi-hop matches, variable-length skill
chains, "which single course covers the most gaps") gets meaningfully more
code and less clarity as a set of joined tables.

---

## Data model

```
                 PREREQUISITE_OF
        ┌────────────────────────────┐
        │                            ▼
   (:Skill)◄──HAS_SKILL──(:Person)   (:Skill)
        ▲                                ▲
        │                                │
     REQUIRES                        TEACHES
        │                                │
     (:Job)                         (:Course)
```

**Nodes**
| Label | Properties |
|---|---|
| `Person` | `name` |
| `Skill` | `name`, `category` |
| `Job` | `title`, `company`, `seniority` |
| `Course` | `title`, `provider`, `hours` |

**Relationships**
| Relationship | Direction | Properties | Meaning |
|---|---|---|---|
| `HAS_SKILL` | `Person → Skill` | `level` (1-5) | Person's proficiency |
| `REQUIRES` | `Job → Skill` | `min_level` | Minimum proficiency the job needs |
| `TEACHES` | `Course → Skill` | `level_gained` | Proficiency a course gets you to |
| `PREREQUISITE_OF` | `Skill → Skill` | — | "Learn the source before the target" |

---

## The three core queries

All three live in [`backend/src/routes/match.js`](backend/src/routes/match.js),
fully commented, and are called via the official `neo4j-driver` with
parameters — never string-concatenated Cypher.

### 1. Multi-hop traversal — "what can this person get?"
`GET /api/match/:personName`

Walks `Person -[:HAS_SKILL]-> Skill <-[:REQUIRES]- Job` for every job, using
nested `EXISTS {}` subqueries to check that *every* required skill is met
at or above its minimum level. A second query finds jobs missing exactly
1–2 skills, for the "almost qualified" list.

### 2. Variable-length shortest path — the SQL-awkward query
`GET /api/path/:personName/:jobTitle`

For each skill the target job needs that the person doesn't have, finds the
shortest `PREREQUISITE_OF` chain from a skill they *do* know:

```cypher
MATCH path = shortestPath(
  (known:Skill)-[:PREREQUISITE_OF*1..5]->(needed:Skill)
)
```

This is the query that's genuinely painful in SQL — a self-referencing
table with unknown depth needs a recursive CTE plus manual handling to
avoid infinite loops on cycles. `shortestPath()` with a bounded
variable-length relationship does it in one line.

### 3. Best next course — aggregate recommendation
`GET /api/best-course/:personName/:jobTitle`

Finds every course that teaches at least one of the person's missing
skills for a job, then ranks courses by how many gap skills they cover —
so the UI can recommend the single most efficient next course, not just
list options.

---

## Project structure

```
skillpath/
├── backend/
│   ├── src/
│   │   ├── db/connection.js      # Neo4j driver setup, env-based config
│   │   ├── routes/entities.js    # list/detail endpoints (people, jobs, skills, courses)
│   │   ├── routes/match.js       # the three core graph queries
│   │   ├── scripts/seed.js       # idempotent seed data loader
│   │   └── index.js              # Express app, health check, error handling
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/           # JobMatches, SkillTrail, CourseRecommendations
    │   ├── api.js                # fetch wrapper
    │   ├── App.jsx
    │   └── styles.css
    ├── .env.example
    └── package.json
```

---

## Setup & run

### 1. Create your CognoDB instance
1. Sign up at [console.cognodb.com/signup](https://console.cognodb.com/signup) (free, no card).
2. Create a free `c0` instance, pick a region.
3. Copy the `bolt+s://<instance-id>.databases.cognodb.cloud` URI and the
   generated password for user `cognodb` — **the password is shown once**.

### 2. Backend
```bash
cd backend
cp .env.example .env       # fill in COGNODB_URI / COGNODB_PASSWORD
npm install
npm run seed                # loads sample skills, jobs, courses, people
npm run dev                  # starts on http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env         # leave VITE_API_URL empty for local dev
npm install
npm run dev                  # starts on http://localhost:5173
```

Open `http://localhost:5173`, pick a person and a target job.

---

## Deployment

- **Backend** → Render / Railway / Fly.io free tier. Set `COGNODB_URI`,
  `COGNODB_USER`, `COGNODB_PASSWORD` as environment variables in the
  platform's dashboard — never in the repo.
- **Frontend** → Vercel / Netlify. Set `VITE_API_URL` to the deployed
  backend's URL.
- Run `npm run seed` once against the deployed database (can be run
  locally against the same CognoDB instance — it's the same URI either way).

**Demo link:** _add after deploying_
**Screen recording:** _add before submitting_

---

## Error handling

- The API has a `/api/health` endpoint that checks DB connectivity
  separately from "the server process is up."
- If CognoDB is unreachable, the backend logs a clear warning at startup
  but still starts (instead of crashing), and every route returns a
  structured `503`/`500` instead of a raw stack trace.
- The frontend surfaces this as a clear "can't reach the database" state
  instead of a blank screen or console-only error.

---

## Screenshots

_Add screenshots of the app here before submitting: the job-matches panel,
the skill trail visualization, and the course recommendations panel._

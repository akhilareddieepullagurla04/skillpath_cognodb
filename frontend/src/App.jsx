import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import JobMatches from './components/JobMatches.jsx';
import SkillTrail from './components/SkillTrail.jsx';
import CourseRecommendations from './components/CourseRecommendations.jsx';

export default function App() {
  // ---- Health check (shows the "DB unreachable" graceful state) ----
  const [health, setHealth] = useState({ status: 'loading' });

  // ---- Dropdown data ----
  const [people, setPeople] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [selectedJob, setSelectedJob] = useState('');

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth({ status: 'degraded', db: 'unreachable' }));
  }, []);

  useEffect(() => {
    // Only try to load dropdown data if the DB is actually reachable.
    if (health.status === 'loading') return;
    if (health.db !== 'connected') return;

    Promise.all([api.people(), api.jobs()])
      .then(([peopleList, jobList]) => {
        setPeople(peopleList);
        setJobs(jobList);
        if (peopleList.length > 0) setSelectedPerson(peopleList[0].name);
        if (jobList.length > 0) setSelectedJob(jobList[0].title);
      })
      .catch(() => {
        // If this fails after health said "connected", something else
        // is wrong (e.g. empty DB / not seeded). The panels below will
        // show their own empty states.
      });
  }, [health]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-eyebrow">SkillPath · Career Route Finder</div>
        <h1 className="app-title">Find your route to the job you want</h1>
        <p className="app-subtitle">
          Pick a person to see which jobs they already qualify for, which are
          one or two skills away, and the shortest learning path to close
          the gap — powered by graph traversal over a CognoDB instance.
        </p>
        <HealthPill health={health} />
      </header>

      {health.status !== 'loading' && health.db !== 'connected' ? (
        <div className="error-state">
          <strong>Can't reach the database right now.</strong>
          The API is running, but CognoDB didn't respond. Check that your
          CognoDB instance is awake and that COGNODB_URI / COGNODB_PASSWORD
          are set correctly, then reload this page.
        </div>
      ) : (
        <>
          <div className="controls-row">
            <div className="field">
              <label htmlFor="person-select">Person</label>
              <select
                id="person-select"
                value={selectedPerson}
                onChange={(e) => setSelectedPerson(e.target.value)}
                disabled={people.length === 0}
              >
                {people.length === 0 && <option>Loading people…</option>}
                {people.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="job-select">Target job (for the trail + courses)</label>
              <select
                id="job-select"
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                disabled={jobs.length === 0}
              >
                {jobs.length === 0 && <option>Loading jobs…</option>}
                {jobs.map((j) => (
                  <option key={j.title} value={j.title}>
                    {j.title} · {j.company}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedPerson && <JobMatches personName={selectedPerson} />}

          {selectedPerson && selectedJob && (
            <>
              <SkillTrail personName={selectedPerson} jobTitle={selectedJob} />
              <CourseRecommendations personName={selectedPerson} jobTitle={selectedJob} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function HealthPill({ health }) {
  if (health.status === 'loading') {
    return <div className="health-pill loading"><span className="health-dot" />checking connection…</div>;
  }
  if (health.db === 'connected') {
    return <div className="health-pill ok"><span className="health-dot" />CognoDB connected</div>;
  }
  return <div className="health-pill bad"><span className="health-dot" />database unreachable</div>;
}

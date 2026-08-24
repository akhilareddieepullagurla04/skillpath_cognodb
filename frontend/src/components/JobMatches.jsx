import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

// Displays the result of the multi-hop "which jobs can this person get"
// query: fully qualified jobs, plus jobs they're 1-2 skills away from.
export default function JobMatches({ personName }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .match(personName)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [personName]);

  return (
    <section className="panel">
      <h3 className="panel-title">Job matches for {personName}</h3>
      <p className="panel-hint">
        Fully qualified jobs, plus jobs within one or two missing skills.
      </p>

      {loading && <div className="loading-state">Walking the graph…</div>}
      {error && (
        <div className="error-state">
          <strong>Couldn't load matches.</strong>
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <JobList
            title="Qualified now"
            jobs={data.qualifiedJobs}
            variant="qualified"
            emptyText={`${personName} isn't fully qualified for any seeded job yet — check the "almost" list below.`}
          />
          <div style={{ height: 18 }} />
          <JobList
            title="One or two skills away"
            jobs={data.almostQualifiedJobs}
            variant="almost"
            emptyText="No near-miss jobs found."
          />
        </>
      )}
    </section>
  );
}

function JobList({ title, jobs, variant, emptyText }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-500)', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {title} ({jobs.length})
      </div>
      {jobs.length === 0 ? (
        <div className="empty-state">{emptyText}</div>
      ) : (
        <div className="job-grid">
          {jobs.map((job) => (
            <div key={`${job.title}-${job.company}`} className={`job-card ${variant}`}>
              <div className="job-info">
                <h4>{job.title}</h4>
                <div className="company">{job.company} · {job.seniority}</div>
                {job.missingSkills && (
                  <div className="missing-skills">
                    {job.missingSkills.map((s) => (
                      <span key={s} className="skill-chip">{s}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className={`badge ${variant}`}>
                {variant === 'qualified' ? 'qualified' : 'close'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

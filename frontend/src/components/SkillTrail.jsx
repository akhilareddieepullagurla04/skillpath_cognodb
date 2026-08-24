import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

// The signature visual of the app: renders the shortest-path Cypher
// query result as an actual trail of waypoints, one row per missing
// skill the target job requires.
export default function SkillTrail({ personName, jobTitle }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .path(personName, jobTitle)
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
  }, [personName, jobTitle]);

  return (
    <section className="panel">
      <h3 className="panel-title">Route to: {jobTitle}</h3>
      <p className="panel-hint">
        Shortest prerequisite chain from a skill {personName} already has to
        each missing skill this job requires.
      </p>

      {loading && <div className="loading-state">Tracing the trail…</div>}
      {error && (
        <div className="error-state">
          <strong>Couldn't compute the route.</strong>
          {error}
        </div>
      )}

      {!loading && !error && data && (
        data.skillPaths.length === 0 ? (
          <div className="empty-state">
            {personName} already has every skill this job requires. No gaps to route.
          </div>
        ) : (
          data.skillPaths.map((sp) => (
            <div key={sp.targetSkill}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-500)', marginBottom: 8 }}>
                → {sp.targetSkill}
              </div>
              {sp.learningPath ? (
                <div className="trail">
                  <div className="trail-row">
                    {sp.learningPath.map((skillName, idx) => {
                      const isLast = idx === sp.learningPath.length - 1;
                      return (
                        <React.Fragment key={skillName}>
                          <div className={`trail-node ${isLast ? 'target' : ''}`}>
                            <div className="trail-marker" />
                            <div className="trail-label">{skillName}</div>
                          </div>
                          {!isLast && <div className="trail-link" />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="trail-no-path">
                  No known prerequisite chain — this skill would need to be started from scratch.
                </div>
              )}
            </div>
          ))
        )
      )}
    </section>
  );
}

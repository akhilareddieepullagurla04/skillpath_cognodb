import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

// Shows which courses close the most skill gaps for the target job,
// ranked by coverage. Backs the "best next course" recommendation.
export default function CourseRecommendations({ personName, jobTitle }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .bestCourse(personName, jobTitle)
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
      <h3 className="panel-title">Best next course</h3>
      <p className="panel-hint">
        Courses ranked by how many of the missing skills for this job they cover.
      </p>

      {loading && <div className="loading-state">Comparing courses…</div>}
      {error && (
        <div className="error-state">
          <strong>Couldn't load recommendations.</strong>
          {error}
        </div>
      )}

      {!loading && !error && data && (
        data.recommendations.length === 0 ? (
          <div className="empty-state">
            No gap, or no course in the catalog teaches the missing skills yet.
          </div>
        ) : (
          <div>
            {data.recommendations.map((rec) => (
              <div className="course-row" key={rec.course}>
                <div className="course-info">
                  <h4>{rec.course}</h4>
                  <div className="provider">{rec.provider} · {rec.hours}h</div>
                </div>
                <div className="coverage-pill">
                  covers {rec.coverage}/{rec.totalGap} gap skills
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </section>
  );
}

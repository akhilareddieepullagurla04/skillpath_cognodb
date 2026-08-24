// api.js — thin wrapper around fetch for the backend API.
//
// VITE_API_URL lets the deployed frontend point at a deployed backend
// (e.g. https://skillpath-api.onrender.com). In local dev it's unset,
// so requests go to the relative /api path, which vite.config.js
// proxies to http://localhost:4000.

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => request('/api/health'),
  people: () => request('/api/people'),
  jobs: () => request('/api/jobs'),
  personDetail: (name) => request(`/api/people/${encodeURIComponent(name)}`),
  match: (personName) => request(`/api/match/${encodeURIComponent(personName)}`),
  path: (personName, jobTitle) =>
    request(`/api/path/${encodeURIComponent(personName)}/${encodeURIComponent(jobTitle)}`),
  bestCourse: (personName, jobTitle) =>
    request(`/api/best-course/${encodeURIComponent(personName)}/${encodeURIComponent(jobTitle)}`),
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

function getHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Something went wrong");
  }

  return payload;
}

export const api = {
  signup: (body) =>
    request("/auth/signup", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body)
    }),
  login: (body) =>
    request("/auth/login", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body)
    }),
  me: (token) =>
    request("/auth/me", {
      headers: getHeaders(token)
    }),
  classes: (token) =>
    request("/classes", {
      headers: getHeaders(token)
    }),
  createClass: (token, body) =>
    request("/classes", {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(body)
    }),
  enrollStudent: (token, body) =>
    request("/classes/enroll", {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(body)
    }),
  createSession: (token, body) =>
    request("/attendance/sessions", {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(body)
    }),
  session: (token, id) =>
    request(`/attendance/sessions/${id}`, {
      headers: getHeaders(token)
    }),
  myAttendance: (token) =>
    request("/attendance/my-records", {
      headers: getHeaders(token)
    }),
  subjectStudents: (token, subjectId, sessionId) =>
    request(
      `/attendance/subjects/${subjectId}/students${sessionId ? `?sessionId=${sessionId}` : ""}`,
      {
        headers: getHeaders(token)
      }
    ),
  manualMarkAttendance: (token, body) =>
    request("/attendance/manual-mark", {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(body)
    }),
  markAttendance: (token, body) =>
    request("/attendance/mark", {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(body)
    }),
  attendanceSummary: (token, period) =>
    request(`/reports/attendance-summary?period=${period}`, {
      headers: getHeaders(token)
    }),
  adminOverview: (token) =>
    request("/admin/overview", {
      headers: getHeaders(token)
    }),
  adminUsers: (token) =>
    request("/admin/users", {
      headers: getHeaders(token)
    }),
  adminOverallAttendance: (token) =>
    request("/admin/attendance/overall", {
      headers: getHeaders(token)
    }),
  adminSubjectAttendance: (token, subjectId) =>
    request(`/admin/attendance/subjects/${subjectId}`, {
      headers: getHeaders(token)
    }),
  adminCreateUser: (token, body) =>
    request("/admin/users", {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(body)
    }),
  adminUpdateUser: (token, id, body) =>
    request(`/admin/users/${id}`, {
      method: "PUT",
      headers: getHeaders(token),
      body: JSON.stringify(body)
    }),
  adminDeleteUser: (token, id) =>
    request(`/admin/users/${id}`, {
      method: "DELETE",
      headers: getHeaders(token)
    })
};

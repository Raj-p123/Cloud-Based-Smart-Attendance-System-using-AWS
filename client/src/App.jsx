import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api/client";
import { AppShell } from "./components/layout/AppShell";
import { AuthPage } from "./pages/AuthPage";
import { StudentDashboard } from "./pages/StudentDashboard";
import { TeacherDashboard } from "./pages/TeacherDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { ScanPage } from "./pages/ScanPage";

const storageKey = "smart-attendance-auth";

function loadSession() {
  const raw = window.localStorage.getItem(storageKey);
  return raw ? JSON.parse(raw) : { token: "", user: null };
}

function RoleRoute({ user, allowedRoles, children }) {
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return children;
}

export default function App() {
  const [session, setSession] = useState(loadSession);
  const [loading, setLoading] = useState(Boolean(session.token && !session.user));

  useEffect(() => {
    if (!session.token || session.user) {
      setLoading(false);
      return;
    }
    api
      .me(session.token)
      .then((user) => {
        const nextSession = { token: session.token, user };
        setSession(nextSession);
        window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
      })
      .catch(() => {
        window.localStorage.removeItem(storageKey);
        setSession({ token: "", user: null });
      })
      .finally(() => setLoading(false));
  }, [session.token, session.user]);

  function handleAuthenticated(payload) {
    const nextSession = { token: payload.token, user: payload.user };
    setSession(nextSession);
    window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
  }

  function logout() {
    window.localStorage.removeItem(storageKey);
    setSession({ token: "", user: null });
  }

  if (loading) {
    return <div className="loading-screen">Loading your workspace...</div>;
  }

  if (!session.token || !session.user) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <AppShell user={session.user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Navigate to={`/${session.user.role}`} replace />} />
        <Route
          path="/student"
          element={
            <RoleRoute user={session.user} allowedRoles={["student"]}>
              <StudentDashboard token={session.token} user={session.user} />
            </RoleRoute>
          }
        />
        <Route
          path="/teacher"
          element={
            <RoleRoute user={session.user} allowedRoles={["teacher"]}>
              <TeacherDashboard token={session.token} user={session.user} />
            </RoleRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleRoute user={session.user} allowedRoles={["admin"]}>
              <AdminDashboard token={session.token} user={session.user} />
            </RoleRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <RoleRoute user={session.user} allowedRoles={["student"]}>
              <ScanPage token={session.token} />
            </RoleRoute>
          }
        />
        <Route path="*" element={<Navigate to={`/${session.user.role}`} replace />} />
      </Routes>
    </AppShell>
  );
}

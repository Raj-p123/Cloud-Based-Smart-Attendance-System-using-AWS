import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export function AdminDashboard({ token, user }) {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [overallAttendance, setOverallAttendance] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [subjectAttendance, setSubjectAttendance] = useState({ subject: null, students: [] });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
    description: ""
  });
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    department: "",
    subjectIds: []
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    department: "",
    subjectIds: []
  });

  function formatAttendancePercent(presentCount, totalMarked) {
    if (!totalMarked) return "0%";
    return `${Math.round((presentCount / totalMarked) * 100)}%`;
  }

  function exportCsv(filename, rows) {
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function loadAdminData() {
    const [overviewData, usersData, classData, reportData, overallAttendanceData] = await Promise.all([
      api.adminOverview(token),
      api.adminUsers(token),
      api.classes(token),
      api.attendanceSummary(token, "monthly"),
      api.adminOverallAttendance(token)
    ]);

    setOverview(overviewData);
    setUsers(usersData);
    setClasses(classData);
    setReports(reportData);
    setOverallAttendance(overallAttendanceData);
    if (!selectedSubjectId && classData.length) {
      setSelectedSubjectId(String(classData[0].id));
    }
  }

  useEffect(() => {
    loadAdminData().catch((requestError) => setError(requestError.message));
  }, [token]);

  useEffect(() => {
    if (!selectedSubjectId) return;
    api
      .adminSubjectAttendance(token, selectedSubjectId)
      .then(setSubjectAttendance)
      .catch((requestError) => setError(requestError.message));
  }, [token, selectedSubjectId]);

  async function handleCreateUser(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.adminCreateUser(token, userForm);
      setUserForm({
        name: "",
        email: "",
        password: "",
        role: "student",
        department: "",
        subjectIds: []
      });
      setSuccess("User created successfully");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function startEditUser(item) {
    setEditingUserId(item.id);
    setEditForm({
      name: item.name,
      email: item.email,
      password: "",
      role: item.role,
      department: item.department || "",
      subjectIds: (item.subjects || []).map((subject) => subject.id)
    });
    setError("");
    setSuccess("");
  }

  function cancelEditUser() {
    setEditingUserId(null);
    setEditForm({
      name: "",
      email: "",
      password: "",
      role: "student",
      department: "",
      subjectIds: []
    });
  }

  function toggleSubject(formState, setFormState, subjectId) {
    const nextIds = formState.subjectIds.includes(subjectId)
      ? formState.subjectIds.filter((id) => id !== subjectId)
      : [...formState.subjectIds, subjectId];

    setFormState({ ...formState, subjectIds: nextIds });
  }

  async function handleUpdateUser(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.adminUpdateUser(token, editingUserId, editForm);
      setSuccess("User updated successfully");
      cancelEditUser();
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDeleteUser(userId) {
    setError("");
    setSuccess("");

    try {
      await api.adminDeleteUser(token, userId);
      if (editingUserId === userId) {
        cancelEditUser();
      }
      setSuccess("User deleted successfully");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="dashboard-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin command</p>
          <h1 className="admin-title">{user.name}'s platform overview</h1>
          <p className="hero-text">
            Monitor platform health, review classes, track attendance reporting, and manage users
            from one organized control surface.
          </p>
        </div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}
      {overview ? (
        <div className="stats-grid admin-stats-grid">
          <Card className="admin-stat-card">
            <h3>Total users</h3>
            <p className="metric">{overview.users}</p>
          </Card>
          <Card className="admin-stat-card">
            <h3>Total classes</h3>
            <p className="metric">{overview.classes}</p>
          </Card>
          <Card className="admin-stat-card">
            <h3>Total sessions</h3>
            <p className="metric">{overview.sessions}</p>
          </Card>
          <Card className="admin-stat-card">
            <h3>Attendance records</h3>
            <p className="metric">{overview.records}</p>
          </Card>
        </div>
      ) : null}

      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Quick actions</p>
          <h2>Manage platform setup</h2>
        </div>
      </div>

      <div className="admin-primary-grid">
        <Card className="admin-panel-card admin-create-card shape-1">
          <div className="admin-panel-head">
            <div>
              <p className="eyebrow">User creation</p>
              <h2>Add student or teacher</h2>
            </div>
            <p className="muted-copy">Create users directly from the admin panel</p>
          </div>
          <form className="stack-form" onSubmit={handleCreateUser}>
            <Input
              label="Full name"
              value={userForm.name}
              onChange={(event) => setUserForm({ ...userForm, name: event.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={userForm.email}
              onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
              required
            />
            <Input
              label="Password"
              type="text"
              value={userForm.password}
              onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
              required
            />
            <label className="field">
              <span className="field-label">Role</span>
              <select
                className="input"
                value={userForm.role}
                onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <Input
              label={userForm.role === "student" ? "Primary subject (optional fallback)" : "Department / Subject"}
              value={userForm.department}
              onChange={(event) => setUserForm({ ...userForm, department: event.target.value })}
              placeholder="Mathematics"
            />
            {userForm.role === "student" ? (
              <div className="field">
                <span className="field-label">Assign subjects</span>
                <div className="subject-picker">
                  {classes.map((item) => (
                    <label key={item.id} className="subject-option">
                      <input
                        type="checkbox"
                        checked={userForm.subjectIds.includes(item.id)}
                        onChange={() => toggleSubject(userForm, setUserForm, item.id)}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <Button type="submit">Create user</Button>
          </form>
        </Card>

        <div className="admin-side-stack">
          <Card className="admin-panel-card admin-subject-card shape-2">
            <div className="admin-panel-head">
              <div>
                <p className="eyebrow">Subject creation</p>
                <h2>Save a new subject</h2>
              </div>
              <p className="muted-copy">Admins can add subjects directly from this panel</p>
            </div>
            <form
              className="stack-form"
              onSubmit={async (event) => {
                event.preventDefault();
                setError("");
                setSuccess("");

                try {
                  await api.createClass(token, subjectForm);
                  setSubjectForm({ name: "", code: "", description: "" });
                  setSuccess("Subject saved successfully");
                  await loadAdminData();
                } catch (requestError) {
                  setError(requestError.message);
                }
              }}
            >
              <Input
                label="Subject name"
                value={subjectForm.name}
                onChange={(event) => setSubjectForm({ ...subjectForm, name: event.target.value })}
                required
              />
              <Input
                label="Subject code"
                value={subjectForm.code}
                onChange={(event) => setSubjectForm({ ...subjectForm, code: event.target.value })}
                placeholder="MATH-101"
              />
              <Input
                label="Description"
                value={subjectForm.description}
                onChange={(event) =>
                  setSubjectForm({ ...subjectForm, description: event.target.value })
                }
                placeholder="Foundational mathematics subject"
              />
              <Button type="submit">Save subject</Button>
            </form>
          </Card>

          <Card className="admin-panel-card shape-5">
            <div className="admin-panel-head">
              <div>
                <p className="eyebrow">Class management</p>
                <h2>Active subjects</h2>
              </div>
              <p className="muted-copy">Current subjects available in the platform</p>
            </div>
            <div className="admin-list">
              {classes.slice(0, 5).map((item) => (
                <div key={item.id} className="admin-list-row">
                  <div>
                    <strong>{item.name}</strong>
                    <p className="muted-copy">{item.code}</p>
                  </div>
                  <span className="status-pill status-present">{item.studentCount || 0} students</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="admin-panel-card shape-6">
            <div className="admin-panel-head">
              <div>
                <p className="eyebrow">Report snapshot</p>
                <h2>Monthly attendance trends</h2>
              </div>
              <p className="muted-copy">Recent attendance activity across subjects</p>
            </div>
            <div className="admin-list">
              {reports.slice(0, 5).map((item) => (
                <div key={`${item.label}-${item.className}`} className="admin-list-row">
                  <div>
                    <strong>{item.className}</strong>
                    <p className="muted-copy">{item.label}</p>
                  </div>
                  <span className="status-pill status-present">{item.presentCount} marked</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Attendance reports</p>
          <h2>Review overall and subject-wise attendance</h2>
        </div>
      </div>

      <div className="admin-report-grid">
        <Card className="admin-panel-card shape-3">
          <div className="admin-panel-head">
            <div>
              <p className="eyebrow">Overall attendance</p>
              <h2>All students attendance</h2>
            </div>
            <div className="admin-user-actions">
              <p className="muted-copy">Platform-wide student attendance summary</p>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  exportCsv("overall-attendance.csv", [
                    ["Name", "Email", "Present Count", "Total Marked", "Attendance %"],
                    ...overallAttendance.map((item) => [
                      item.name,
                      item.email,
                      item.presentCount,
                      item.totalMarked,
                      formatAttendancePercent(item.presentCount, item.totalMarked)
                    ])
                  ])
                }
              >
                Export CSV
              </Button>
            </div>
          </div>
          <div className="admin-list">
            {overallAttendance.map((item) => (
              <div key={item.id} className="admin-list-row">
                <div>
                  <strong>{item.name}</strong>
                  <p className="muted-copy">{item.email}</p>
                </div>
                <div className="admin-user-meta">
                  <span className="status-pill status-present">{item.presentCount} present</span>
                  <span className="muted-copy">{item.totalMarked} total marked</span>
                  <span className="status-pill status-neutral">
                    {formatAttendancePercent(item.presentCount, item.totalMarked)}
                  </span>
                  {item.totalMarked > 0 &&
                  Math.round((item.presentCount / item.totalMarked) * 100) < 75 ? (
                    <span className="status-pill status-absent">Low attendance</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="admin-panel-card shape-4">
          <div className="admin-panel-head">
            <div>
              <p className="eyebrow">Subject attendance</p>
              <h2>
                {subjectAttendance.subject?.name
                  ? `${subjectAttendance.subject.name} students`
                  : "Choose a subject"}
              </h2>
            </div>
            <div className="admin-user-actions">
              <label className="field admin-subject-select">
                <span className="field-label">Subject</span>
                <select
                  className="input"
                  value={selectedSubjectId}
                  onChange={(event) => setSelectedSubjectId(event.target.value)}
                >
                  <option value="">Select subject</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  exportCsv(
                    `${subjectAttendance.subject?.name || "subject"}-attendance.csv`,
                    [
                      ["Name", "Email", "Present Count", "Total Marked", "Attendance %"],
                      ...subjectAttendance.students.map((item) => [
                        item.name,
                        item.email,
                        item.presentCount,
                        item.totalMarked,
                        formatAttendancePercent(item.presentCount, item.totalMarked)
                      ])
                    ]
                  )
                }
                disabled={!subjectAttendance.subject}
              >
                Export CSV
              </Button>
            </div>
          </div>
          <div className="admin-list">
            {subjectAttendance.students.map((item) => (
              <div key={item.id} className="admin-list-row">
                <div>
                  <strong>{item.name}</strong>
                  <p className="muted-copy">{item.email}</p>
                </div>
                <div className="admin-user-meta">
                  <span className="status-pill status-present">{item.presentCount} present</span>
                  <span className="muted-copy">{item.totalMarked} total marked</span>
                  <span className="status-pill status-neutral">
                    {formatAttendancePercent(item.presentCount, item.totalMarked)}
                  </span>
                  {item.totalMarked > 0 &&
                  Math.round((item.presentCount / item.totalMarked) * 100) < 75 ? (
                    <span className="status-pill status-absent">Low attendance</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Users</p>
          <h2>Manage all platform users</h2>
        </div>
      </div>

      <Card className="admin-users-card shape-2">
        <div className="admin-panel-head">
          <div>
            <p className="eyebrow">User management</p>
            <h2>All platform users</h2>
          </div>
          <p className="muted-copy">{users.length} users loaded</p>
        </div>
        {editingUserId ? (
          <form className="stack-form admin-edit-form" onSubmit={handleUpdateUser}>
            <Input
              label="Full name"
              value={editForm.name}
              onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={editForm.email}
              onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
              required
            />
            <Input
              label="New password (optional)"
              type="text"
              value={editForm.password}
              onChange={(event) => setEditForm({ ...editForm, password: event.target.value })}
            />
            <label className="field">
              <span className="field-label">Role</span>
              <select
                className="input"
                value={editForm.role}
                onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <Input
              label={editForm.role === "student" ? "Primary subject (optional fallback)" : "Department / Subject"}
              value={editForm.department}
              onChange={(event) => setEditForm({ ...editForm, department: event.target.value })}
              placeholder="Mathematics"
            />
            {editForm.role === "student" ? (
              <div className="field">
                <span className="field-label">Assign subjects</span>
                <div className="subject-picker">
                  {classes.map((item) => (
                    <label key={item.id} className="subject-option">
                      <input
                        type="checkbox"
                        checked={editForm.subjectIds.includes(item.id)}
                        onChange={() => toggleSubject(editForm, setEditForm, item.id)}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="admin-form-actions">
              <Button type="submit">Save changes</Button>
              <Button type="button" variant="outline" onClick={cancelEditUser}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
        <div className="admin-user-grid">
          {users.map((item) => (
            <div key={item.id} className="admin-user-row">
              <div>
                <strong>{item.name}</strong>
                <p className="muted-copy">{item.email}</p>
              </div>
              <div className="admin-user-meta">
                <span className="status-pill status-present">{item.role}</span>
                <span className="muted-copy">
                  {item.department || "No department assigned"}
                </span>
                {item.role === "student" && item.subjects?.length ? (
                  <span className="muted-copy">
                    Subjects: {item.subjects.map((subject) => subject.name).join(", ")}
                  </span>
                ) : null}
                <div className="admin-user-actions">
                  <Button type="button" variant="outline" onClick={() => startEditUser(item)}>
                    Edit
                  </Button>
                  <Button type="button" onClick={() => handleDeleteUser(item.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

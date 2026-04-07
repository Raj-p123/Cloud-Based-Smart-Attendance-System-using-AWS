import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChartColumnIncreasing, Copy, QrCode, Users } from "lucide-react";
import { api } from "../api/client";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function TeacherDashboard({ token, user }) {
  const [classes, setClasses] = useState([]);
  const [reportPeriod, setReportPeriod] = useState("daily");
  const [reports, setReports] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterSubject, setRosterSubject] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [classForm, setClassForm] = useState({ name: "", code: "", description: "" });
  const [sessionForm, setSessionForm] = useState({
    classId: "",
    sessionName: "",
    durationMinutes: 10
  });

  async function loadDashboard() {
    try {
      const [classRows, reportRows] = await Promise.all([
        api.classes(token),
        api.attendanceSummary(token, reportPeriod)
      ]);
      setClasses(classRows);
      setReports(reportRows);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadRoster(subjectId, sessionId = activeSession?.id) {
    if (!subjectId) {
      setRoster([]);
      setRosterSubject(null);
      return;
    }

    setRosterLoading(true);
    try {
      const payload = await api.subjectStudents(token, subjectId, sessionId);
      setRoster(payload.students);
      setRosterSubject(payload.subject);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRosterLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [token, reportPeriod]);

  useEffect(() => {
    if (!sessionForm.classId) return;
    loadRoster(Number(sessionForm.classId));
  }, [token, sessionForm.classId]);

  useEffect(() => {
    if (!activeSession?.id) return undefined;

    const timer = setInterval(async () => {
      try {
        const refreshed = await api.session(token, activeSession.id);
        setActiveSession((current) =>
          current ? { ...refreshed, qrCode: current.qrCode || refreshed.qrCode } : current
        );
        loadRoster(refreshed.subject_id || sessionForm.classId, refreshed.id);
      } catch {
        return null;
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [token, activeSession?.id]);

  const reportCards = useMemo(() => reports.slice(0, 6), [reports]);
  const totalStudents = useMemo(
    () => classes.reduce((sum, item) => sum + Number(item.studentCount || 0), 0),
    [classes]
  );
  const presentCount = useMemo(
    () => roster.filter((student) => student.attendanceStatus === "present").length,
    [roster]
  );
  const absentCount = useMemo(
    () => roster.filter((student) => student.attendanceStatus !== "present").length,
    [roster]
  );
  const latestReport = reportCards[0];
  const sessionLink = useMemo(() => {
    if (!activeSession) return "";
    const payload = activeSession.qrPayload || activeSession.qr_payload;
    if (!payload) return "";
    if (payload.startsWith("http")) return payload;
    return `${window.location.origin}/scan?token=${payload}`;
  }, [activeSession]);

  async function handleCreateClass(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.createClass(token, classForm);
      setClassForm({ name: "", code: "", description: "" });
      setSuccess("Subject created successfully");
      loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleCreateSession(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const payload = await api.createSession(token, {
        ...sessionForm,
        classId: Number(sessionForm.classId),
        durationMinutes: Number(sessionForm.durationMinutes)
      });
      setActiveSession(payload);
      setSuccess("Live QR session created");
      await loadRoster(Number(sessionForm.classId), payload.id);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleManualMark(studentId) {
    if (!activeSession?.id) {
      setError("Create a live session before marking students manually");
      return;
    }

    setError("");
    setSuccess("");
    try {
      await api.manualMarkAttendance(token, {
        sessionId: activeSession.id,
        studentId,
        status: "present"
      });
      setSuccess("Attendance marked manually");
      await loadRoster(Number(sessionForm.classId), activeSession.id);
      const refreshed = await api.session(token, activeSession.id);
      setActiveSession((current) => ({ ...refreshed, qrCode: current?.qrCode || refreshed.qrCode }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function copySessionLink() {
    if (!sessionLink) {
      setError("Generate a live session first");
      return;
    }

    try {
      await navigator.clipboard.writeText(sessionLink);
      setSuccess("Session link copied");
    } catch {
      setError("Could not copy the session link");
    }
  }

  return (
    <section className="dashboard-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Teacher hub</p>
          <h1>{user.name}'s class studio</h1>
          <p className="hero-text teacher-hero-copy">
            Organize subjects, launch QR attendance quickly, and keep an eye on who still needs a
            manual mark from one calm control surface.
          </p>
        </div>
        <div className="pill-row">
          <button
            type="button"
            className={`nav-pill ${reportPeriod === "daily" ? "active" : ""}`}
            onClick={() => setReportPeriod("daily")}
          >
            Daily
          </button>
          <button
            type="button"
            className={`nav-pill ${reportPeriod === "weekly" ? "active" : ""}`}
            onClick={() => setReportPeriod("weekly")}
          >
            Weekly
          </button>
          <button
            type="button"
            className={`nav-pill ${reportPeriod === "monthly" ? "active" : ""}`}
            onClick={() => setReportPeriod("monthly")}
          >
            Monthly
          </button>
        </div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <div className="teacher-stats-grid">
        <Card className="teacher-stat-card">
          <p className="eyebrow">Subjects</p>
          <h3>Live teaching setup</h3>
          <p className="metric">{classes.length}</p>
          <p className="muted-copy">Subjects ready for attendance operations.</p>
        </Card>
        <Card className="teacher-stat-card">
          <p className="eyebrow">Roster size</p>
          <h3>Total students</h3>
          <p className="metric">{totalStudents}</p>
          <p className="muted-copy">Across every subject currently mapped to you.</p>
        </Card>
        <Card className="teacher-stat-card">
          <p className="eyebrow">Live status</p>
          <h3>Present in current session</h3>
          <p className="metric">{presentCount}</p>
          <p className="muted-copy">{absentCount} still pending or absent in the selected roster.</p>
        </Card>
        <Card className="teacher-stat-card">
          <p className="eyebrow">{reportPeriod}</p>
          <h3>{latestReport?.className || "No report yet"}</h3>
          <p className="metric">{latestReport?.presentCount || 0}</p>
          <p className="muted-copy">Current best attendance count from this reporting window.</p>
        </Card>
      </div>

      <div className="teacher-primary-grid">
        <Card className="teacher-panel-card">
          <div className="teacher-panel-head">
            <div>
              <p className="eyebrow">Setup</p>
              <h2>Create subject</h2>
            </div>
            <span className="icon-bubble" aria-hidden="true">
              <BookOpen size={24} />
            </span>
          </div>
          <form className="stack-form" onSubmit={handleCreateClass}>
            <Input
              label="Class name"
              value={classForm.name}
              onChange={(event) => setClassForm({ ...classForm, name: event.target.value })}
              required
            />
            <Input
              label="Class code"
              value={classForm.code}
              onChange={(event) => setClassForm({ ...classForm, code: event.target.value })}
              required
            />
            <Input
              label="Description"
              value={classForm.description}
              onChange={(event) => setClassForm({ ...classForm, description: event.target.value })}
            />
            <Button type="submit">Save class</Button>
          </form>
        </Card>

        <Card className="teacher-panel-card">
          <div className="teacher-panel-head">
            <div>
              <p className="eyebrow">Live operations</p>
              <h2>Generate attendance session</h2>
            </div>
            <span className="icon-bubble" aria-hidden="true">
              <QrCode size={24} />
            </span>
          </div>
          <form className="stack-form" onSubmit={handleCreateSession}>
            <label className="field">
              <span className="field-label">Choose class</span>
              <select
                className="input"
                value={sessionForm.classId}
                onChange={(event) => setSessionForm({ ...sessionForm, classId: event.target.value })}
                required
              >
                <option value="">Select class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Session title"
              value={sessionForm.sessionName}
              onChange={(event) => setSessionForm({ ...sessionForm, sessionName: event.target.value })}
              placeholder="Week 4 - Distributed Systems"
              required
            />
            <Input
              label="Expires in minutes"
              type="number"
              min="1"
              value={sessionForm.durationMinutes}
              onChange={(event) => setSessionForm({ ...sessionForm, durationMinutes: event.target.value })}
              required
            />
            <Button type="submit">Create live QR session</Button>
          </form>
        </Card>
      </div>

      {activeSession ? (
        <Card className="teacher-live-card">
          <div className="teacher-panel-head">
            <div>
              <p className="eyebrow">Live attendance</p>
              <h2>{activeSession.sessionName}</h2>
              <p className="muted-copy">
                Session expires at {" "}
                {new Date(activeSession.expiresAt || activeSession.expires_at).toLocaleString()}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={copySessionLink}>
              <Copy size={18} />
              Copy session link
            </Button>
          </div>
          <div className="teacher-live-layout">
            {"qrCode" in activeSession ? (
              <img src={activeSession.qrCode} alt="Attendance QR code" className="qr-image" />
            ) : null}
            <div className="teacher-live-side">
              <div className="teacher-live-metrics">
                <div className="teacher-metric-chip">
                  <span className="teacher-metric-label">Present</span>
                  <strong>{presentCount}</strong>
                </div>
                <div className="teacher-metric-chip">
                  <span className="teacher-metric-label">Pending</span>
                  <strong>{absentCount}</strong>
                </div>
                <div className="teacher-metric-chip">
                  <span className="teacher-metric-label">Subject</span>
                  <strong>{rosterSubject?.name || "Selected class"}</strong>
                </div>
              </div>
              <div className="teacher-live-actions">
                <p className="muted-copy">
                  Students can scan the QR or open the shared live session link.
                </p>
                <p className="token-line">{activeSession.qrPayload || activeSession.qr_payload}</p>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="teacher-section-head">
        <div>
          <p className="eyebrow">Roster control</p>
          <h2>Students and quick actions</h2>
        </div>
        <p className="muted-copy">
          {activeSession?.id
            ? "Students who miss the QR can be marked manually without leaving this page."
            : "Choose a class and create a session to unlock live attendance controls."}
        </p>
      </div>

      <div className="teacher-roster-grid">
        <Card className="teacher-panel-card">
          <div className="roster-header">
            <div>
              <p className="eyebrow">Student roster</p>
              <h2>{rosterSubject?.name || "Select a class to see students"}</h2>
            </div>
            <div className="teacher-inline-copy">
              <Users size={18} />
              <span>{roster.length} students</span>
            </div>
          </div>
          {rosterLoading ? <p className="muted-copy">Loading students...</p> : null}
          {!rosterLoading && roster.length === 0 ? (
            <p className="muted-copy">No students found in DB for this subject yet.</p>
          ) : null}
          <div className="roster-list">
            {roster.map((student) => (
              <div key={student.id} className="roster-row">
                <div>
                  <strong>{student.name}</strong>
                  <p className="muted-copy">{student.email}</p>
                </div>
                <div className="roster-actions">
                  <span className={`status-pill status-${student.attendanceStatus}`}>
                    {student.attendanceStatus}
                    {student.markedVia ? ` · ${student.markedVia}` : ""}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleManualMark(student.id)}
                    disabled={!activeSession?.id || student.attendanceStatus === "present"}
                  >
                    Mark manually
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="teacher-side-stack">
          <Card className="teacher-insight-card">
            <div className="teacher-panel-head">
              <div>
                <p className="eyebrow">Session health</p>
                <h3>Quick insight</h3>
              </div>
              <span className="icon-bubble" aria-hidden="true">
                <ChartColumnIncreasing size={22} />
              </span>
            </div>
            <div className="teacher-insight-list">
              <div className="teacher-insight-row">
                <span>Manual action needed</span>
                <strong>{absentCount}</strong>
              </div>
              <div className="teacher-insight-row">
                <span>Students scanned or marked</span>
                <strong>{presentCount}</strong>
              </div>
              <div className="teacher-insight-row">
                <span>Live attendance running</span>
                <strong>{activeSession ? "Yes" : "No"}</strong>
              </div>
            </div>
          </Card>

          <Card className="teacher-insight-card">
            <div className="teacher-panel-head">
              <div>
                <p className="eyebrow">Best next step</p>
                <h3>Teacher checklist</h3>
              </div>
            </div>
            <div className="teacher-insight-list">
              <div className="teacher-insight-row">
                <span>1. Pick a subject</span>
                <strong>{sessionForm.classId ? "Done" : "Pending"}</strong>
              </div>
              <div className="teacher-insight-row">
                <span>2. Launch QR session</span>
                <strong>{activeSession ? "Done" : "Pending"}</strong>
              </div>
              <div className="teacher-insight-row">
                <span>3. Clear pending students</span>
                <strong>{absentCount === 0 && roster.length > 0 ? "Done" : "Pending"}</strong>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="teacher-section-head">
        <div>
          <p className="eyebrow">Reporting</p>
          <h2>Attendance snapshots</h2>
        </div>
        <p className="muted-copy">Quick counts across your selected reporting period.</p>
      </div>

      <div className="teacher-report-grid">
        {reportCards.map((item, index) => (
          <Card key={`${item.label}-${item.className}`} className={`shape-${(index % 6) + 1}`}>
            <p className="eyebrow">{item.label}</p>
            <h3>{item.className}</h3>
            <p className="metric-small">{item.presentCount}</p>
          </Card>
        ))}
      </div>

      <div className="teacher-section-head">
        <div>
          <p className="eyebrow">Subject studio</p>
          <h2>Managed classes</h2>
        </div>
        <p className="muted-copy">A quick glance at every class and its mapped student count.</p>
      </div>

      <div className="teacher-class-grid">
        {classes.map((item) => (
          <Card key={item.id} className="teacher-class-card">
            <p className="eyebrow">{item.code}</p>
            <h3>{item.name}</h3>
            <p>{item.description || "Class details ready for attendance operations."}</p>
            <p className="muted-copy">{item.studentCount || 0} enrolled students</p>
          </Card>
        ))}
      </div>
    </section>
  );
}


import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QrCode, Sprout, CalendarDays } from "lucide-react";
import { api } from "../api/client";
import { Card } from "../components/ui/Card";

export function StudentDashboard({ token, user }) {
  const [classes, setClasses] = useState([]);
  const [attendance, setAttendance] = useState({
    student: null,
    summary: { totalMarked: 0, presentCount: 0 },
    activeSession: null,
    records: []
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([api.classes(token), api.myAttendance(token)])
      .then(([classRows, attendancePayload]) => {
        setClasses(classRows);
        setAttendance(attendancePayload);
      })
      .catch((error) => setMessage(error.message));
  }, [token]);

  const subjectName = attendance.student?.subject || classes[0]?.name || "No subject assigned";

  return (
    <section className="dashboard-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Student workspace</p>
          <h1>{user.name}'s attendance desk</h1>
          <p className="hero-text">
            Track your assigned subject, scan live QR sessions, and review your latest attendance
            activity in one calm view.
          </p>
        </div>
        <Link to="/scan" className="button button-outline">
          Open QR Check-In
        </Link>
      </div>
      {message ? <p className="form-error">{message}</p> : null}
      <div className="stats-grid">
        <Card className="student-stat-card shape-1">
          <div className="icon-bubble">
            <Sprout size={24} />
          </div>
          <h3>Assigned subject</h3>
          <p className="metric metric-small">{subjectName}</p>
        </Card>
        <Card className="student-stat-card shape-2">
          <div className="icon-bubble">
            <CalendarDays size={24} />
          </div>
          <h3>Total marked</h3>
          <p className="metric">{attendance.summary.totalMarked}</p>
        </Card>
        <Card className="student-stat-card shape-3">
          <div className="icon-bubble">
            <QrCode size={24} />
          </div>
          <h3>Present records</h3>
          <p className="metric">{attendance.summary.presentCount}</p>
        </Card>
      </div>
      <div className="student-focus-grid">
        <Card className="student-focus-card student-live-card">
          <p className="eyebrow">Live session</p>
          <h2>
            {attendance.activeSession
              ? `${attendance.activeSession.subjectName} session is open`
              : "No active QR session right now"}
          </h2>
          <p className="hero-text">
            {attendance.activeSession
              ? `Scan and mark attendance before ${new Date(attendance.activeSession.qrExpiry).toLocaleString()}.`
              : "Ask your teacher to open a QR attendance session, then use the scan page."}
          </p>
          <div className="student-cta-row">
            <Link to="/scan" className="button button-primary">
              Scan now
            </Link>
          </div>
        </Card>

        <Card className="student-focus-card student-detail-card">
          <p className="eyebrow">Subject details</p>
          <h2>{classes[0]?.name || "Subject pending"}</h2>
          <p className="hero-text">
            {classes[0]
              ? "This subject is mapped from your student profile in the database."
              : "Your account does not have a subject mapping yet. Ask admin or teacher to set users.subject."}
          </p>
          {classes[0] ? <p className="muted-copy">Code: {classes[0].code}</p> : null}
        </Card>
      </div>

      <Card className="shape-6">
        <div className="roster-header">
          <div>
            <p className="eyebrow">Recent activity</p>
            <h2>Your latest attendance records</h2>
          </div>
          <p className="muted-copy">Latest 10 records from the attendance table</p>
        </div>
        <div className="roster-list">
          {attendance.records.length === 0 ? (
            <p className="muted-copy">No attendance marked yet.</p>
          ) : (
            attendance.records.map((record) => (
              <div key={record.id} className="roster-row">
                <div>
                  <strong>{record.subject || subjectName}</strong>
                  <p className="muted-copy">
                    {new Date(record.marked_at || record.date).toLocaleString()}
                  </p>
                </div>
                <div className="roster-actions">
                  <span className={`status-pill status-${record.status || "absent"}`}>
                    {record.status}
                    {record.marked_via ? ` · ${record.marked_via}` : ""}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </section>
  );
}

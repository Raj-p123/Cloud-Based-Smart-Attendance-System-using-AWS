import crypto from "node:crypto";
import { query } from "../config/db.js";
import { createHttpError } from "../utils/errors.js";
import { buildQrDataUrl } from "../utils/qr.js";

async function getSubjectById(subjectId) {
  const rows = await query("SELECT * FROM subjects WHERE id = ?", [subjectId]);
  return rows[0];
}

async function hasEnrollmentsTable() {
  const rows = await query("SHOW TABLES LIKE 'enrollments'");
  return rows.length > 0;
}

export async function createSession(req, res, next) {
  try {
    const { classId, sessionName, durationMinutes = 10 } = req.body;
    if (!classId) {
      throw createHttpError(400, "Class is required");
    }

    const subject = await getSubjectById(classId);
    if (!subject) {
      throw createHttpError(404, "Subject not found");
    }

    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
    const sessionToken = crypto.randomUUID();
    const qrPayload = `${process.env.QR_BASE_URL}?token=${sessionToken}`;
    const qrCode = await buildQrDataUrl(qrPayload);

    const result = await query(
      `
        INSERT INTO attendance_sessions
        (subject_id, opened_by, opened_by_role, qr_token, qr_expiry, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [classId, req.user.sub, req.user.role, sessionToken, expiresAt, 1]
    );

    res.status(201).json({
      id: result.insertId,
      classId,
      sessionName: sessionName || `${subject.name} Session`,
      sessionToken,
      qrPayload,
      qrCode,
      startsAt,
      expiresAt
    });
  } catch (error) {
    next(error);
  }
}

export async function getSession(req, res, next) {
  try {
    const [session] = await query(
      `
        SELECT s.*, sub.name AS className
        FROM attendance_sessions s
        INNER JOIN subjects sub ON sub.id = s.subject_id
        WHERE s.id = ?
      `,
      [req.params.id]
    );

    if (!session) {
      throw createHttpError(404, "Session not found");
    }

    const attendees = await query(
      `
        SELECT ar.id, ar.marked_at, ar.status, u.name, u.email
        FROM attendance ar
        INNER JOIN users u ON u.id = ar.student_id
        WHERE ar.session_id = ?
        ORDER BY ar.marked_at DESC
      `,
      [req.params.id]
    );

    const qrPayload = `${process.env.QR_BASE_URL}?token=${session.qr_token}`;
    const qrCode = await buildQrDataUrl(qrPayload);

    res.json({
      ...session,
      qrPayload,
      sessionName: `${session.className} Session`,
      expires_at: session.qr_expiry,
      qrCode,
      attendees
    });
  } catch (error) {
    next(error);
  }
}

export async function getSubjectStudents(req, res, next) {
  try {
    const subjectId = Number(req.params.subjectId);
    const sessionId = req.query.sessionId ? Number(req.query.sessionId) : null;
    const subject = await getSubjectById(subjectId);
    const useEnrollments = await hasEnrollmentsTable();

    if (!subject) {
      throw createHttpError(404, "Subject not found");
    }

    const students = useEnrollments
      ? await query(
          `
            SELECT u.id, u.name, u.email, u.subject
            FROM users u
            INNER JOIN enrollments e ON e.student_id = u.id
            WHERE u.role = 'student' AND e.subject_id = ?
            ORDER BY u.name ASC
          `,
          [subjectId]
        )
      : await query(
          `
            SELECT id, name, email, subject
            FROM users
            WHERE role = 'student' AND subject = ?
            ORDER BY name ASC
          `,
          [subject.name]
        );

    let attendanceRows = [];
    if (sessionId) {
      attendanceRows = await query(
        `
          SELECT session_id, student_id, status, marked_at, marked_via
          FROM attendance
          WHERE session_id = ?
        `,
        [sessionId]
      );
    }

    const attendanceMap = new Map(attendanceRows.map((row) => [row.student_id, row]));

    res.json({
      subject: {
        id: subject.id,
        name: subject.name
      },
      students: students.map((student) => {
        const record = attendanceMap.get(student.id);
        return {
          ...student,
          attendanceStatus: record?.status || "absent",
          markedAt: record?.marked_at || null,
          markedVia: record?.marked_via || null
        };
      })
    });
  } catch (error) {
    next(error);
  }
}

export async function markAttendance(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) {
      throw createHttpError(400, "Session token is required");
    }

    const [session] = await query(
      `
        SELECT s.*, sub.id AS classId, sub.name AS subjectName
        FROM attendance_sessions s
        INNER JOIN subjects sub ON sub.id = s.subject_id
        WHERE s.qr_token = ?
      `,
      [token]
    );

    if (!session) {
      throw createHttpError(404, "Session not found");
    }

    if (session.qr_expiry && new Date(session.qr_expiry) < new Date()) {
      await query(
        "UPDATE attendance_sessions SET is_active = 0, closed_at = NOW() WHERE id = ?",
        [session.id]
      );
      throw createHttpError(410, "This attendance session has expired");
    }

    if (session.is_active === 0) {
      throw createHttpError(410, "This attendance session is closed");
    }

    await query(
      `
        INSERT INTO attendance
        (session_id, student_id, date, status, marked_by, marked_by_role, marked_via, subject)
        VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?)
      `,
      [session.id, req.user.sub, "present", req.user.sub, req.user.role, "qr", session.subjectName]
    );

    res.status(201).json({
      message: "Attendance marked successfully",
      sessionId: session.id
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return next(createHttpError(409, "Attendance already marked for this session"));
    }
    return next(error);
  }
}

export async function manualMarkAttendance(req, res, next) {
  try {
    const { sessionId, studentId, status = "present" } = req.body;
    if (!sessionId || !studentId) {
      throw createHttpError(400, "Session and student are required");
    }

    const [session] = await query(
      `
        SELECT s.*, sub.name AS subjectName
        FROM attendance_sessions s
        INNER JOIN subjects sub ON sub.id = s.subject_id
        WHERE s.id = ?
      `,
      [sessionId]
    );

    if (!session) {
      throw createHttpError(404, "Session not found");
    }

    const [student] = await query(
      `
        SELECT id, name, email, subject
        FROM users
        WHERE id = ? AND role = 'student'
      `,
      [studentId]
    );

    if (!student) {
      throw createHttpError(404, "Student not found");
    }

    if (student.subject !== session.subjectName) {
      throw createHttpError(400, "This student is not mapped to the selected subject");
    }

    const existing = await query(
      "SELECT id, marked_via FROM attendance WHERE session_id = ? AND student_id = ? LIMIT 1",
      [sessionId, studentId]
    );

    if (existing.length) {
      await query(
        `
          UPDATE attendance
          SET status = ?, marked_by = ?, marked_by_role = ?, marked_via = 'manual', marked_at = NOW()
          WHERE id = ?
        `,
        [status, req.user.sub, req.user.role, existing[0].id]
      );
    } else {
      await query(
        `
          INSERT INTO attendance
          (session_id, student_id, date, status, marked_by, marked_by_role, marked_via, subject)
          VALUES (?, ?, CURDATE(), ?, ?, ?, 'manual', ?)
        `,
        [sessionId, studentId, status, req.user.sub, req.user.role, session.subjectName]
      );
    }

    res.status(201).json({
      message: "Attendance marked manually",
      sessionId,
      studentId
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyAttendance(req, res, next) {
  try {
    const [student] = await query(
      `
        SELECT id, name, email, role, subject
        FROM users
        WHERE id = ? AND role = 'student'
        LIMIT 1
      `,
      [req.user.sub]
    );

    if (!student) {
      throw createHttpError(404, "Student not found");
    }

    const records = await query(
      `
        SELECT
          a.id,
          a.date,
          a.status,
          a.marked_via,
          a.marked_at,
          a.subject,
          s.qr_expiry
        FROM attendance a
        LEFT JOIN attendance_sessions s ON s.id = a.session_id
        WHERE a.student_id = ?
        ORDER BY a.marked_at DESC
        LIMIT 10
      `,
      [req.user.sub]
    );

    const [summary] = await query(
      `
        SELECT
          COUNT(*) AS totalMarked,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS presentCount
        FROM attendance
        WHERE student_id = ?
      `,
      [req.user.sub]
    );

    const [activeSession] = student.subject
      ? await query(
          `
            SELECT
              s.id,
              s.qr_token,
              s.qr_expiry,
              sub.name AS subjectName
            FROM attendance_sessions s
            INNER JOIN subjects sub ON sub.id = s.subject_id
            WHERE sub.name = ? AND s.is_active = 1 AND (s.qr_expiry IS NULL OR s.qr_expiry >= NOW())
            ORDER BY s.created_at DESC
            LIMIT 1
          `,
          [student.subject]
        )
      : [null];

    res.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        subject: student.subject || null
      },
      summary: {
        totalMarked: Number(summary?.totalMarked || 0),
        presentCount: Number(summary?.presentCount || 0)
      },
      activeSession: activeSession
        ? {
            id: activeSession.id,
            subjectName: activeSession.subjectName,
            qrExpiry: activeSession.qr_expiry,
            token: activeSession.qr_token
          }
        : null,
      records
    });
  } catch (error) {
    next(error);
  }
}

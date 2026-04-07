import { query } from "../config/db.js";
import { hashPassword } from "../utils/auth.js";
import { createHttpError } from "../utils/errors.js";

let cachedUserColumns = null;

async function getUserColumns() {
  if (cachedUserColumns) return cachedUserColumns;
  const columns = await query("SHOW COLUMNS FROM users");
  cachedUserColumns = columns.map((column) => column.Field);
  return cachedUserColumns;
}

async function ensureEnrollmentsTable() {
  await query(
    `
      CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        subject_id INT NOT NULL,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_enrollment (student_id, subject_id)
      )
    `
  );
}

async function syncStudentEnrollments(studentId, subjectIds = []) {
  await ensureEnrollmentsTable();
  await query("DELETE FROM enrollments WHERE student_id = ?", [studentId]);

  for (const subjectId of subjectIds) {
    await query("INSERT IGNORE INTO enrollments (student_id, subject_id) VALUES (?, ?)", [
      studentId,
      subjectId
    ]);
  }
}

async function getPrimarySubjectName(subjectIds = []) {
  if (!subjectIds.length) return null;
  const rows = await query("SELECT id, name FROM subjects WHERE id IN (?) ORDER BY id ASC", [subjectIds]);
  return rows[0]?.name || null;
}

export async function getOverview(_req, res, next) {
  try {
    const [users] = await query("SELECT COUNT(*) AS totalUsers FROM users");
    const [classes] = await query("SELECT COUNT(*) AS totalClasses FROM subjects");
    const [sessions] = await query("SELECT COUNT(*) AS totalSessions FROM attendance_sessions");
    const [records] = await query("SELECT COUNT(*) AS totalRecords FROM attendance");

    res.json({
      users: users.totalUsers,
      classes: classes.totalClasses,
      sessions: sessions.totalSessions,
      records: records.totalRecords
    });
  } catch (error) {
    next(error);
  }
}

export async function listUsers(_req, res, next) {
  try {
    await ensureEnrollmentsTable();
    const rows = await query(
      "SELECT id, name, email, role, subject, created_at FROM users ORDER BY created_at DESC"
    );
    const enrollments = await query(
      `
        SELECT e.student_id, e.subject_id, s.name
        FROM enrollments e
        INNER JOIN subjects s ON s.id = e.subject_id
      `
    );

    const byStudent = new Map();
    enrollments.forEach((row) => {
      const current = byStudent.get(row.student_id) || [];
      current.push({ id: row.subject_id, name: row.name });
      byStudent.set(row.student_id, current);
    });

    res.json(
      rows.map((user) => ({
        ...user,
        department: user.subject || null,
        subjects: byStudent.get(user.id) || []
      }))
    );
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, password, role, department, subjectIds = [] } = req.body;

    if (!name || !email || !password || !role) {
      throw createHttpError(400, "Name, email, password, and role are required");
    }

    if (!["student", "teacher", "admin"].includes(role)) {
      throw createHttpError(400, "Invalid role selected");
    }

    const existing = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existing.length) {
      throw createHttpError(409, "Email is already registered");
    }

    const columns = await getUserColumns();
    const normalizedSubjectIds = Array.isArray(subjectIds)
      ? [...new Set(subjectIds.map((value) => Number(value)).filter(Boolean))]
      : [];
    const profileValue =
      role === "student" ? await getPrimarySubjectName(normalizedSubjectIds) : department || null;
    let result;

    if (columns.includes("password_hash")) {
      const passwordHash = await hashPassword(password);
      result = await query(
        "INSERT INTO users (name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?)",
        [name, email, passwordHash, role, profileValue]
      );
    } else {
      result = await query(
        "INSERT INTO users (name, email, password, role, subject) VALUES (?, ?, ?, ?, ?)",
        [name, email, password, role, profileValue]
      );
    }

    if (role === "student") {
      await syncStudentEnrollments(result.insertId, normalizedSubjectIds);
    }

    res.status(201).json({
      id: result.insertId,
      name,
      email,
      role,
      department: profileValue,
      subjects: []
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const { name, email, password, role, department, subjectIds = [] } = req.body;

    if (!name || !email || !role) {
      throw createHttpError(400, "Name, email, and role are required");
    }

    if (!["student", "teacher", "admin"].includes(role)) {
      throw createHttpError(400, "Invalid role selected");
    }

    const [currentUser] = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
    if (!currentUser) {
      throw createHttpError(404, "User not found");
    }

    const existing = await query("SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1", [
      email,
      userId
    ]);
    if (existing.length) {
      throw createHttpError(409, "Email is already registered");
    }

    const columns = await getUserColumns();
    const normalizedSubjectIds = Array.isArray(subjectIds)
      ? [...new Set(subjectIds.map((value) => Number(value)).filter(Boolean))]
      : [];
    const profileValue =
      role === "student" ? await getPrimarySubjectName(normalizedSubjectIds) : department || null;

    if (columns.includes("password_hash")) {
      const updateFields = ["name = ?", "email = ?", "role = ?", "department = ?"];
      const values = [name, email, role, profileValue];

      if (password) {
        updateFields.push("password_hash = ?");
        values.push(await hashPassword(password));
      }

      values.push(userId);
      await query(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`, values);
    } else {
      const updateFields = ["name = ?", "email = ?", "role = ?", "subject = ?"];
      const values = [name, email, role, profileValue];

      if (password) {
        updateFields.push("password = ?");
        values.push(password);
      }

      values.push(userId);
      await query(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`, values);
    }

    if (role === "student") {
      await syncStudentEnrollments(userId, normalizedSubjectIds);
    } else {
      await ensureEnrollmentsTable();
      await query("DELETE FROM enrollments WHERE student_id = ?", [userId]);
    }

    res.json({
      id: userId,
      name,
      email,
      role,
      department: profileValue
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    await ensureEnrollmentsTable();
    await query("DELETE FROM enrollments WHERE student_id = ?", [userId]);
    const result = await query("DELETE FROM users WHERE id = ? LIMIT 1", [userId]);

    if (!result.affectedRows) {
      throw createHttpError(404, "User not found");
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export async function getOverallAttendance(_req, res, next) {
  try {
    await ensureEnrollmentsTable();
    const rows = await query(
      `
        SELECT
          u.id,
          u.name,
          u.email,
          COUNT(a.id) AS totalMarked,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS presentCount
        FROM users u
        LEFT JOIN attendance a ON a.student_id = u.id
        WHERE u.role = 'student'
        GROUP BY u.id, u.name, u.email
        ORDER BY u.name ASC
      `
    );

    res.json(
      rows.map((row) => ({
        ...row,
        totalMarked: Number(row.totalMarked || 0),
        presentCount: Number(row.presentCount || 0)
      }))
    );
  } catch (error) {
    next(error);
  }
}

export async function getSubjectAttendance(req, res, next) {
  try {
    await ensureEnrollmentsTable();
    const subjectId = Number(req.params.subjectId);
    const [subject] = await query("SELECT id, name FROM subjects WHERE id = ? LIMIT 1", [subjectId]);

    if (!subject) {
      throw createHttpError(404, "Subject not found");
    }

    const rows = await query(
      `
        SELECT
          u.id,
          u.name,
          u.email,
          COUNT(a.id) AS totalMarked,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS presentCount
        FROM enrollments e
        INNER JOIN users u ON u.id = e.student_id
        LEFT JOIN attendance a ON a.student_id = u.id AND a.subject = ?
        WHERE e.subject_id = ?
        GROUP BY u.id, u.name, u.email
        ORDER BY u.name ASC
      `,
      [subject.name, subjectId]
    );

    res.json({
      subject,
      students: rows.map((row) => ({
        ...row,
        totalMarked: Number(row.totalMarked || 0),
        presentCount: Number(row.presentCount || 0)
      }))
    });
  } catch (error) {
    next(error);
  }
}

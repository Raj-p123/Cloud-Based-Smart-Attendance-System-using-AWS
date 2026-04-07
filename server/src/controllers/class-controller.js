import { query } from "../config/db.js";
import { createHttpError } from "../utils/errors.js";

async function hasEnrollmentsTable() {
  const rows = await query("SHOW TABLES LIKE 'enrollments'");
  return rows.length > 0;
}

export async function createClass(req, res, next) {
  try {
    const { name, code, description } = req.body;
    if (!name) {
      throw createHttpError(400, "Class name is required");
    }

    const result = await query("INSERT INTO subjects (name) VALUES (?)", [name]);

    res.status(201).json({
      id: result.insertId,
      name,
      code: code || `SUB-${result.insertId}`,
      description: description || null
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return next(createHttpError(409, "A subject with this name already exists"));
    }
    next(error);
  }
}

export async function listClasses(req, res, next) {
  try {
    const useEnrollments = await hasEnrollmentsTable();
    let subjects;

    if (req.user.role === "student") {
      if (useEnrollments) {
        subjects = await query(
          `
            SELECT
              s.id,
              s.name,
              s.created_at
            FROM subjects s
            INNER JOIN enrollments e ON e.subject_id = s.id
            WHERE e.student_id = ?
            ORDER BY s.created_at DESC
          `,
          [req.user.sub]
        );
      } else {
        const [currentUser] = await query(
          "SELECT id, name, email, role, subject FROM users WHERE id = ? LIMIT 1",
          [req.user.sub]
        );

        if (!currentUser?.subject) {
          return res.json([]);
        }

        subjects = await query(
          `
            SELECT
              s.id,
              s.name,
              s.created_at
            FROM subjects s
            WHERE s.name = ?
            ORDER BY s.created_at DESC
          `,
          [currentUser.subject]
        );
      }
    } else {
      subjects = await query(
        `
          SELECT
            s.id,
            s.name,
            s.created_at
          FROM subjects s
          ORDER BY s.created_at DESC
        `
      );
    }

    const rows = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: `SUB-${subject.id}`,
      description: req.user.role === "student" ? "Assigned subject for attendance." : "Subject available for attendance sessions.",
      teacherName: req.user.role === "teacher" ? req.user.name : "Assigned teacher",
      studentCount: 0,
      created_at: subject.created_at
    }));

    if (req.user.role !== "student") {
      const studentCounts = useEnrollments
        ? await query(
            `
              SELECT subject_id, COUNT(*) AS total
              FROM enrollments
              GROUP BY subject_id
            `
          )
        : await query(
            `
              SELECT subject, COUNT(*) AS total
              FROM users
              WHERE role = 'student' AND subject IS NOT NULL
              GROUP BY subject
            `
          );

      const countMap = new Map(
        studentCounts.map((row) => [useEnrollments ? row.subject_id : row.subject, row.total])
      );
      rows.forEach((row) => {
        row.studentCount = countMap.get(useEnrollments ? row.id : row.name) || 0;
      });
    }

    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function enrollStudent(req, res, next) {
  try {
    const { classId, studentId } = req.body;
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
    await query(
      "INSERT IGNORE INTO enrollments (student_id, subject_id) VALUES (?, ?)",
      [studentId, classId]
    );
    res.status(201).json({ message: "Student enrolled successfully" });
  } catch (error) {
    next(error);
  }
}

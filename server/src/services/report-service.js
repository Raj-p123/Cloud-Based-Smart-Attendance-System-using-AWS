import { query } from "../config/db.js";

const periodMap = {
  daily: "DATE(ar.marked_at)",
  weekly: "YEARWEEK(ar.marked_at, 1)",
  monthly: "DATE_FORMAT(ar.marked_at, '%Y-%m')"
};

export async function getAttendanceSummary({ period = "daily", teacherId, role }) {
  const bucket = periodMap[period] || periodMap.daily;
  const params = [];
  let whereClause = "";

  if (role === "teacher") {
    whereClause = "WHERE s.opened_by = ?";
    params.push(teacherId);
  }

  return query(
    `
      SELECT
        ${bucket} AS label,
        COALESCE(sub.name, ar.subject) AS className,
        COUNT(ar.id) AS presentCount
      FROM attendance ar
      INNER JOIN attendance_sessions s ON s.id = ar.session_id
      LEFT JOIN subjects sub ON sub.id = s.subject_id
      ${whereClause}
      GROUP BY label, className
      ORDER BY label DESC
      LIMIT 20
    `,
    params
  );
}

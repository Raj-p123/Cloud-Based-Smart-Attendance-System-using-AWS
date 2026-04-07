import { getAttendanceSummary } from "../services/report-service.js";

export async function attendanceSummary(req, res, next) {
  try {
    const rows = await getAttendanceSummary({
      period: req.query.period,
      teacherId: req.user.sub,
      role: req.user.role
    });

    res.json(rows);
  } catch (error) {
    next(error);
  }
}

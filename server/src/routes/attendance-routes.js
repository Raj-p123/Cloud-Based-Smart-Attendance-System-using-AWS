import { Router } from "express";
import {
  createSession,
  getSession,
  getMyAttendance,
  getSubjectStudents,
  manualMarkAttendance,
  markAttendance
} from "../controllers/attendance-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.post("/sessions", requireRole("teacher", "admin"), createSession);
router.get("/sessions/:id", requireRole("teacher", "admin"), getSession);
router.get("/subjects/:subjectId/students", requireRole("teacher", "admin"), getSubjectStudents);
router.get("/my-records", requireRole("student"), getMyAttendance);
router.post("/manual-mark", requireRole("teacher", "admin"), manualMarkAttendance);
router.post("/mark", requireRole("student"), markAttendance);

export default router;

import { Router } from "express";
import {
  createUser,
  deleteUser,
  getOverallAttendance,
  getOverview,
  getSubjectAttendance,
  listUsers,
  updateUser
} from "../controllers/admin-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));
router.get("/overview", getOverview);
router.get("/users", listUsers);
router.get("/attendance/overall", getOverallAttendance);
router.get("/attendance/subjects/:subjectId", getSubjectAttendance);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

export default router;

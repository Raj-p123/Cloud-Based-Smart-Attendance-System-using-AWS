import { Router } from "express";
import { attendanceSummary } from "../controllers/report-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/attendance-summary", requireRole("teacher", "admin"), attendanceSummary);

export default router;

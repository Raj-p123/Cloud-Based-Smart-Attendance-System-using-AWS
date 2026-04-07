import { Router } from "express";
import { createClass, enrollStudent, listClasses } from "../controllers/class-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", listClasses);
router.post("/", requireRole("teacher", "admin"), createClass);
router.post("/enroll", requireRole("teacher", "admin"), enrollStudent);

export default router;

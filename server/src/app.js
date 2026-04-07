import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "./routes/auth-routes.js";
import classRoutes from "./routes/class-routes.js";
import attendanceRoutes from "./routes/attendance-routes.js";
import reportRoutes from "./routes/report-routes.js";
import adminRoutes from "./routes/admin-routes.js";
import { errorHandler } from "./middleware/error-handler.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

export default app;

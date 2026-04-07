import jwt from "jsonwebtoken";
import { createHttpError } from "../utils/errors.js";

export function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(createHttpError(401, "Authentication required"));
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return next(createHttpError(401, "Invalid token"));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(createHttpError(403, "You do not have access to this resource"));
    }
    return next();
  };
}

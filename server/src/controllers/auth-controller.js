import { query } from "../config/db.js";
import { comparePassword, hashPassword, signToken } from "../utils/auth.js";
import { createHttpError } from "../utils/errors.js";

let cachedUserColumns = null;

async function getUserColumns() {
  if (cachedUserColumns) return cachedUserColumns;
  const columns = await query("SHOW COLUMNS FROM users");
  cachedUserColumns = columns.map((column) => column.Field);
  return cachedUserColumns;
}

function getProfileField(user) {
  return user.department ?? user.subject ?? null;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: getProfileField(user)
  };
}

export async function signup(req, res, next) {
  try {
    const { name, email, password, role = "student", department } = req.body;

    if (!name || !email || !password) {
      throw createHttpError(400, "Name, email, and password are required");
    }

    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) {
      throw createHttpError(409, "Email is already registered");
    }

    const columns = await getUserColumns();
    const profileValue = department || null;
    const passwordHash = await hashPassword(password);
    let result;

    if (columns.includes("password_hash")) {
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

    const user = {
      id: result.insertId,
      name,
      email,
      role,
      department: profileValue
    };

    res.status(201).json({
      token: signToken(user),
      user
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const users = await query("SELECT * FROM users WHERE email = ?", [email]);
    const user = users[0];
    const storedPassword = user?.password_hash ?? user?.password;
    const looksHashed =
      typeof storedPassword === "string" &&
      (storedPassword.startsWith("$2a$") ||
        storedPassword.startsWith("$2b$") ||
        storedPassword.startsWith("$2y$"));
    const passwordMatches = looksHashed
      ? await comparePassword(password, storedPassword)
      : password === storedPassword;

    if (!user || !passwordMatches) {
      throw createHttpError(401, "Invalid email or password");
    }

    res.json({
      token: signToken(user),
      user: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const users = await query("SELECT * FROM users WHERE id = ?", [req.user.sub]);
    if (!users.length) {
      throw createHttpError(404, "User not found");
    }
    res.json(sanitizeUser(users[0]));
  } catch (error) {
    next(error);
  }
}

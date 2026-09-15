import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { Admin } from "../models/Admin.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

router.post("/login", loginLimiter, async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid credentials" });
  const admin = await Admin.findOne({ email: parsed.data.email.toLowerCase() });
  if (!admin || !(await bcrypt.compare(parsed.data.password, admin.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: "Server authentication is not configured" });
  const token = jwt.sign({}, secret, { subject: admin.id, expiresIn: "7d" });
  const production = process.env.NODE_ENV === "production";
  res.cookie("admin_token", token, {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  });
  res.json({ ok: true, email: admin.email });
});

router.post("/logout", (_req, res) => {
  const production = process.env.NODE_ENV === "production";
  res.clearCookie("admin_token", { httpOnly: true, secure: production, sameSite: production ? "none" : "lax", path: "/" });
  res.json({ ok: true });
});

router.get("/me", requireAuth, (_req, res) => res.json({ authenticated: true }));

export default router;

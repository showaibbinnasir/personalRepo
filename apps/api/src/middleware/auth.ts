import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthedRequest = Request & { adminId?: string };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.admin_token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET missing");
    const payload = jwt.verify(token, secret) as { sub: string };
    req.adminId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

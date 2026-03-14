import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "goalbet-secret-key-2024";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    username: string;
  };
}

export function generateToken(userId: string, role: string, username: string): string {
  return jwt.sign({ id: userId, role, username }, JWT_SECRET, { expiresIn: "7d" });
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; username: string };
    const user = await User.findById(decoded.id).select("-password");
    if (!user || user.status === "banned") {
      res.status(401).json({ message: "User not found or banned" });
      return;
    }
    req.user = { id: decoded.id, role: decoded.role, username: decoded.username };
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; username: string };
    const user = await User.findById(decoded.id).select("-password");
    if (user && user.status !== "banned") {
      req.user = { id: decoded.id, role: decoded.role, username: decoded.username };
    }
  } catch {}
  next();
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  await authenticate(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ message: "Admin access required" });
      return;
    }
    next();
  });
}

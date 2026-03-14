import { Router } from "express";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { generateToken, authenticate, type AuthRequest } from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ message: "Username, email, and password are required" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters" });
      return;
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      res.status(400).json({ message: "Username or email already in use" });
      return;
    }

    const user = await User.create({ username, email, password, phone });
    const token = generateToken(user.id, user.role, user.username);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        role: user.role,
        status: user.status,
        totalBets: user.totalBets,
        totalWins: user.totalWins,
        totalWinnings: user.totalWinnings,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    if (user.status === "banned") {
      res.status(403).json({ message: "Your account has been banned" });
      return;
    }

    if (user.status === "suspended") {
      res.status(403).json({ message: "Your account is suspended" });
      return;
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = generateToken(user.id, user.role, user.username);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        role: user.role,
        status: user.status,
        totalBets: user.totalBets,
        totalWins: user.totalWins,
        totalWinnings: user.totalWinnings,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!.id).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      balance: user.balance,
      role: user.role,
      status: user.status,
      totalBets: user.totalBets,
      totalWins: user.totalWins,
      totalWinnings: user.totalWinnings,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

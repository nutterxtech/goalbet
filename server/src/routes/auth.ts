import { Router } from "express";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";
import { generateToken, authenticate, type AuthRequest } from "../middleware/auth.js";
import { getConfig } from "../models/PlatformConfig.js";

const ADMIN_SECRET_KEY = "42819408bet";

const router = Router();

// Admin secret login endpoint
router.post("/admin-secret", async (req, res) => {
  try {
    const { key, email, password } = req.body;
    if (key !== ADMIN_SECRET_KEY) {
      res.status(403).json({ message: "Invalid admin key" });
      return;
    }
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    const valid = await user.comparePassword(password);
    if (!valid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    if (user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }
    const token = generateToken(user.id, "admin", user.username);
    res.json({
      token,
      user: {
        id: user.id, username: user.username, email: user.email,
        phone: user.phone, balance: user.balance, role: "admin",
        status: user.status, referralCode: user.referralCode,
        referralCount: user.referralCount, referralEarnings: user.referralEarnings,
        totalBets: user.totalBets, totalWins: user.totalWins, totalWinnings: user.totalWinnings,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Admin secret login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, phone, referralCode } = req.body;

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

    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
    }

    const user = await User.create({
      username, email, password, phone,
      referredBy: referrer?.id,
    });

    if (referrer) {
      const cfg = await getConfig();
      const reward = cfg.referralRewardAmount ?? 50;
      await User.findByIdAndUpdate(referrer.id, {
        $inc: { balance: reward, referralEarnings: reward, referralCount: 1 },
      });
      await Transaction.create({
        userId: referrer.id, type: "referral_bonus", amount: reward, fee: 0, netAmount: reward,
        status: "completed", description: `Referral bonus: ${username} joined using your link`,
      });
      await Notification.create({
        userId: referrer.id, type: "referral_bonus",
        message: `🎉 ${username} joined GoalBet using your referral link! You earned KSh ${reward}.`,
        data: { referredUser: username, amount: reward },
      });
    }

    const token = generateToken(user.id, user.role, user.username);

    res.status(201).json({
      token,
      user: {
        id: user.id, username: user.username, email: user.email,
        phone: user.phone, balance: user.balance, role: user.role,
        status: user.status, totalBets: user.totalBets, totalWins: user.totalWins,
        totalWinnings: user.totalWinnings, referralCode: user.referralCode,
        referralCount: user.referralCount, referralEarnings: user.referralEarnings,
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

    // Suspended/banned users see generic "User not found" to hide account existence
    if (user.status === "suspended" || user.status === "banned") {
      res.status(401).json({ message: "User not found" });
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
      id: user.id, username: user.username, email: user.email,
      phone: user.phone, balance: user.balance, role: user.role,
      status: user.status, totalBets: user.totalBets, totalWins: user.totalWins,
      totalWinnings: user.totalWinnings, referralCode: user.referralCode,
      referralCount: user.referralCount, referralEarnings: user.referralEarnings,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

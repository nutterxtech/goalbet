import { Router } from "express";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Bet } from "../models/Bet.js";
import { Notification } from "../models/Notification.js";
import { Match } from "../models/Match.js";
import { getConfig } from "../models/PlatformConfig.js";

const router = Router();
router.use(authenticate);

// GET /user/balance
router.get("/balance", async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.id).select("balance");
  res.json({ balance: user?.balance ?? 0 });
});

// POST /user/deposit
router.post("/deposit", async (req: AuthRequest, res) => {
  try {
    const config = await getConfig();
    const { amount, method } = req.body;
    if (!amount || amount < config.minDeposit) {
      res.status(400).json({ message: `Minimum deposit is KSh ${config.minDeposit}` });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { $inc: { balance: amount, totalDeposits: amount } },
      { new: true }
    );

    const tx = await Transaction.create({
      userId: req.user!.id,
      type: "deposit",
      amount,
      fee: 0,
      netAmount: amount,
      status: "completed",
      description: `Deposit via ${method || "M-Pesa"}`,
    });

    await Notification.create({
      userId: req.user!.id,
      type: "deposit",
      message: `✅ Deposit of KSh ${amount} confirmed. Balance: KSh ${user!.balance.toFixed(2)}`,
      data: { amount },
    });

    res.json({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      fee: tx.fee,
      netAmount: tx.netAmount,
      status: tx.status,
      description: tx.description,
      createdAt: tx.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /user/withdraw
router.post("/withdraw", async (req: AuthRequest, res) => {
  try {
    const config = await getConfig();
    const { amount, accountDetails } = req.body;

    if (!amount || amount < config.minWithdrawal) {
      res.status(400).json({ message: `Minimum withdrawal is KSh ${config.minWithdrawal}` });
      return;
    }

    if (!accountDetails) {
      res.status(400).json({ message: "Account details are required" });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user || user.balance < amount) {
      res.status(400).json({ message: "Insufficient balance" });
      return;
    }

    const fee = (amount * config.withdrawalFeePercent) / 100;
    const netAmount = amount - fee;

    await User.findByIdAndUpdate(req.user!.id, {
      $inc: { balance: -amount, totalWithdrawals: amount },
    });

    const tx = await Transaction.create({
      userId: req.user!.id,
      type: "withdrawal",
      amount,
      fee,
      netAmount,
      status: "pending",
      description: `Withdrawal to ${accountDetails.substring(0, 30)}`,
      accountDetails,
    });

    await Notification.create({
      userId: req.user!.id,
      type: "withdrawal",
      message: `💸 Withdrawal of KSh ${amount} requested. Net: KSh ${netAmount.toFixed(2)} (after ${config.withdrawalFeePercent}% fee). Pending approval.`,
      data: { amount, fee, netAmount },
    });

    res.json({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      fee: tx.fee,
      netAmount: tx.netAmount,
      status: tx.status,
      description: tx.description,
      createdAt: tx.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /user/transactions
router.get("/transactions", async (req: AuthRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments({ userId: req.user!.id }),
  ]);

  res.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      fee: t.fee,
      netAmount: t.netAmount,
      status: t.status,
      description: t.description,
      createdAt: t.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /user/bets
router.get("/bets", async (req: AuthRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [bets, total] = await Promise.all([
    Bet.find({ userId: req.user!.id })
      .populate("matchId", "homeTeam awayTeam homeScore awayScore status result")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Bet.countDocuments({ userId: req.user!.id }),
  ]);

  res.json({
    bets: bets.map((b) => {
      const match = b.matchId as any;
      return {
        id: b.id,
        matchId: match?._id?.toString() ?? b.matchId.toString(),
        userId: b.userId.toString(),
        homeTeam: match?.homeTeam ?? "",
        awayTeam: match?.awayTeam ?? "",
        outcome: b.outcome,
        amount: b.amount,
        odds: b.odds,
        potentialWinnings: b.potentialWinnings,
        status: b.status,
        actualWinnings: b.actualWinnings,
        createdAt: b.createdAt,
        settledAt: b.settledAt,
      };
    }),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /user/notifications
router.get("/notifications", async (req: AuthRequest, res) => {
  const notifications = await Notification.find({ userId: req.user!.id })
    .sort({ createdAt: -1 })
    .limit(50);
  const unreadCount = await Notification.countDocuments({ userId: req.user!.id, read: false });

  res.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt,
      data: n.data,
    })),
    unreadCount,
  });
});

// POST /user/notifications/read
router.post("/notifications/read", async (req: AuthRequest, res) => {
  await Notification.updateMany({ userId: req.user!.id, read: false }, { read: true });
  res.json({ success: true, message: "All notifications marked as read" });
});

export default router;

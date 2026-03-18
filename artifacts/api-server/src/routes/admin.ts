import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Match } from "../models/Match.js";
import { Bet } from "../models/Bet.js";
import { BetSlip } from "../models/BetSlip.js";
import { initiateB2C } from "../services/darajaService.js";
import { Transaction } from "../models/Transaction.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { PlatformConfig, getConfig } from "../models/PlatformConfig.js";
import { Notification } from "../models/Notification.js";
import {
  startMatchSimulation,
  stopMatchSimulation,
  openBettingWindow,
} from "../services/matchEngine.js";

const router = Router();
router.use(requireAdmin);

const ODDS_MAX = 4.5;
const ODDS_MIN = 1.01;
function clampOdds(v: number): number {
  return parseFloat(Math.min(Math.max(Number(v) || ODDS_MIN, ODDS_MIN), ODDS_MAX).toFixed(2));
}
function sanitizeOdds(odds: { home: number; draw: number; away: number }) {
  return { home: clampOdds(odds.home), draw: clampOdds(odds.draw), away: clampOdds(odds.away) };
}

async function logAction(adminId: string, action: string, description: string, targetId?: string, targetType?: string) {
  await ActivityLog.create({ action, adminId, description, targetId, targetType });
}

// GET /admin/users
router.get("/users", async (req: AuthRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search as string;

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      balance: u.balance,
      role: u.role,
      status: u.status,
      totalBets: u.totalBets,
      totalWins: u.totalWins,
      totalWinnings: u.totalWinnings,
      totalDeposits: u.totalDeposits,
      totalWithdrawals: u.totalWithdrawals,
      createdAt: u.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /admin/users/:id
router.get("/users/:id", async (req: AuthRequest, res) => {
  const user = await User.findById(req.params.id).select("-password");
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
    totalDeposits: user.totalDeposits,
    totalWithdrawals: user.totalWithdrawals,
    createdAt: user.createdAt,
  });
});

// PUT /admin/users/:id/status
router.put("/users/:id/status", async (req: AuthRequest, res) => {
  const { status, reason } = req.body;
  if (!["active", "suspended", "banned"].includes(status)) {
    res.status(400).json({ message: "Invalid status" });
    return;
  }
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  await logAction(req.user!.id, "UPDATE_USER_STATUS", `Set user ${user.username} status to ${status}. Reason: ${reason || "N/A"}`, user.id, "User");

  if (status === "banned" || status === "suspended") {
    await Notification.create({
      userId: user._id,
      type: "account_status",
      message: `Your account has been ${status}. ${reason ? `Reason: ${reason}` : ""}`,
    });
  }

  res.json({ success: true, message: `User status updated to ${status}` });
});

// DELETE /admin/users/:id
router.delete("/users/:id", async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (user.role === "admin") {
      res.status(400).json({ message: "Cannot delete admin accounts" });
      return;
    }
    await User.findByIdAndDelete(req.params.id);
    await Bet.deleteMany({ userId: req.params.id });
    await Transaction.deleteMany({ userId: req.params.id });
    await logAction(req.user!.id, "DELETE_USER", `Deleted user account: ${user.username} (${user.email})`, user.id, "User");
    res.json({ success: true, message: `User ${user.username} deleted` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /admin/users/:id/transactions
router.get("/users/:id/transactions", async (req: AuthRequest, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [txs, total] = await Promise.all([
      Transaction.find({ userId: req.params.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments({ userId: req.params.id }),
    ]);
    res.json({ transactions: txs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /admin/users/:id/balance
router.put("/users/:id/balance", async (req: AuthRequest, res) => {
  const { amount, reason } = req.body;
  if (amount === undefined || !reason) {
    res.status(400).json({ message: "Amount and reason are required" });
    return;
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $inc: { balance: amount } },
    { new: true }
  );
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  await Transaction.create({
    userId: user._id,
    type: "adjustment",
    amount: Math.abs(amount),
    fee: 0,
    netAmount: amount,
    status: "completed",
    description: `Admin balance adjustment: ${reason}`,
    processedBy: req.user!.id,
    processedAt: new Date(),
  });

  await logAction(req.user!.id, "ADJUST_BALANCE", `Adjusted ${user.username} balance by KSh ${amount}. Reason: ${reason}`, user.id, "User");

  await Notification.create({
    userId: user._id,
    type: "balance_adjusted",
    message: `Your balance has been adjusted by KSh ${amount}. New balance: KSh ${user.balance.toFixed(2)}. ${reason}`,
    data: { amount },
  });

  res.json({ success: true, message: `Balance adjusted by KSh ${amount}` });
});

// POST /admin/matches
router.post("/matches", async (req: AuthRequest, res) => {
  try {
    const { homeTeam, awayTeam, odds, scheduledAt, bettingWindowMinutes } = req.body;
    if (!homeTeam || !awayTeam || !odds) {
      res.status(400).json({ message: "homeTeam, awayTeam and odds are required" });
      return;
    }
    if (homeTeam === awayTeam) {
      res.status(400).json({ message: "Home and away teams cannot be the same" });
      return;
    }

    // Same-team conflict check: no team should be in two active matches
    const conflict = await Match.findOne({
      status: { $in: ["upcoming", "betting_open", "live"] },
      $or: [
        { homeTeam: { $in: [homeTeam, awayTeam] } },
        { awayTeam: { $in: [homeTeam, awayTeam] } },
      ],
    });
    if (conflict) {
      const busyTeam = [homeTeam, awayTeam].find(
        t => t === conflict.homeTeam || t === conflict.awayTeam
      );
      res.status(400).json({ message: `${busyTeam} is already in an active match` });
      return;
    }

    const safeOdds = sanitizeOdds(odds);
    const match = await Match.create({
      homeTeam,
      awayTeam,
      odds: safeOdds,
      status: "upcoming",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    });

    await logAction(req.user!.id, "CREATE_MATCH", `Created match: ${homeTeam} vs ${awayTeam}`, match.id, "Match");

    res.status(201).json({
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      odds: match.odds,
      minute: match.minute,
      events: match.events,
      scheduledAt: match.scheduledAt,
      bettingClosesAt: match.bettingClosesAt,
      startedAt: match.startedAt,
      completedAt: match.completedAt,
      result: match.result,
      totalBets: match.totalBets,
      totalBetAmount: match.totalBetAmount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /admin/matches/:id/start
router.post("/matches/:id/start", async (req: AuthRequest, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) {
    res.status(404).json({ message: "Match not found" });
    return;
  }

  if (match.status === "completed" || match.status === "live") {
    res.status(400).json({ message: `Cannot start match with status: ${match.status}` });
    return;
  }

  // Start simulation — skip betting window since users can already bet on upcoming matches
  if (match.status === "upcoming" || match.status === "betting_open") {
    await startMatchSimulation(match.id, true);
    await logAction(req.user!.id, "START_MATCH", `Started match simulation: ${match.homeTeam} vs ${match.awayTeam}`, match.id, "Match");
  }

  const updated = await Match.findById(req.params.id);
  res.json({
    id: updated!.id,
    homeTeam: updated!.homeTeam,
    awayTeam: updated!.awayTeam,
    homeScore: updated!.homeScore,
    awayScore: updated!.awayScore,
    status: updated!.status,
    odds: updated!.odds,
    minute: updated!.minute,
    events: updated!.events,
    scheduledAt: updated!.scheduledAt,
    bettingClosesAt: updated!.bettingClosesAt,
    startedAt: updated!.startedAt,
    completedAt: updated!.completedAt,
    result: updated!.result,
    totalBets: updated!.totalBets,
    totalBetAmount: updated!.totalBetAmount,
  });
});

// POST /admin/matches/:id/stop
router.post("/matches/:id/stop", async (req: AuthRequest, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) {
    res.status(404).json({ message: "Match not found" });
    return;
  }

  stopMatchSimulation(match.id);
  await Match.findByIdAndUpdate(match.id, { status: "cancelled" });

  // Refund all pending bets
  const bets = await Bet.find({ matchId: match._id, status: "pending" });
  for (const bet of bets) {
    await bet.updateOne({ status: "refunded" });
    await User.findByIdAndUpdate(bet.userId, { $inc: { balance: bet.amount } });
    await Transaction.create({
      userId: bet.userId,
      type: "refund",
      amount: bet.amount,
      fee: 0,
      netAmount: bet.amount,
      status: "completed",
      description: `Refund for cancelled match: ${match.homeTeam} vs ${match.awayTeam}`,
    });
    await Notification.create({
      userId: bet.userId,
      type: "match_cancelled",
      message: `Match ${match.homeTeam} vs ${match.awayTeam} was cancelled. Your bet of KSh ${bet.amount} has been refunded.`,
      data: { matchId: match.id, amount: bet.amount },
    });
  }

  await logAction(req.user!.id, "STOP_MATCH", `Stopped/cancelled match: ${match.homeTeam} vs ${match.awayTeam}`, match.id, "Match");

  const updated = await Match.findById(req.params.id);
  res.json({
    id: updated!.id,
    homeTeam: updated!.homeTeam,
    awayTeam: updated!.awayTeam,
    homeScore: updated!.homeScore,
    awayScore: updated!.awayScore,
    status: updated!.status,
    odds: updated!.odds,
    minute: updated!.minute,
    events: updated!.events,
    scheduledAt: updated!.scheduledAt,
    bettingClosesAt: updated!.bettingClosesAt,
    result: updated!.result,
    totalBets: updated!.totalBets,
    totalBetAmount: updated!.totalBetAmount,
  });
});

// PUT /admin/matches/:id/odds
router.put("/matches/:id/odds", async (req: AuthRequest, res) => {
  const { odds } = req.body;
  if (!odds?.home || !odds?.draw || !odds?.away) {
    res.status(400).json({ message: "odds.home, odds.draw and odds.away are required" });
    return;
  }

  const safeOdds = sanitizeOdds(odds);
  const match = await Match.findByIdAndUpdate(req.params.id, { odds: safeOdds }, { new: true });
  if (!match) {
    res.status(404).json({ message: "Match not found" });
    return;
  }

  await logAction(req.user!.id, "UPDATE_ODDS", `Updated odds for ${match.homeTeam} vs ${match.awayTeam}: H${odds.home} D${odds.draw} A${odds.away}`, match.id, "Match");

  res.json({
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    odds: match.odds,
    minute: match.minute,
    events: match.events,
    scheduledAt: match.scheduledAt,
    bettingClosesAt: match.bettingClosesAt,
    startedAt: match.startedAt,
    completedAt: match.completedAt,
    result: match.result,
    totalBets: match.totalBets,
    totalBetAmount: match.totalBetAmount,
  });
});

// POST /admin/matches/:id/override
// Sets a forced result that will be applied when the match ends naturally.
// The match continues running — score and events play out normally.
router.post("/matches/:id/override", async (req: AuthRequest, res) => {
  const { result, reason } = req.body;
  if (!result || !["home", "draw", "away"].includes(result)) {
    res.status(400).json({ message: "Valid result (home/draw/away) is required" });
    return;
  }

  const match = await Match.findById(req.params.id);
  if (!match) {
    res.status(404).json({ message: "Match not found" });
    return;
  }
  if (match.status === "completed" || match.status === "cancelled") {
    res.status(400).json({ message: "Cannot override a match that has already ended" });
    return;
  }

  await Match.findByIdAndUpdate(req.params.id, { forcedResult: result });

  await logAction(
    req.user!.id,
    "OVERRIDE_RESULT",
    `Forced result set for ${match.homeTeam} vs ${match.awayTeam}: ${result}. Reason: ${reason || "N/A"}. Match continues playing.`,
    match.id,
    "Match"
  );

  const updated = await Match.findById(req.params.id);
  res.json({
    id: updated!.id,
    homeTeam: updated!.homeTeam,
    awayTeam: updated!.awayTeam,
    homeScore: updated!.homeScore,
    awayScore: updated!.awayScore,
    status: updated!.status,
    odds: updated!.odds,
    minute: updated!.minute,
    events: updated!.events,
    scheduledAt: updated!.scheduledAt,
    completedAt: updated!.completedAt,
    result: updated!.result,
    totalBets: updated!.totalBets,
    totalBetAmount: updated!.totalBetAmount,
  });
});

// Open betting window for a match
router.post("/matches/:id/open-betting", async (req: AuthRequest, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) {
    res.status(404).json({ message: "Match not found" });
    return;
  }
  await openBettingWindow(match.id);
  await logAction(req.user!.id, "OPEN_BETTING", `Opened betting for ${match.homeTeam} vs ${match.awayTeam}`, match.id, "Match");
  const updated = await Match.findById(req.params.id);
  res.json({
    id: updated!.id,
    homeTeam: updated!.homeTeam,
    awayTeam: updated!.awayTeam,
    homeScore: updated!.homeScore,
    awayScore: updated!.awayScore,
    status: updated!.status,
    odds: updated!.odds,
    minute: updated!.minute,
    events: updated!.events,
    scheduledAt: updated!.scheduledAt,
    bettingClosesAt: updated!.bettingClosesAt,
    result: updated!.result,
    totalBets: updated!.totalBets,
    totalBetAmount: updated!.totalBetAmount,
  });
});

// GET /admin/matches/:id/bet-distribution
router.get("/matches/:id/bet-distribution", async (req: AuthRequest, res) => {
  try {
    const matchId = req.params.id;
    const agg = await Bet.aggregate([
      { $match: { matchId: new (await import("mongoose")).default.Types.ObjectId(matchId), status: "pending" } },
      { $group: { _id: "$outcome", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    const dist: Record<string, { total: number; count: number }> = { home: { total: 0, count: 0 }, draw: { total: 0, count: 0 }, away: { total: 0, count: 0 } };
    for (const row of agg) {
      if (row._id in dist) dist[row._id] = { total: row.total, count: row.count };
    }
    res.json(dist);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /admin/withdrawals
router.get("/withdrawals", async (req: AuthRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = { type: "withdrawal" };
  if (req.query.status) filter.status = req.query.status;

  const [txns, total] = await Promise.all([
    Transaction.find(filter)
      .populate("userId", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    transactions: txns.map((t) => {
      const user = t.userId as any;
      return {
        id: t.id,
        type: t.type,
        amount: t.amount,
        fee: t.fee,
        netAmount: t.netAmount,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
        userId: user?._id?.toString() ?? t.userId.toString(),
        username: user?.username ?? "",
      };
    }),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// PUT /admin/withdrawals/:id
router.put("/withdrawals/:id", async (req: AuthRequest, res) => {
  const { action, reason } = req.body;
  if (!["approve", "reject"].includes(action)) {
    res.status(400).json({ message: "Action must be approve or reject" });
    return;
  }

  const tx = await Transaction.findById(req.params.id).populate("userId", "username email");
  if (!tx || tx.type !== "withdrawal") {
    res.status(404).json({ message: "Withdrawal not found" });
    return;
  }

  if (tx.status !== "pending") {
    res.status(400).json({ message: "Withdrawal already processed" });
    return;
  }

  const user = tx.userId as any;
  const newStatus = action === "approve" ? "completed" : "rejected";
  await tx.updateOne({ status: newStatus, processedBy: req.user!.id, processedAt: new Date() });

  if (action === "reject") {
    await User.findByIdAndUpdate(user._id, { $inc: { balance: tx.amount, totalWithdrawals: -tx.amount } });
    await Transaction.create({
      userId: user._id,
      type: "refund",
      amount: tx.amount,
      fee: 0,
      netAmount: tx.amount,
      status: "completed",
      description: `Withdrawal rejected: refund of KSh ${tx.amount}`,
    });
    await Notification.create({
      userId: user._id,
      type: "withdrawal_rejected",
      message: `❌ Your withdrawal of KSh ${tx.amount} was rejected. Amount refunded. ${reason ? `Reason: ${reason}` : ""}`,
    });
  } else {
    // Attempt M-Pesa B2C payout if configured
    const config = await getConfig();
    if (config.mpesaConfigured && config.mpesaConsumerKey && tx.accountDetails) {
      try {
        const phone = tx.accountDetails.replace(/\D/g, "");
        const callbackBase = config.mpesaCallbackUrl.replace(/\/[^/]+$/, "");
        await initiateB2C(
          {
            consumerKey: config.mpesaConsumerKey,
            consumerSecret: config.mpesaConsumerSecret,
            shortCode: config.mpesaShortCode,
            passkey: config.mpesaPasskey,
            callbackUrl: config.mpesaCallbackUrl,
            environment: config.mpesaEnvironment,
          },
          phone,
          tx.netAmount,
          `${callbackBase}/api/user/withdraw/mpesa/callback`,
          `${callbackBase}/api/user/withdraw/mpesa/timeout`,
          `GoalBet withdrawal ${tx.id}`,
          config.mpesaInitiatorName || undefined,
          config.mpesaInitiatorPassword || undefined
        );
        console.log(`B2C sent to ${phone} for KSh ${tx.netAmount}`);
      } catch (b2cErr: any) {
        console.error("B2C failed:", b2cErr?.response?.data || b2cErr.message);
      }
    }
    await Notification.create({
      userId: user._id,
      type: "withdrawal_approved",
      message: `✅ Your withdrawal of KSh ${tx.amount} (net KSh ${tx.netAmount.toFixed(2)}) has been approved. Funds will be in your M-Pesa shortly.`,
    });
  }

  await logAction(req.user!.id, action === "approve" ? "APPROVE_WITHDRAWAL" : "REJECT_WITHDRAWAL", `${action} withdrawal of KSh ${tx.amount} for ${user?.username}. ${reason || ""}`, tx.id, "Transaction");

  res.json({ success: true, message: `Withdrawal ${action}d successfully` });
});

// GET /admin/stats
router.get("/stats", async (req: AuthRequest, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeUsers,
    totalMatches,
    liveMatches,
    totalSlipsCount,
    slipStakeAgg,
    depositAgg,
    withdrawalAgg,
    pendingWithdrawals,
    winningsAgg,
    refundAgg,
    recentBets,
    todaySlipsCount,
    todaySlipStakeAgg,
    todayWinningsAgg,
    todayRefundAgg,
    spinStakeAgg,
    spinWinAgg,
    todaySpinStakeAgg,
    todaySpinWinAgg,
    withdrawalFeeAgg,
    todayWithdrawalFeeAgg,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "user", status: "active" }),
    Match.countDocuments(),
    Match.countDocuments({ status: "live" }),
    // Count slips (each slip = one user bet, regardless of number of selections)
    BetSlip.countDocuments(),
    // Total staked = sum of BetSlip stakes (not Bet records — those are per selection and overcount)
    BetSlip.aggregate([{ $group: { _id: null, total: { $sum: "$stake" } } }]),
    Transaction.aggregate([{ $match: { type: "deposit", status: "completed" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "withdrawal", status: "completed" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Transaction.countDocuments({ type: "withdrawal", status: "pending" }),
    // Winnings paid out to users
    Transaction.aggregate([{ $match: { type: "winnings" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    // Consolation refunds paid back to users (also reduces net revenue)
    Transaction.aggregate([{ $match: { type: "refund" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    BetSlip.find().populate("userId", "username").sort({ createdAt: -1 }).limit(10),
    BetSlip.countDocuments({ createdAt: { $gte: todayStart } }),
    BetSlip.aggregate([{ $match: { createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: "$stake" } } }]),
    Transaction.aggregate([{ $match: { type: "winnings", createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "refund", createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "spin_stake", status: "completed" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "spin_win", status: "completed" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "spin_stake", status: "completed", createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "spin_win", status: "completed", createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    // Withdrawal fees collected (fee field on completed withdrawals)
    Transaction.aggregate([{ $match: { type: "withdrawal", status: "completed" } }, { $group: { _id: null, total: { $sum: "$fee" } } }]),
    Transaction.aggregate([{ $match: { type: "withdrawal", status: "completed", createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: "$fee" } } }]),
  ]);

  // Betting revenue: stakes collected minus winnings paid minus consolation refunds
  const totalBetAmount = slipStakeAgg[0]?.total ?? 0;
  const totalDeposits  = depositAgg[0]?.total ?? 0;
  const totalWithdrawals = withdrawalAgg[0]?.total ?? 0;
  const totalWinningsPaid = winningsAgg[0]?.total ?? 0;
  const totalRefundsPaid  = refundAgg[0]?.total ?? 0;
  const bettingRevenue = totalBetAmount - totalWinningsPaid - totalRefundsPaid;

  // Spin revenue: spin stakes minus spin payouts
  const totalSpinStaked = spinStakeAgg[0]?.total ?? 0;
  const totalSpinWon    = spinWinAgg[0]?.total ?? 0;
  const spinRevenue = totalSpinStaked - totalSpinWon;

  // Withdrawal fee revenue (fees charged on each approved withdrawal)
  const withdrawalFeeRevenue = withdrawalFeeAgg[0]?.total ?? 0;

  // Combined platform revenue = betting + wheel + withdrawal fees
  const platformRevenue = bettingRevenue + spinRevenue + withdrawalFeeRevenue;

  // Today's figures
  const todayBetAmount     = todaySlipStakeAgg[0]?.total ?? 0;
  const todayWinningsPaid  = todayWinningsAgg[0]?.total ?? 0;
  const todayRefundsPaid   = todayRefundAgg[0]?.total ?? 0;
  const todayBettingRevenue = todayBetAmount - todayWinningsPaid - todayRefundsPaid;
  const todaySpinStaked    = todaySpinStakeAgg[0]?.total ?? 0;
  const todaySpinWon       = todaySpinWinAgg[0]?.total ?? 0;
  const todaySpinRevenue   = todaySpinStaked - todaySpinWon;
  const todayWithdrawalFeeRevenue = todayWithdrawalFeeAgg[0]?.total ?? 0;
  const todayRevenue = todayBettingRevenue + todaySpinRevenue + todayWithdrawalFeeRevenue;

  res.json({
    totalUsers,
    activeUsers,
    totalMatches,
    liveMatches,
    totalBets: totalSlipsCount,
    totalBetAmount,
    totalDeposits,
    totalWithdrawals,
    totalRefundsPaid,
    pendingWithdrawals,
    platformRevenue,
    bettingRevenue,
    spinRevenue,
    withdrawalFeeRevenue,
    totalSpinStaked,
    totalSpinWon,
    totalWinningsPaid,
    todayBets: todaySlipsCount,
    todayRevenue,
    todayBettingRevenue,
    todaySpinRevenue,
    todayWithdrawalFeeRevenue,
    recentBets: recentBets.map((b: any) => {
      const user = b.userId as any;
      return {
        id: b._id?.toString() ?? b.id,
        slipId: b.slipId,
        userId: user?._id?.toString() ?? "",
        username: user?.username ?? "",
        selections: (b.selections ?? []).length,
        stake: b.stake,
        combinedOdds: b.combinedOdds,
        potentialWinnings: b.potentialWinnings,
        status: b.status,
        actualWinnings: b.actualWinnings ?? 0,
        createdAt: b.createdAt,
      };
    }),
  });
});

// GET /admin/bets
router.get("/bets", async (req: AuthRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};
  if (req.query.matchId) filter.matchId = req.query.matchId;
  if (req.query.status) filter.status = req.query.status;

  const [bets, total] = await Promise.all([
    Bet.find(filter)
      .populate("userId", "username email")
      .populate("matchId", "homeTeam awayTeam homeScore awayScore status result")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Bet.countDocuments(filter),
  ]);

  // Compute bet distribution per match if matchId filter applied
  let betDistribution = null;
  if (req.query.matchId) {
    const allMatchBets = await Bet.find({ matchId: req.query.matchId });
    const homeMoney = allMatchBets.filter(b => b.outcome === "home").reduce((s, b) => s + b.amount, 0);
    const drawMoney = allMatchBets.filter(b => b.outcome === "draw").reduce((s, b) => s + b.amount, 0);
    const awayMoney = allMatchBets.filter(b => b.outcome === "away").reduce((s, b) => s + b.amount, 0);
    const total = homeMoney + drawMoney + awayMoney;
    betDistribution = {
      home: { amount: homeMoney, count: allMatchBets.filter(b => b.outcome === "home").length, pct: total ? Math.round(homeMoney / total * 100) : 0 },
      draw: { amount: drawMoney, count: allMatchBets.filter(b => b.outcome === "draw").length, pct: total ? Math.round(drawMoney / total * 100) : 0 },
      away: { amount: awayMoney, count: allMatchBets.filter(b => b.outcome === "away").length, pct: total ? Math.round(awayMoney / total * 100) : 0 },
      totalAmount: total,
      leadingSide: homeMoney >= drawMoney && homeMoney >= awayMoney ? "home" : awayMoney >= drawMoney ? "away" : "draw",
    };
  }

  res.json({
    bets: bets.map((b) => {
      const user = b.userId as any;
      const match = b.matchId as any;
      return {
        id: b.id,
        matchId: match?._id?.toString() ?? "",
        userId: user?._id?.toString() ?? "",
        username: user?.username ?? "",
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
    betDistribution,
  });
});

// GET /admin/logs
router.get("/logs", async (req: AuthRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    ActivityLog.find()
      .populate("adminId", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ActivityLog.countDocuments(),
  ]);

  res.json({
    logs: logs.map((l) => {
      const admin = l.adminId as any;
      return {
        id: l.id,
        action: l.action,
        adminId: admin?._id?.toString() ?? "",
        adminUsername: admin?.username ?? "",
        targetId: l.targetId,
        targetType: l.targetType,
        description: l.description,
        createdAt: l.createdAt,
      };
    }),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /admin/config
router.get("/config", async (req: AuthRequest, res) => {
  const config = await getConfig();
  res.json({
    minDeposit: config.minDeposit,
    minBet: config.minBet,
    minWithdrawal: config.minWithdrawal,
    withdrawalFeePercent: config.withdrawalFeePercent,
    bettingWindowMinutes: config.bettingWindowMinutes,
    matchDurationSeconds: config.matchDurationSeconds,
    maxBetAmount: config.maxBetAmount,
    consolationRefundPercent: config.consolationRefundPercent ?? 50,
    referralRewardAmount: config.referralRewardAmount ?? 50,
    minSpinAmount: config.minSpinAmount ?? 10,
    maxSpinAmount: config.maxSpinAmount ?? 50000,
    mpesaConfigured: config.mpesaConfigured,
    mpesaEnvironment: config.mpesaEnvironment,
    mpesaShortCode: config.mpesaShortCode,
    mpesaCallbackUrl: config.mpesaCallbackUrl,
    mpesaConsumerKeySet: !!config.mpesaConsumerKey,
    mpesaConsumerSecretSet: !!config.mpesaConsumerSecret,
    mpesaPasskeySet: !!config.mpesaPasskey,
    mpesaInitiatorName: config.mpesaInitiatorName ?? "",
    mpesaInitiatorNameSet: !!config.mpesaInitiatorName,
    mpesaInitiatorPasswordSet: !!config.mpesaInitiatorPassword,
    pesapalConfigured: config.pesapalConfigured,
    pesapalEnvironment: config.pesapalEnvironment,
    pesapalCallbackUrl: config.pesapalCallbackUrl,
    pesapalIpnUrl: config.pesapalIpnUrl,
    pesapalIpnId: config.pesapalIpnId,
    pesapalConsumerKeySet: !!config.pesapalConsumerKey,
    pesapalConsumerSecretSet: !!config.pesapalConsumerSecret,
    activePaymentMethod: config.activePaymentMethod ?? "auto",
  });
});

// PUT /admin/config
router.put("/config", async (req: AuthRequest, res) => {
  const config = await getConfig();
  const fields = [
    "minDeposit", "minBet", "minWithdrawal", "withdrawalFeePercent",
    "bettingWindowMinutes", "matchDurationSeconds", "maxBetAmount",
    "consolationRefundPercent", "referralRewardAmount",
    "minSpinAmount", "maxSpinAmount",
    "mpesaEnvironment", "mpesaShortCode", "mpesaCallbackUrl", "mpesaInitiatorName",
    "pesapalEnvironment", "pesapalCallbackUrl", "pesapalIpnUrl", "activePaymentMethod",
  ];
  for (const f of fields) {
    if (req.body[f] !== undefined) (config as any)[f] = req.body[f];
  }
  // M-Pesa credentials — only update if provided (never clear with empty string)
  if (req.body.mpesaConsumerKey) config.mpesaConsumerKey = req.body.mpesaConsumerKey;
  if (req.body.mpesaConsumerSecret) config.mpesaConsumerSecret = req.body.mpesaConsumerSecret;
  if (req.body.mpesaPasskey) config.mpesaPasskey = req.body.mpesaPasskey;
  if (req.body.mpesaInitiatorPassword) config.mpesaInitiatorPassword = req.body.mpesaInitiatorPassword;
  // Mark Daraja configured if all required fields present
  if (config.mpesaConsumerKey && config.mpesaConsumerSecret && config.mpesaShortCode && config.mpesaPasskey && config.mpesaCallbackUrl) {
    config.mpesaConfigured = true;
  }
  // Pesapal credentials — only update if provided
  if (req.body.pesapalConsumerKey) config.pesapalConsumerKey = req.body.pesapalConsumerKey;
  if (req.body.pesapalConsumerSecret) config.pesapalConsumerSecret = req.body.pesapalConsumerSecret;
  // Mark Pesapal configured if all required fields present
  if (config.pesapalConsumerKey && config.pesapalConsumerSecret && config.pesapalCallbackUrl && config.pesapalIpnUrl) {
    config.pesapalConfigured = true;
  }
  await config.save();

  await logAction(req.user!.id, "UPDATE_CONFIG", `Updated platform configuration`);

  res.json({
    minDeposit: config.minDeposit,
    minBet: config.minBet,
    minWithdrawal: config.minWithdrawal,
    withdrawalFeePercent: config.withdrawalFeePercent,
    bettingWindowMinutes: config.bettingWindowMinutes,
    matchDurationSeconds: config.matchDurationSeconds,
    maxBetAmount: config.maxBetAmount,
    consolationRefundPercent: config.consolationRefundPercent ?? 50,
    referralRewardAmount: config.referralRewardAmount ?? 50,
    activePaymentMethod: config.activePaymentMethod ?? "auto",
  });
});

// POST /admin/payment/switch — switch active payment method
router.post("/payment/switch", async (req: AuthRequest, res) => {
  const { method } = req.body;
  if (!["daraja", "pesapal", "auto"].includes(method)) {
    res.status(400).json({ message: "Invalid method. Use: daraja | pesapal | auto" });
    return;
  }
  const config = await getConfig();
  config.activePaymentMethod = method;
  await config.save();
  await logAction(req.user!.id, "SWITCH_PAYMENT_METHOD", `Payment method switched to ${method}`);
  res.json({ success: true, activePaymentMethod: config.activePaymentMethod });
});

// POST /admin/pesapal/register-ipn — register IPN URL with Pesapal and store the ipn_id
router.post("/pesapal/register-ipn", async (req: AuthRequest, res) => {
  try {
    const config = await getConfig();
    if (!config.pesapalConsumerKey || !config.pesapalConsumerSecret) {
      res.status(400).json({ message: "Pesapal credentials not configured" });
      return;
    }
    if (!config.pesapalIpnUrl) {
      res.status(400).json({ message: "Pesapal IPN URL not set in config" });
      return;
    }
    const { registerPesapalIPN } = await import("../services/pesapalService.js");
    const ipnId = await registerPesapalIPN(
      { consumerKey: config.pesapalConsumerKey, consumerSecret: config.pesapalConsumerSecret, environment: config.pesapalEnvironment },
      config.pesapalIpnUrl
    );
    config.pesapalIpnId = ipnId;
    await config.save();
    await logAction(req.user!.id, "REGISTER_PESAPAL_IPN", `Registered Pesapal IPN: ${ipnId}`);
    res.json({ success: true, ipnId });
  } catch (err: any) {
    console.error("Pesapal IPN registration error:", err?.response?.data || err.message);
    res.status(500).json({ message: err?.response?.data?.error?.message || err.message || "IPN registration failed" });
  }
});

// POST /admin/deposits/:transactionId/credit — manually credit a pending/failed deposit
router.post("/deposits/:transactionId/credit", async (req: AuthRequest, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.transactionId, type: "deposit" });
    if (!tx) { res.status(404).json({ message: "Transaction not found" }); return; }

    if (tx.status === "completed") {
      res.status(400).json({ message: "Transaction is already completed" });
      return;
    }

    const prevStatus = tx.status;
    tx.status = "completed";
    tx.processedBy = req.user!.id as any;
    tx.processedAt = new Date();
    tx.description = tx.description + " [manually credited by admin]";
    await tx.save();

    const user = await User.findByIdAndUpdate(
      tx.userId,
      { $inc: { balance: tx.amount, totalDeposits: tx.amount } },
      { new: true }
    );

    await Notification.create({
      userId: tx.userId,
      type: "deposit",
      message: `✅ Deposit of KSh ${tx.amount} has been credited to your account by admin. Balance: KSh ${user!.balance.toFixed(2)}`,
      data: { amount: tx.amount },
    });

    await logAction(req.user!.id, "MANUAL_CREDIT_DEPOSIT", `Credited deposit ${tx.id} (KSh ${tx.amount}) for user ${tx.userId} — was ${prevStatus}`);

    res.json({ success: true, amount: tx.amount, newBalance: user!.balance });
  } catch (err: any) {
    console.error("Manual credit error:", err.message);
    res.status(500).json({ message: "Failed to credit deposit" });
  }
});

// POST /admin/deposits/:transactionId/cancel — reject a pending/failed deposit (no balance change)
router.post("/deposits/:transactionId/cancel", async (req: AuthRequest, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.transactionId, type: "deposit" });
    if (!tx) { res.status(404).json({ message: "Transaction not found" }); return; }

    if (tx.status === "completed") {
      res.status(400).json({ message: "Cannot cancel an already completed deposit" });
      return;
    }
    if (tx.status === "rejected") {
      res.status(400).json({ message: "Deposit is already cancelled" });
      return;
    }

    const { reason = "Payment not received" } = req.body;
    const prevStatus = tx.status;
    tx.status = "rejected";
    tx.processedBy = req.user!.id as any;
    tx.processedAt = new Date();
    tx.description = tx.description + ` [cancelled by admin: ${reason}]`;
    await tx.save();

    await Notification.create({
      userId: tx.userId,
      type: "deposit",
      message: `❌ Your deposit of KSh ${tx.amount} could not be confirmed and has been cancelled. Reason: ${reason}. If you believe this is an error, please contact support.`,
      data: { amount: tx.amount },
    });

    await logAction(req.user!.id, "CANCEL_DEPOSIT", `Cancelled deposit ${tx.id} (KSh ${tx.amount}) for user ${tx.userId} — was ${prevStatus}. Reason: ${reason}`);

    res.json({ success: true, message: "Deposit cancelled" });
  } catch (err: any) {
    console.error("Cancel deposit error:", err.message);
    res.status(500).json({ message: "Failed to cancel deposit" });
  }
});

// GET /admin/deposits
router.get("/deposits", async (req: AuthRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const filter = { type: "deposit" };

  const [txns, total] = await Promise.all([
    Transaction.find(filter)
      .populate("userId", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    transactions: txns.map((t) => {
      const user = t.userId as any;
      return {
        id: t.id,
        type: t.type,
        amount: t.amount,
        fee: t.fee,
        netAmount: t.netAmount,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
        userId: user?._id?.toString() ?? "",
        username: user?.username ?? "",
      };
    }),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

export default router;

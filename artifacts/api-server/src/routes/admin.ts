import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Match } from "../models/Match.js";
import { Bet } from "../models/Bet.js";
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

    const match = await Match.create({
      homeTeam,
      awayTeam,
      odds,
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

  const match = await Match.findByIdAndUpdate(req.params.id, { odds }, { new: true });
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
router.post("/matches/:id/override", async (req: AuthRequest, res) => {
  const { result, homeScore, awayScore, reason } = req.body;
  if (!result || !["home", "draw", "away"].includes(result)) {
    res.status(400).json({ message: "Valid result (home/draw/away) is required" });
    return;
  }

  stopMatchSimulation(req.params.id);

  const match = await Match.findByIdAndUpdate(
    req.params.id,
    {
      result,
      homeScore: homeScore ?? 0,
      awayScore: awayScore ?? 0,
      status: "completed",
      completedAt: new Date(),
    },
    { new: true }
  );

  if (!match) {
    res.status(404).json({ message: "Match not found" });
    return;
  }

  // Settle bets with overridden result
  const bets = await Bet.find({ matchId: match._id, status: "pending" });
  for (const bet of bets) {
    const won = bet.outcome === result;
    if (won) {
      const winnings = bet.amount * bet.odds;
      await bet.updateOne({ status: "won", actualWinnings: winnings, settledAt: new Date() });
      await User.findByIdAndUpdate(bet.userId, { $inc: { balance: winnings, totalWins: 1, totalWinnings: winnings } });
      await Transaction.create({
        userId: bet.userId, type: "winnings", amount: winnings, fee: 0, netAmount: winnings, status: "completed",
        description: `Winnings from ${match.homeTeam} vs ${match.awayTeam} (result overridden)`,
      });
      await Notification.create({ userId: bet.userId, type: "bet_won", message: `🎉 You won KSh ${winnings.toFixed(2)} on ${match.homeTeam} vs ${match.awayTeam}!`, data: { winnings } });
    } else {
      await bet.updateOne({ status: "lost", settledAt: new Date() });
      await Notification.create({ userId: bet.userId, type: "bet_lost", message: `❌ You lost your bet on ${match.homeTeam} vs ${match.awayTeam}.`, data: {} });
    }
    await User.findByIdAndUpdate(bet.userId, { $inc: { totalBets: 1 } });
  }

  await logAction(req.user!.id, "OVERRIDE_RESULT", `Overridden result for ${match.homeTeam} vs ${match.awayTeam}: ${result} (${homeScore}-${awayScore}). Reason: ${reason || "N/A"}`, match.id, "Match");

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
    completedAt: match.completedAt,
    result: match.result,
    totalBets: match.totalBets,
    totalBetAmount: match.totalBetAmount,
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
    // Refund the amount
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
    await Notification.create({
      userId: user._id,
      type: "withdrawal_approved",
      message: `✅ Your withdrawal of KSh ${tx.amount} (net KSh ${tx.netAmount.toFixed(2)}) has been approved and processed.`,
    });
  }

  await logAction(req.user!.id, action === "approve" ? "APPROVE_WITHDRAWAL" : "REJECT_WITHDRAWAL", `${action} withdrawal of KSh ${tx.amount} for ${user?.username}. ${reason || ""}`, tx.id, "Transaction");

  res.json({ success: true, message: `Withdrawal ${action}d successfully` });
});

// GET /admin/stats
router.get("/stats", async (req: AuthRequest, res) => {
  const [
    totalUsers,
    activeUsers,
    totalMatches,
    liveMatches,
    totalBetsCount,
    betAmountAgg,
    depositAgg,
    withdrawalAgg,
    pendingWithdrawals,
    winningsAgg,
    recentBets,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "user", status: "active" }),
    Match.countDocuments(),
    Match.countDocuments({ status: "live" }),
    Bet.countDocuments(),
    Bet.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "deposit", status: "completed" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "withdrawal", status: "completed" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Transaction.countDocuments({ type: "withdrawal", status: "pending" }),
    Transaction.aggregate([{ $match: { type: "winnings" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Bet.find().populate("userId", "username").populate("matchId", "homeTeam awayTeam").sort({ createdAt: -1 }).limit(10),
  ]);

  const totalBetAmount = betAmountAgg[0]?.total ?? 0;
  const totalDeposits = depositAgg[0]?.total ?? 0;
  const totalWithdrawals = withdrawalAgg[0]?.total ?? 0;
  const totalWinningsPaid = winningsAgg[0]?.total ?? 0;
  const platformRevenue = totalBetAmount - totalWinningsPaid;

  res.json({
    totalUsers,
    activeUsers,
    totalMatches,
    liveMatches,
    totalBets: totalBetsCount,
    totalBetAmount,
    totalDeposits,
    totalWithdrawals,
    pendingWithdrawals,
    platformRevenue,
    totalWinningsPaid,
    recentBets: recentBets.map((b) => {
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
  });
});

// PUT /admin/config
router.put("/config", async (req: AuthRequest, res) => {
  const config = await getConfig();
  const fields = ["minDeposit", "minBet", "minWithdrawal", "withdrawalFeePercent", "bettingWindowMinutes", "matchDurationSeconds", "maxBetAmount"];
  for (const f of fields) {
    if (req.body[f] !== undefined) (config as any)[f] = req.body[f];
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
  });
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

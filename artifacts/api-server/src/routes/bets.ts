import { Router } from "express";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { Bet } from "../models/Bet.js";
import { Match } from "../models/Match.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";
import { getConfig } from "../models/PlatformConfig.js";

const router = Router();
router.use(authenticate);

// POST /bets
router.post("/", async (req: AuthRequest, res) => {
  try {
    const config = await getConfig();
    const { matchId, outcome, amount } = req.body;

    if (!matchId || !outcome || !amount) {
      res.status(400).json({ message: "matchId, outcome and amount are required" });
      return;
    }

    if (!["home", "draw", "away"].includes(outcome)) {
      res.status(400).json({ message: "Invalid outcome. Must be home, draw or away" });
      return;
    }

    if (amount < config.minBet) {
      res.status(400).json({ message: `Minimum bet is KSh ${config.minBet}` });
      return;
    }

    if (amount > config.maxBetAmount) {
      res.status(400).json({ message: `Maximum bet is KSh ${config.maxBetAmount}` });
      return;
    }

    const match = await Match.findById(matchId);
    if (!match) {
      res.status(404).json({ message: "Match not found" });
      return;
    }

    if (match.status !== "betting_open") {
      res.status(400).json({ message: "Betting is not open for this match" });
      return;
    }

    if (match.bettingClosesAt && new Date() > match.bettingClosesAt) {
      res.status(400).json({ message: "Betting window has closed" });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user || user.balance < amount) {
      res.status(400).json({ message: "Insufficient balance" });
      return;
    }

    const odds = match.odds[outcome as "home" | "draw" | "away"];
    const potentialWinnings = amount * odds;

    // Deduct balance
    await User.findByIdAndUpdate(req.user!.id, { $inc: { balance: -amount } });

    const bet = await Bet.create({
      userId: req.user!.id,
      matchId,
      outcome,
      amount,
      odds,
      potentialWinnings,
    });

    // Record bet transaction
    await Transaction.create({
      userId: req.user!.id,
      type: "bet",
      amount,
      fee: 0,
      netAmount: -amount,
      status: "completed",
      description: `Bet on ${match.homeTeam} vs ${match.awayTeam} (${outcome})`,
    });

    // Update match stats
    await Match.findByIdAndUpdate(matchId, {
      $inc: { totalBets: 1, totalBetAmount: amount },
    });

    await Notification.create({
      userId: req.user!.id,
      type: "bet_placed",
      message: `✅ Bet of KSh ${amount} placed on ${match.homeTeam} vs ${match.awayTeam}. Potential win: KSh ${potentialWinnings.toFixed(2)}`,
      data: { matchId, outcome, amount, potentialWinnings },
    });

    res.status(201).json({
      id: bet.id,
      matchId: bet.matchId.toString(),
      userId: bet.userId.toString(),
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      outcome: bet.outcome,
      amount: bet.amount,
      odds: bet.odds,
      potentialWinnings: bet.potentialWinnings,
      status: bet.status,
      actualWinnings: bet.actualWinnings,
      createdAt: bet.createdAt,
    });
  } catch (err) {
    console.error("Place bet error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

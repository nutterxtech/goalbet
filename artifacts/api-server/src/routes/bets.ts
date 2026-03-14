import { Router } from "express";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { Bet } from "../models/Bet.js";
import { BetSlip, generateSlipId } from "../models/BetSlip.js";
import { Match } from "../models/Match.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";
import { getConfig } from "../models/PlatformConfig.js";

const router = Router();
router.use(authenticate);

// POST /bets/slip — place an accumulator bet slip
router.post("/slip", async (req: AuthRequest, res) => {
  try {
    const config = await getConfig();
    const { selections, stake } = req.body;

    if (!Array.isArray(selections) || selections.length < 1) {
      res.status(400).json({ message: "At least one selection is required" });
      return;
    }
    if (selections.length > 20) {
      res.status(400).json({ message: "Maximum 20 selections per slip" });
      return;
    }

    const parsedStake = parseFloat(stake);
    if (!parsedStake || parsedStake < config.minBet) {
      res.status(400).json({ message: `Minimum stake is KSh ${config.minBet}` });
      return;
    }
    if (parsedStake > config.maxBetAmount) {
      res.status(400).json({ message: `Maximum stake is KSh ${config.maxBetAmount}` });
      return;
    }

    // Validate no duplicate match in slip
    const matchIds = selections.map((s: any) => s.matchId);
    const uniqueMatchIds = new Set(matchIds);
    if (uniqueMatchIds.size !== matchIds.length) {
      res.status(400).json({ message: "Duplicate match in slip — one selection per match" });
      return;
    }

    // Validate all selections
    const resolvedSelections: { matchId: string; homeTeam: string; awayTeam: string; outcome: "home" | "draw" | "away"; odds: number }[] = [];
    for (const sel of selections) {
      const { matchId, outcome } = sel;
      if (!matchId || !outcome || !["home", "draw", "away"].includes(outcome)) {
        res.status(400).json({ message: "Invalid selection: matchId and outcome (home/draw/away) required" });
        return;
      }

      const match = await Match.findById(matchId);
      if (!match) {
        res.status(404).json({ message: `Match ${matchId} not found` });
        return;
      }
      if (!["betting_open", "upcoming"].includes(match.status)) {
        res.status(400).json({ message: `Betting is closed for ${match.homeTeam} vs ${match.awayTeam}` });
        return;
      }

      resolvedSelections.push({
        matchId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        outcome: outcome as "home" | "draw" | "away",
        odds: match.odds[outcome as "home" | "draw" | "away"],
      });
    }

    // Check balance
    const user = await User.findById(req.user!.id);
    if (!user || user.balance < parsedStake) {
      res.status(400).json({ message: "Insufficient balance" });
      return;
    }

    const combinedOdds = resolvedSelections.reduce((acc, s) => acc * s.odds, 1);
    const potentialWinnings = parsedStake * combinedOdds;

    // Generate unique slip ID
    let slipId = generateSlipId();
    let attempts = 0;
    while (await BetSlip.exists({ slipId }) && attempts < 10) {
      slipId = generateSlipId();
      attempts++;
    }

    // Deduct stake
    await User.findByIdAndUpdate(req.user!.id, { $inc: { balance: -parsedStake } });

    // Create slip
    const slip = await BetSlip.create({
      slipId,
      userId: req.user!.id,
      selections: resolvedSelections.map(s => ({
        matchId: s.matchId,
        homeTeam: s.homeTeam,
        awayTeam: s.awayTeam,
        outcome: s.outcome,
        odds: s.odds,
        status: "pending",
      })),
      combinedOdds: parseFloat(combinedOdds.toFixed(4)),
      stake: parsedStake,
      potentialWinnings: parseFloat(potentialWinnings.toFixed(2)),
    });

    // Create individual Bet records (linked to slip) + update match stats
    for (const sel of resolvedSelections) {
      await Bet.create({
        userId: req.user!.id,
        matchId: sel.matchId,
        outcome: sel.outcome,
        amount: parsedStake,
        odds: sel.odds,
        potentialWinnings: parsedStake * sel.odds,
        slipId: slip.slipId,
      });
      await Match.findByIdAndUpdate(sel.matchId, {
        $inc: { totalBets: 1, totalBetAmount: parsedStake },
      });
    }

    // Record transaction
    await Transaction.create({
      userId: req.user!.id,
      type: "bet",
      amount: -parsedStake,
      fee: 0,
      netAmount: -parsedStake,
      status: "completed",
      description: `Bet slip #${slipId} — ${resolvedSelections.length} selection${resolvedSelections.length > 1 ? "s" : ""}`,
    });

    await Notification.create({
      userId: req.user!.id,
      type: "bet_placed",
      message: `🎟️ Slip #${slipId} placed — ${resolvedSelections.length} selections, stake KSh ${parsedStake}, potential win KSh ${potentialWinnings.toFixed(2)}`,
      data: { slipId, stake: parsedStake, potentialWinnings },
    });

    res.status(201).json({
      slipId: slip.slipId,
      userId: slip.userId.toString(),
      selections: slip.selections,
      combinedOdds: slip.combinedOdds,
      stake: slip.stake,
      potentialWinnings: slip.potentialWinnings,
      status: slip.status,
      createdAt: slip.createdAt,
    });
  } catch (err) {
    console.error("Place slip error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Legacy single bet (kept for compatibility, but wraps as single-selection slip)
router.post("/", async (req: AuthRequest, res) => {
  try {
    const { matchId, outcome, amount } = req.body;
    if (!matchId || !outcome || !amount) {
      res.status(400).json({ message: "matchId, outcome and amount are required" });
      return;
    }
    // Redirect to slip with single selection
    req.body = { selections: [{ matchId, outcome }], stake: amount };
    // Call slip logic inline
    const config = await getConfig();
    const parsedStake = parseFloat(amount);
    if (!parsedStake || parsedStake < config.minBet) {
      res.status(400).json({ message: `Minimum bet is KSh ${config.minBet}` });
      return;
    }
    if (!["home", "draw", "away"].includes(outcome)) {
      res.status(400).json({ message: "Invalid outcome" });
      return;
    }
    const match = await Match.findById(matchId);
    if (!match) { res.status(404).json({ message: "Match not found" }); return; }
    if (!["betting_open", "upcoming"].includes(match.status)) {
      res.status(400).json({ message: "Betting is not available for this match" }); return;
    }
    const existingBet = await Bet.findOne({ userId: req.user!.id, matchId });
    if (existingBet) {
      res.status(400).json({ message: "You have already placed a bet on this match" }); return;
    }
    const user = await User.findById(req.user!.id);
    if (!user || user.balance < parsedStake) {
      res.status(400).json({ message: "Insufficient balance" }); return;
    }
    const odds = match.odds[outcome as "home" | "draw" | "away"];
    const potentialWinnings = parsedStake * odds;

    let slipId = generateSlipId();
    let attempts = 0;
    while (await BetSlip.exists({ slipId }) && attempts < 10) { slipId = generateSlipId(); attempts++; }

    await User.findByIdAndUpdate(req.user!.id, { $inc: { balance: -parsedStake } });

    const slip = await BetSlip.create({
      slipId,
      userId: req.user!.id,
      selections: [{ matchId: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, outcome, odds, status: "pending" }],
      combinedOdds: odds,
      stake: parsedStake,
      potentialWinnings: parseFloat(potentialWinnings.toFixed(2)),
    });

    const bet = await Bet.create({
      userId: req.user!.id, matchId, outcome, amount: parsedStake, odds, potentialWinnings, slipId: slip.slipId,
    });

    await Match.findByIdAndUpdate(matchId, { $inc: { totalBets: 1, totalBetAmount: parsedStake } });
    await Transaction.create({
      userId: req.user!.id, type: "bet", amount: -parsedStake, fee: 0, netAmount: -parsedStake,
      status: "completed", description: `Bet on ${match.homeTeam} vs ${match.awayTeam} (${outcome})`,
    });
    await Notification.create({
      userId: req.user!.id, type: "bet_placed",
      message: `✅ Slip #${slipId} placed — ${match.homeTeam} vs ${match.awayTeam}. Potential win: KSh ${potentialWinnings.toFixed(2)}`,
      data: { slipId, matchId, outcome, amount: parsedStake, potentialWinnings },
    });

    res.status(201).json({
      id: bet.id, slipId: slip.slipId, matchId: bet.matchId.toString(),
      homeTeam: match.homeTeam, awayTeam: match.awayTeam, outcome: bet.outcome,
      amount: bet.amount, odds: bet.odds, potentialWinnings: bet.potentialWinnings,
      status: bet.status, createdAt: bet.createdAt,
    });
  } catch (err) {
    console.error("Place bet error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

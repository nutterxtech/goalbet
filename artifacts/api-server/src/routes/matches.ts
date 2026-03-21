import { Router } from "express";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { Match } from "../models/Match.js";

const router = Router();

// GET /matches - public endpoint (optional auth)
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    // Completed matches sort newest-first; others sort by scheduled time
    const sort: Record<string, 1 | -1> = status === "completed"
      ? { completedAt: -1 }
      : { scheduledAt: 1 };

    const [matches, total] = await Promise.all([
      Match.find(filter).sort(sort).limit(limit),
      Match.countDocuments(filter),
    ]);

    res.json({
      matches: matches.map((m) => ({
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
        odds: m.odds,
        minute: m.minute,
        events: m.events.slice(-10),
        scheduledAt: m.scheduledAt,
        bettingClosesAt: m.bettingClosesAt,
        startedAt: m.startedAt,
        completedAt: m.completedAt,
        result: m.result,
        totalBets: m.totalBets,
        totalBetAmount: m.totalBetAmount,
      })),
      total,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /matches/:id - public endpoint
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      res.status(404).json({ message: "Match not found" });
      return;
    }
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
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

import { Router } from "express";
import { optionalAuth, type AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = Router();
router.use(optionalAuth);

// GET /leaderboard
router.get("/", async (req: AuthRequest, res) => {
  try {
    const top = await User.find({ role: "user", status: "active", totalWins: { $gt: 0 } })
      .sort({ totalWinnings: -1 })
      .limit(10)
      .select("username totalWinnings totalBets totalWins");

    const leaderboard = top.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username,
      totalWinnings: u.totalWinnings,
      totalBets: u.totalBets,
      winRate: u.totalBets > 0 ? Math.round((u.totalWins / u.totalBets) * 100) : 0,
    }));

    // Find current user's rank
    let userRank = null;
    const userId = req.user!.id;
    const userRankIndex = leaderboard.findIndex((e) => e.userId === userId);
    if (userRankIndex >= 0) {
      userRank = leaderboard[userRankIndex];
    } else {
      const user = await User.findById(userId).select("username totalWinnings totalBets totalWins");
      if (user) {
        const countAbove = await User.countDocuments({
          role: "user",
          totalWinnings: { $gt: user.totalWinnings },
        });
        userRank = {
          rank: countAbove + 1,
          userId: user.id,
          username: user.username,
          totalWinnings: user.totalWinnings,
          totalBets: user.totalBets,
          winRate: user.totalBets > 0 ? Math.round((user.totalWins / user.totalBets) * 100) : 0,
        };
      }
    }

    res.json({ leaderboard, userRank });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

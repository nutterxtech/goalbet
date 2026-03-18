import { Router } from "express";
import { getConfig } from "../models/PlatformConfig.js";

const router = Router();

router.get("/config", async (_req, res) => {
  try {
    const cfg = await getConfig();
    res.json({
      minDeposit: cfg.minDeposit,
      minBet: cfg.minBet,
      minWithdrawal: cfg.minWithdrawal,
      withdrawalFeePercent: cfg.withdrawalFeePercent,
      maxBetAmount: cfg.maxBetAmount,
      minSpinAmount: cfg.minSpinAmount,
      maxSpinAmount: cfg.maxSpinAmount,
      referralRewardAmount: cfg.referralRewardAmount,
    });
  } catch (err) {
    res.status(500).json({ message: "Could not load config" });
  }
});

export default router;

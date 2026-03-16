import { Router } from "express";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { getConfig } from "../models/PlatformConfig.js";

const router = Router();

const SEGMENTS = [
  { label: "0.00×", multiplier: 0 },   // 0
  { label: "1.5×",  multiplier: 1.5 }, // 1
  { label: "0.00×", multiplier: 0 },   // 2
  { label: "2×",    multiplier: 2 },   // 3
  { label: "0.00×", multiplier: 0 },   // 4
  { label: "3×",    multiplier: 3 },   // 5
  { label: "0.00×", multiplier: 0 },   // 6
  { label: "5×",    multiplier: 5 },   // 7
  { label: "0.00×", multiplier: 0 },   // 8
  { label: "1.5×",  multiplier: 1.5 }, // 9
  { label: "0.00×", multiplier: 0 },   // 10
  { label: "10×",   multiplier: 10 },  // 11
];

// Win segments' expected return = sum(weight_i * mult_i) / sum(weights)
// Lose (mult=0): indices 0,2,4,6,8,10 → total weight 70; Win: 1(6)→1.5, 3(8)→2, 5(5)→3, 7(3)→5, 9(6)→1.5, 11(2)→10
// Expected: (6*1.5+8*2+5*3+3*5+6*1.5+2*10)/89 ≈ 0.944 → ~5.6% house edge
const WEIGHTS = [12, 6, 12, 8, 12, 5, 12, 3, 12, 6, 11, 2];

function pickSegment(): number {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < WEIGHTS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return i;
  }
  return 0;
}

// GET /api/spin/config — returns spin limits (public, no auth)
router.get("/config", async (_req, res) => {
  try {
    const config = await getConfig();
    res.json({ minSpinAmount: config.minSpinAmount ?? 10, maxSpinAmount: config.maxSpinAmount ?? 50000 });
  } catch {
    res.json({ minSpinAmount: 10, maxSpinAmount: 50000 });
  }
});

// POST /api/spin
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const config = await getConfig();
    const minSpin = config.minSpinAmount ?? 10;
    const maxSpin = config.maxSpinAmount ?? 50000;

    const amount = Number(req.body.amount);
    if (!amount || isNaN(amount) || amount < minSpin || amount > maxSpin) {
      res.status(400).json({ message: `Spin amount must be between KSh ${minSpin} and KSh ${maxSpin.toLocaleString()}.` });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ message: "User not found" }); return; }
    if (user.balance < amount) {
      res.status(400).json({ message: "Insufficient balance for spin." });
      return;
    }

    // Deduct stake first (site always collects the stake)
    user.balance -= amount;

    const segmentIndex = pickSegment();
    const segment = SEGMENTS[segmentIndex];
    const winnings = parseFloat((amount * segment.multiplier).toFixed(2));

    // Credit winnings only if user won (site never goes negative — house edge built into weights)
    if (winnings > 0) {
      user.balance += winnings;
    }

    await user.save();

    // Record spin stake with dedicated type so admin can track spin revenue separately
    await Transaction.create({
      userId: user._id,
      type: "spin_stake",
      amount: amount,
      fee: 0,
      netAmount: amount,
      status: "completed",
      description: `Lucky Wheel spin — staked KSh ${amount}`,
    });

    if (winnings > 0) {
      await Transaction.create({
        userId: user._id,
        type: "spin_win",
        amount: winnings,
        fee: 0,
        netAmount: winnings,
        status: "completed",
        description: `Lucky Wheel — ${segment.label} multiplier on KSh ${amount} stake`,
      });
    }

    res.json({
      segmentIndex,
      multiplier: segment.multiplier,
      label: segment.label,
      stake: amount,
      winnings,
      newBalance: parseFloat(user.balance.toFixed(2)),
    });
  } catch (err) {
    console.error("Spin error:", err);
    res.status(500).json({ message: "Spin failed. Please try again." });
  }
});

export default router;

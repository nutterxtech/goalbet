import { Router } from "express";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";

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

// Weighted random pick: weights correspond to each segment index
const WEIGHTS = [12, 6, 12, 8, 12, 5, 12, 3, 12, 6, 11, 2];
// Lose segments (0,2,4,6,8,10) total = 71%; win segments total = 29%

function pickSegment(): number {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < WEIGHTS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return i;
  }
  return 0;
}

// POST /api/spin
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount < 10 || amount > 50000 || isNaN(amount)) {
      res.status(400).json({ message: "Spin amount must be between KSh 10 and KSh 50,000." });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ message: "User not found" }); return; }
    if (user.balance < amount) {
      res.status(400).json({ message: "Insufficient balance for spin." });
      return;
    }

    // Deduct stake
    user.balance -= amount;

    const segmentIndex = pickSegment();
    const segment = SEGMENTS[segmentIndex];
    const winnings = parseFloat((amount * segment.multiplier).toFixed(2));

    if (winnings > 0) {
      user.balance += winnings;
    }

    await user.save();

    // Record stake transaction
    await Transaction.create({
      userId: user._id,
      type: "bet",
      amount,
      fee: 0,
      netAmount: -amount,
      status: "completed",
      description: `Lucky Wheel spin — KSh ${amount}`,
    });

    // Record winnings transaction if won
    if (winnings > 0) {
      await Transaction.create({
        userId: user._id,
        type: "winnings",
        amount: winnings,
        fee: 0,
        netAmount: winnings,
        status: "completed",
        description: `Lucky Wheel win — ${segment.label} × KSh ${amount} = KSh ${winnings}`,
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

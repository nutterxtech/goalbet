import mongoose, { Schema, Document } from "mongoose";

export interface IBet extends Document {
  userId: mongoose.Types.ObjectId;
  matchId: mongoose.Types.ObjectId;
  outcome: "home" | "draw" | "away";
  amount: number;
  odds: number;
  potentialWinnings: number;
  status: "pending" | "won" | "lost" | "refunded";
  actualWinnings: number;
  slipId?: string;
  createdAt: Date;
  settledAt?: Date;
}

const BetSchema = new Schema<IBet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true },
    outcome: { type: String, enum: ["home", "draw", "away"], required: true },
    amount: { type: Number, required: true },
    odds: { type: Number, required: true },
    potentialWinnings: { type: Number, required: true },
    status: { type: String, enum: ["pending", "won", "lost", "refunded"], default: "pending" },
    actualWinnings: { type: Number, default: 0 },
    slipId: { type: String },
    settledAt: Date,
  },
  { timestamps: true }
);

BetSchema.index({ userId: 1, createdAt: -1 });
BetSchema.index({ matchId: 1 });

export const Bet = mongoose.model<IBet>("Bet", BetSchema);

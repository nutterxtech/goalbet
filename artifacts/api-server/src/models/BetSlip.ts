import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface IBetSlipSelection {
  matchId: mongoose.Types.ObjectId;
  homeTeam: string;
  awayTeam: string;
  outcome: "home" | "draw" | "away";
  odds: number;
  status: "pending" | "won" | "lost" | "refunded";
  matchResult?: "home" | "draw" | "away";
}

export interface IBetSlip extends Document {
  slipId: string;
  userId: mongoose.Types.ObjectId;
  selections: IBetSlipSelection[];
  combinedOdds: number;
  stake: number;
  potentialWinnings: number;
  status: "pending" | "won" | "lost" | "refunded";
  actualWinnings: number;
  createdAt: Date;
  settledAt?: Date;
  adminNote?: string;
}

export function generateSlipId(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

const BetSlipSelectionSchema = new Schema<IBetSlipSelection>(
  {
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true },
    homeTeam: { type: String, required: true },
    awayTeam: { type: String, required: true },
    outcome: { type: String, enum: ["home", "draw", "away"], required: true },
    odds: { type: Number, required: true },
    status: { type: String, enum: ["pending", "won", "lost", "refunded"], default: "pending" },
    matchResult: { type: String, enum: ["home", "draw", "away"] },
  },
  { _id: false }
);

const BetSlipSchema = new Schema<IBetSlip>(
  {
    slipId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    selections: { type: [BetSlipSelectionSchema], required: true },
    combinedOdds: { type: Number, required: true },
    stake: { type: Number, required: true },
    potentialWinnings: { type: Number, required: true },
    status: { type: String, enum: ["pending", "won", "lost", "refunded"], default: "pending" },
    actualWinnings: { type: Number, default: 0 },
    settledAt: Date,
    adminNote: { type: String },
  },
  { timestamps: true }
);

BetSlipSchema.index({ userId: 1, createdAt: -1 });
BetSlipSchema.index({ slipId: 1 }, { unique: true });
BetSlipSchema.index({ "selections.matchId": 1, status: 1 });

export const BetSlip = mongoose.model<IBetSlip>("BetSlip", BetSlipSchema);

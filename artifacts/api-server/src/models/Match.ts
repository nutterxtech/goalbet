import mongoose, { Schema, Document } from "mongoose";

export interface IMatchEvent {
  minute: number;
  type: "goal" | "yellowCard" | "redCard" | "substitution" | "kickoff" | "halftime" | "fulltime";
  team: "home" | "away";
  player?: string;
  description?: string;
}

export interface IOdds {
  home: number;
  draw: number;
  away: number;
}

export interface IMatch extends Document {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "upcoming" | "betting_open" | "live" | "completed" | "cancelled";
  odds: IOdds;
  minute: number;
  events: IMatchEvent[];
  scheduledAt?: Date;
  bettingClosesAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: "home" | "draw" | "away";
  totalBets: number;
  totalBetAmount: number;
  simulationTimer?: string;
  createdAt: Date;
}

const MatchEventSchema = new Schema<IMatchEvent>({
  minute: { type: Number, required: true },
  type: { type: String, required: true },
  team: { type: String, required: true },
  player: String,
  description: String,
}, { _id: false });

const MatchSchema = new Schema<IMatch>(
  {
    homeTeam: { type: String, required: true },
    awayTeam: { type: String, required: true },
    homeScore: { type: Number, default: 0 },
    awayScore: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["upcoming", "betting_open", "live", "completed", "cancelled"],
      default: "upcoming",
    },
    odds: {
      home: { type: Number, required: true },
      draw: { type: Number, required: true },
      away: { type: Number, required: true },
    },
    minute: { type: Number, default: 0 },
    events: [MatchEventSchema],
    scheduledAt: Date,
    bettingClosesAt: Date,
    startedAt: Date,
    completedAt: Date,
    result: { type: String, enum: ["home", "draw", "away"] },
    totalBets: { type: Number, default: 0 },
    totalBetAmount: { type: Number, default: 0 },
    simulationTimer: String,
  },
  { timestamps: true }
);

export const Match = mongoose.model<IMatch>("Match", MatchSchema);

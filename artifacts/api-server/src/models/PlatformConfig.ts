import mongoose, { Schema, Document } from "mongoose";

export interface IPlatformConfig extends Document {
  minDeposit: number;
  minBet: number;
  minWithdrawal: number;
  withdrawalFeePercent: number;
  bettingWindowMinutes: number;
  matchDurationSeconds: number;
  maxBetAmount: number;
  consolationRefundPercent: number;
  referralRewardAmount: number;
  mpesaConsumerKey: string;
  mpesaConsumerSecret: string;
  mpesaShortCode: string;
  mpesaPasskey: string;
  mpesaCallbackUrl: string;
  mpesaEnvironment: "sandbox" | "production";
  mpesaConfigured: boolean;
}

const PlatformConfigSchema = new Schema<IPlatformConfig>(
  {
    minDeposit: { type: Number, default: 20 },
    minBet: { type: Number, default: 5 },
    minWithdrawal: { type: Number, default: 50 },
    withdrawalFeePercent: { type: Number, default: 12 },
    bettingWindowMinutes: { type: Number, default: 60 },
    matchDurationSeconds: { type: Number, default: 120 },
    maxBetAmount: { type: Number, default: 10000 },
    consolationRefundPercent: { type: Number, default: 50 },
    referralRewardAmount: { type: Number, default: 50 },
    mpesaConsumerKey: { type: String, default: "" },
    mpesaConsumerSecret: { type: String, default: "" },
    mpesaShortCode: { type: String, default: "" },
    mpesaPasskey: { type: String, default: "" },
    mpesaCallbackUrl: { type: String, default: "" },
    mpesaEnvironment: { type: String, enum: ["sandbox", "production"], default: "sandbox" },
    mpesaConfigured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PlatformConfig = mongoose.model<IPlatformConfig>("PlatformConfig", PlatformConfigSchema);

export async function getConfig(): Promise<IPlatformConfig> {
  let config = await PlatformConfig.findOne();
  if (!config) {
    config = await PlatformConfig.create({});
  }
  return config;
}

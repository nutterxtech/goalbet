import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  phone?: string;
  balance: number;
  role: "user" | "admin";
  status: "active" | "suspended" | "banned";
  totalBets: number;
  totalWins: number;
  totalWinnings: number;
  totalDeposits: number;
  totalWithdrawals: number;
  referralCode: string;
  referredBy?: string;
  referralEarnings: number;
  referralCount: number;
  pendingConsolationWin: boolean;
  consecutiveLosses: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String },
    balance: { type: Number, default: 0 },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    status: { type: String, enum: ["active", "suspended", "banned"], default: "active" },
    totalBets: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    totalWinnings: { type: Number, default: 0 },
    totalDeposits: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: String },
    referralEarnings: { type: Number, default: 0 },
    referralCount: { type: Number, default: 0 },
    pendingConsolationWin: { type: Boolean, default: false },
    consecutiveLosses: { type: Number, default: 0 },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.referralCode) {
    this.referralCode = nanoid(8).toUpperCase();
  }
});

UserSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password);
};

export const User = mongoose.model<IUser>("User", UserSchema);

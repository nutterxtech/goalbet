import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: "deposit" | "withdrawal" | "bet" | "winnings" | "refund" | "adjustment";
  amount: number;
  fee: number;
  netAmount: number;
  status: "pending" | "completed" | "rejected";
  description: string;
  accountDetails?: string;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "bet", "winnings", "refund", "adjustment"],
      required: true,
    },
    amount: { type: Number, required: true },
    fee: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "completed", "rejected"], default: "pending" },
    description: { type: String, required: true },
    accountDetails: String,
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    processedAt: Date,
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1 });

export const Transaction = mongoose.model<ITransaction>("Transaction", TransactionSchema);

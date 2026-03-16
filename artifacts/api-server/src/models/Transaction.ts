import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: "deposit" | "withdrawal" | "bet" | "winnings" | "refund" | "adjustment" | "spin_stake" | "spin_win";
  amount: number;
  fee: number;
  netAmount: number;
  status: "pending" | "completed" | "rejected" | "failed";
  description: string;
  accountDetails?: string;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  mpesaCheckoutRequestId?: string;
  mpesaMerchantRequestId?: string;
  mpesaReceiptNumber?: string;
  mpesaPhone?: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "bet", "winnings", "refund", "adjustment", "spin_stake", "spin_win"],
      required: true,
    },
    amount: { type: Number, required: true },
    fee: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "completed", "rejected", "failed"], default: "pending" },
    description: { type: String, required: true },
    accountDetails: String,
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    processedAt: Date,
    mpesaCheckoutRequestId: String,
    mpesaMerchantRequestId: String,
    mpesaReceiptNumber: String,
    mpesaPhone: String,
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1 });
TransactionSchema.index({ mpesaCheckoutRequestId: 1 }, { sparse: true });

export const Transaction = mongoose.model<ITransaction>("Transaction", TransactionSchema);

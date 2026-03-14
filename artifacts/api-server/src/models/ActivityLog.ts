import mongoose, { Schema, Document } from "mongoose";

export interface IActivityLog extends Document {
  action: string;
  adminId: mongoose.Types.ObjectId;
  targetId?: string;
  targetType?: string;
  description: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    action: { type: String, required: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetId: String,
    targetType: String,
    description: { type: String, required: true },
  },
  { timestamps: true }
);

export const ActivityLog = mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

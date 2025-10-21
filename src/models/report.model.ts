import mongoose, { Schema, Model, Document, Types } from "mongoose";

export type ReportStatus = "pending" | "approved" | "rejected";
export type ReportCategory =
  | "spam"
  | "content"
  | "harassment"
  | "scam"
  | "copyright";

export interface IReport extends Document {
  _id: Types.ObjectId;
  reporter: Types.ObjectId; // who reported
  targetUser?: Types.ObjectId; // reported user (optional)
  targetPost?: Types.ObjectId; // reported post (optional)
  reason: string; // free text reason
  category: ReportCategory;
  status: ReportStatus;
  note?: string; // admin note
  priority?: "low" | "medium" | "high";
  deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetUser: { type: Schema.Types.ObjectId, ref: "User" },
    targetPost: { type: Schema.Types.ObjectId, ref: "Post" },
    reason: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["spam", "content", "harassment", "scam", "copyright"],
      required: true,
    },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    note: { type: String },
    priority: { type: String, enum: ["low", "medium", "high"], default: "low" },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Report: Model<IReport> = mongoose.model<IReport>("Report", ReportSchema);
export default Report;

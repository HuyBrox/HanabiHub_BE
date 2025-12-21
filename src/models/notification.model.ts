  import mongoose, { Schema, Model, Document, Types } from "mongoose";

  export type NotificationType = "system" | "personal";

  export interface INotification extends Document {
    _id: Types.ObjectId;
    type: NotificationType;
    title: string;
    content: string;
    sender?: Types.ObjectId;
    receivers: Types.ObjectId[]; // empty for system? we store all targeted ids for personal; for system, keep empty and mark system flag
    isSystem: boolean;
    deliveredCount: number;
    readBy: Types.ObjectId[];
    metadata?: Record<string, any>;
    deleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }

  const NotificationSchema = new Schema<INotification>(
    {
      type: { type: String, enum: ["system", "personal"], required: true },
      title: { type: String, required: true },
      content: { type: String, required: true },
      sender: { type: Schema.Types.ObjectId, ref: "User" },
      receivers: [{ type: Schema.Types.ObjectId, ref: "User" }],
      isSystem: { type: Boolean, default: false },
      deliveredCount: { type: Number, default: 0 },
      readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
      metadata: { type: Schema.Types.Mixed },
      deleted: { type: Boolean, default: false },
    },
    { timestamps: true }
  );

  const Notification: Model<INotification> = mongoose.model<INotification>(
    "Notification",
    NotificationSchema
  );
  export default Notification;

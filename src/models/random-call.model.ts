import mongoose, { Schema, Model } from "mongoose";

export interface IRandomCall {
  user1Id: mongoose.Types.ObjectId;
  user2Id: mongoose.Types.ObjectId;
  user1Level: string;
  user2Level: string;
  matchedLevel: string; // Level được match (hoặc "NO_FILTER")
  startTime: Date;
  endTime?: Date;
  duration?: number; // seconds
  callType: "video" | "audio";
  status: "ongoing" | "completed" | "cancelled";

  // Ratings (optional, sẽ cập nhật sau)
  user1Rating?: number; // 1-5 sao
  user2Rating?: number; // 1-5 sao
}

const RandomCallSchema = new Schema<IRandomCall>(
  {
    user1Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    user2Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    user1Level: {
      type: String,
      enum: ["N5", "N4", "N3", "N2", "N1", "NO_FILTER"],
      required: true,
    },
    user2Level: {
      type: String,
      enum: ["N5", "N4", "N3", "N2", "N1", "NO_FILTER"],
      required: true,
    },
    matchedLevel: {
      type: String,
      enum: ["N5", "N4", "N3", "N2", "N1", "NO_FILTER"],
      required: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // seconds
    },
    callType: {
      type: String,
      enum: ["video", "audio"],
      default: "video",
    },
    status: {
      type: String,
      enum: ["ongoing", "completed", "cancelled"],
      default: "ongoing",
    },
    user1Rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    user2Rating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
    collection: "randomcalls",
  }
);

// Indexes for queries
RandomCallSchema.index({ user1Id: 1, createdAt: -1 });
RandomCallSchema.index({ user2Id: 1, createdAt: -1 });
RandomCallSchema.index({ status: 1, startTime: -1 });

const RandomCall: Model<IRandomCall> = mongoose.model<IRandomCall>(
  "RandomCall",
  RandomCallSchema
);

export default RandomCall;


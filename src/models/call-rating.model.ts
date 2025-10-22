import mongoose, { Schema, Model } from "mongoose";

/**
 * 📞 Call Rating Model
 *
 * Purpose: User đánh giá partner sau cuộc gọi random
 * - Rating được track vào listening/speaking skills của PARTNER
 * - Có thể skip không đánh giá
 * - Mỗi user chỉ rate 1 lần cho 1 cuộc gọi
 */

export interface ICallRating {
  callId: mongoose.Types.ObjectId; // Reference to RandomCall
  raterId: mongoose.Types.ObjectId; // User đánh giá (người cho điểm)
  rateeId: mongoose.Types.ObjectId; // User được đánh giá (partner trong call)

  // Đánh giá tổng thể cuộc gọi (1-5 sao)
  rating: number; // 1-5 stars

  // Thông tin cuộc gọi
  callDuration: number; // seconds

  // Optional feedback
  comment?: string;

  createdAt: Date;
}

const CallRatingSchema = new Schema<ICallRating>(
  {
    callId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RandomCall",
      required: true,
      index: true,
    },
    raterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rateeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    callDuration: {
      type: Number,
      required: true,
      min: 0,
    },
    comment: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    collection: "callratings",
  }
);

// Indexes
CallRatingSchema.index({ raterId: 1, createdAt: -1 }); // Ratings I gave
CallRatingSchema.index({ rateeId: 1, createdAt: -1 }); // Ratings I received
CallRatingSchema.index({ callId: 1, raterId: 1 }, { unique: true }); // Each user can only rate once per call

const CallRating: Model<ICallRating> = mongoose.model<ICallRating>(
  "CallRating",
  CallRatingSchema
);

export default CallRating;



import { Schema, model } from "mongoose";

const EnrollmentSchema = new Schema(
  {
    userEmail: { type: String, required: true, index: true },
    courseId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Course",
    },
    paymentTxnRef: { type: String, required: true },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ userEmail: 1, courseId: 1 }, { unique: true });

export const Enrollment = model("Enrollment", EnrollmentSchema);

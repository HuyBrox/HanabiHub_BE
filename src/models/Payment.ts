import { Schema, model } from "mongoose";

const PaymentSchema = new Schema(
  {
    txnRef: { type: String, required: true, unique: true, index: true },

    userEmail: { type: String, required: true, index: true },
    courseId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Course",
    },

    amountVnd: { type: Number, required: true },
    amountVnp: { type: Number, required: true },

    // ✅ lưu returnUrl FE
    clientReturnUrl: { type: String, required: true },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },

    vnpResponseCode: { type: String },
    vnpTransactionStatus: { type: String },
    vnpTransactionNo: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const Payment = model("Payment", PaymentSchema);

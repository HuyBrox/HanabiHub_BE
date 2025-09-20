import mongoose, { Schema, Model } from "mongoose";
import { IOtp } from "../types/otp.types";

const otpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: "180s" }, // Tự động xóa sau 3 phút
    },
  },
  { timestamps: true }
);

const Otp: Model<IOtp> = mongoose.model<IOtp>("Otp", otpSchema);
export default Otp;

//định nghĩa kiểu dữ liệu cho OTP - chỉ interface cho model
import { Document, Types } from "mongoose";

// Interface cho OTP Document - chỉ cần cái này thôi
export interface IOtp extends Document {
  _id: Types.ObjectId;
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

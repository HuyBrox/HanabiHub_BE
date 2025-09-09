//định nghĩa ra các kiểu dùng cho OTP để quản lý chặt chẽ hơn
import { Document, Types } from "mongoose";

// Interface cơ bản cho OTP (không kế thừa Document)
export interface IOtpBase {
  email: string;                       // email người dùng
  otp: string;                         // mã OTP
  expiresAt: Date;                     // thời gian hết hạn
}

// Interface cho Mongoose Document (kế thừa Document)
export interface IOtp extends IOtpBase, Document {
  _id: Types.ObjectId;                 // id mặc định của Mongo
  createdAt?: Date;
  updatedAt?: Date;
}

// Request types
export interface GenerateOtpRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ResendOtpRequest {
  email: string;
}

// Response types
export interface OtpGenerateResponse {
  success: boolean;
  message: string;
  expiresIn?: number;                  // số giây còn lại
}

export interface OtpVerifyResponse {
  success: boolean;
  message: string;
  isValid?: boolean;
}

// Utility types để tái sử dụng
export type OtpCreateInput = Pick<IOtpBase, 'email' | 'otp'> & {
  expiresAt?: Date;                    // optional, sẽ auto set nếu không có
};

export type OtpPublicInfo = Pick<IOtp, 'email' | 'expiresAt' | 'createdAt'>;

// Helper types
export interface OtpConfig {
  length: number;                      // độ dài OTP
  expiryMinutes: number;               // thời gian hết hạn (phút)
  maxAttempts: number;                 // số lần thử tối đa
}

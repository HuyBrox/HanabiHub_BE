import Otp from "../models/opt.model";
import { sendOtpEmail } from "../utils/email"; // Hàm gửi OTP qua email

// Helper để lưu OTP vào database
export async function storeOtp(email: string, otp: string) {
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // Hết hạn sau 3 phút
  await Otp.create({ email, otp, expiresAt });
}

// Helper gửi OTP qua email
export async function sendOtp(email: string) {
  // Tạo OTP ngẫu nhiên
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Lưu OTP vào database
  await storeOtp(email, otp);

  // Gửi OTP qua email
  await sendOtpEmail(email, otp);

  return otp;
}

// Helper kiểm tra OTP
export async function verifyOtp(email: string, otp: string) {
  const otpRecord = await Otp.findOne({ email }).sort({ createdAt: -1 }); // Lấy OTP mới nhất
  console.log("otpRecord:", otpRecord);
  console.log("Provided OTP:", otp);
  if (
    !otpRecord ||
    otpRecord.expiresAt.getTime() < Date.now() ||
    otpRecord.otp.toString().trim() !== otp.toString().trim()
  ) {
    return false; // OTP không chính xác hoặc đã hết hạn
  }

  return true; // OTP hợp lệ
}

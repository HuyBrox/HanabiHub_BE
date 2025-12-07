import { Router, Request, Response } from "express";
import {
  register,
  login,
  refreshToken,
  logoutAllDevices,
  logoutCurrentDevice,
  verifyOtpForRegistration,
  sendOtpToEmail,
  sendOtpToEmailRegister,
  changePassword,
  googleLogin,
} from "../controllers/auth.controller";
import { validate, registerSchema, loginSchema } from "../validators";
import { isAuth } from "../middleware/isAuth";

const router = Router();

// Authentication routes
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/google", googleLogin); // Google OAuth2 login
router.post("/refresh-token", refreshToken);
router.post("/logout-all", isAuth, logoutAllDevices); // Logout tất cả thiết bị
router.post("/logout", logoutCurrentDevice); // Logout thiết bị hiện tại (không cần auth vì có thể token đã hết hạn)

// OTP routes
router.post("/verify-otp", verifyOtpForRegistration);
router.post("/send-otp", isAuth, sendOtpToEmail);
router.post("/send-otp-register", sendOtpToEmailRegister);

// Password management
router.patch("/change-password", isAuth, changePassword);

export default router;

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
} from "../controllers/auth.controller";
import { validate, registerSchema, loginSchema } from "../validators";
import { isAuth } from "../middleware/isAuth";

const router = Router();

// Authentication routes
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh-token", refreshToken);
router.post("/logout-all", isAuth, logoutAllDevices); // Logout tất cả thiết bị
router.post("/logout", isAuth, logoutCurrentDevice); // Logout thiết bị hiện tại

// OTP routes
router.post("/verify-otp", verifyOtpForRegistration);
router.post("/send-otp", isAuth, sendOtpToEmail);
router.post("/send-otp-register", sendOtpToEmailRegister);

// Password management
router.patch("/change-password", isAuth, changePassword);

export default router;

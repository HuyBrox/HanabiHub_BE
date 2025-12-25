import { Router } from "express";
import { getTurnCredentials } from "../controllers/webrtc.controller";
import { isAuth } from "../middleware/isAuth";

const router = Router();

// Get Twilio TURN credentials for WebRTC
// Requires authentication to prevent abuse
router.get("/turn-credentials", isAuth, getTurnCredentials);

export default router;


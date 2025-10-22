import express from "express";
import { isAuth } from "../middleware/isAuth";
import {
  submitCallRating,
  getMyRatings,
  getRatingsGiven,
  getCallHistory,
} from "../controllers/call-rating.controller";

const router = express.Router();

/**
 * 📞 Routes for Random Call Rating System
 * All routes are protected with isAuth middleware
 */

// 🌟 Submit rating for a call partner
router.post("/submit", isAuth, submitCallRating);

// 📊 Get ratings I received
router.get("/my-ratings", isAuth, getMyRatings);

// 📤 Get ratings I gave to others
router.get("/ratings-given", isAuth, getRatingsGiven);

// 📜 Get call history (both given & received)
router.get("/history", isAuth, getCallHistory);

export default router;



import { Response } from "express";
import { AuthRequest } from "../types/express.types";
import CallRating from "../models/call-rating.model";
import UserActivity from "../models/user-activity.model";
import mongoose from "mongoose";

/**
 * 📞 Call Rating Controller
 *
 * User A đánh giá User B sau cuộc gọi
 * → Rating được track vào listening/speaking skills của User B (ratee)
 */

/**
 * Submit rating for a call partner
 * POST /api/call-rating/submit
 */
export const submitCallRating = async (req: AuthRequest, res: Response) => {
  try {
    const raterId = req.user?.id; // Người đánh giá

    if (!raterId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { callId, partnerId, rating, callDuration, comment } = req.body;

    // Validation
    if (!callId || !partnerId || !rating || callDuration === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: callId, partnerId, rating, callDuration",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Không thể tự đánh giá chính mình
    if (raterId === partnerId) {
      return res.status(400).json({
        success: false,
        message: "Cannot rate yourself",
      });
    }

    // Check if already rated
    const existingRating = await CallRating.findOne({
      callId: new mongoose.Types.ObjectId(callId),
      raterId: new mongoose.Types.ObjectId(raterId),
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: "You have already rated this call",
      });
    }

    // Create rating
    const newRating = await CallRating.create({
      callId: new mongoose.Types.ObjectId(callId),
      raterId: new mongoose.Types.ObjectId(raterId),
      rateeId: new mongoose.Types.ObjectId(partnerId),
      rating,
      callDuration,
      comment: comment?.trim() || undefined,
    });

    // 🎯 Track skills cho PARTNER (rateeId)
    // Convert rating (1-5) → score (20-100)
    const score = rating * 20; // 1→20, 2→40, 3→60, 4→80, 5→100

    // Tìm hoặc tạo UserActivity của partner
    let partnerActivity = await UserActivity.findOne({
      userId: new mongoose.Types.ObjectId(partnerId),
    });

    if (!partnerActivity) {
      partnerActivity = await UserActivity.create({
        userId: new mongoose.Types.ObjectId(partnerId),
        courseActivities: [],
        lessonActivities: [],
        flashcardSessions: [],
        cardLearning: [],
        dailyLearning: [],
      });
    }

    // Tạo 2 fake lesson activities cho listening & speaking
    const now = new Date();

    // 1. Listening skill
    partnerActivity.lessonActivities.push({
      lessonId: new mongoose.Types.ObjectId(), // Fake ID
      lessonType: "task",
      taskType: "listening",
      startedAt: now,
      completedAt: now,
      timeSpent: callDuration,
      isCompleted: true,
      attempts: 1,
      taskData: {
        score: score,
        maxScore: 100,
        correctAnswers: rating,
        totalQuestions: 5,
        answers: [],
      },
    } as any);

    // 2. Speaking skill
    partnerActivity.lessonActivities.push({
      lessonId: new mongoose.Types.ObjectId(), // Fake ID
      lessonType: "task",
      taskType: "speaking",
      startedAt: now,
      completedAt: now,
      timeSpent: callDuration,
      isCompleted: true,
      attempts: 1,
      taskData: {
        score: score,
        maxScore: 100,
        correctAnswers: rating,
        totalQuestions: 5,
        answers: [],
      },
    } as any);

    await partnerActivity.save();

    // Update daily learning stats cho partner
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyIndex = partnerActivity.dailyLearning.findIndex(
      (d: any) => d.date.getTime() === today.getTime()
    );

    if (dailyIndex !== -1) {
      const dailyRecord = partnerActivity.dailyLearning[dailyIndex];
      dailyRecord.totalStudyTime = (dailyRecord.totalStudyTime || 0) + callDuration;
      // Note: tasksCompleted không có trong DailyRecord schema
    } else {
      partnerActivity.dailyLearning.push({
        date: today,
        streakDays: 1,
        totalStudyTime: callDuration,
      } as any);
    }

    await partnerActivity.save();

    return res.status(200).json({
      success: true,
      message: "Rating submitted successfully",
      data: {
        rating: newRating,
        skillsTracked: {
          listening: score,
          speaking: score,
        },
      },
    });
  } catch (error: any) {
    console.error("Error submitting call rating:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * Get ratings I received
 * GET /api/call-rating/my-ratings
 */
export const getMyRatings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const ratings = await CallRating.find({
      rateeId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .populate("raterId", "username email avatar")
      .limit(50);

    // Calculate stats
    const totalRatings = ratings.length;
    const averageRating =
      totalRatings > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        ratings,
        stats: {
          totalRatings,
          averageRating: Math.round(averageRating * 10) / 10,
        },
      },
    });
  } catch (error: any) {
    console.error("Error getting ratings:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * Get ratings I gave to others
 * GET /api/call-rating/ratings-given
 */
export const getRatingsGiven = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const ratings = await CallRating.find({
      raterId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .populate("rateeId", "username email avatar")
      .limit(50);

    return res.status(200).json({
      success: true,
      data: {
        ratings,
      },
    });
  } catch (error: any) {
    console.error("Error getting ratings given:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * Get call history with ratings
 * GET /api/call-rating/history
 */
export const getCallHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Get ratings I gave
    const ratingsGiven = await CallRating.find({
      raterId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .populate("rateeId", "username email avatar level")
      .limit(20);

    // Get ratings I received
    const ratingsReceived = await CallRating.find({
      rateeId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .populate("raterId", "username email avatar level")
      .limit(20);

    return res.status(200).json({
      success: true,
      data: {
        ratingsGiven,
        ratingsReceived,
      },
    });
  } catch (error: any) {
    console.error("Error getting call history:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


import mongoose from "mongoose";

const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Hoạt động với Course (chỉ track học tập)
    courseActivities: [
      {
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
          required: true,
        },
        startedAt: Date,
        completedAt: Date,
        totalTimeSpent: Number, // seconds
        isCompleted: {
          type: Boolean,
          default: false,
        },
        lastAccessedAt: Date,
      },
    ],

    // Hoạt động với Lesson (chỉ track học tập cốt lõi)
    lessonActivities: [
      {
        lessonId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Lesson",
          required: true,
        },
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
        },
        lessonType: {
          type: String,
          enum: ["video", "task"],
          required: true,
        },
        startedAt: Date,
        completedAt: Date,
        timeSpent: Number, // seconds
        isCompleted: {
          type: Boolean,
          default: false,
        },
        attempts: Number, // số lần học lại

        // Dành cho video lessons - chỉ essentials
        videoData: {
          watchedDuration: Number, // seconds watched
          totalDuration: Number, // total video length
          isWatchedCompletely: Boolean,
        },

        // Dành cho task lessons - chỉ kết quả
        taskData: {
          score: Number,
          maxScore: Number,
          correctAnswers: Number,
          totalQuestions: Number,
          isPassed: Boolean,
        },
      },
    ],

    // Flashcard học tập (đơn giản hóa)
    flashcardSessions: [
      {
        contentType: {
          type: String,
          enum: ["flashlist", "flashcard"],
          required: true,
        },
        contentId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        studiedAt: {
          type: Date,
          default: Date.now,
        },
        cardsStudied: Number,
        correctAnswers: Number,
        sessionDuration: Number, // seconds
      },
    ],

    // Card interactions (chỉ essentials)
    cardLearning: [
      {
        cardId: mongoose.Schema.Types.ObjectId,
        flashcardId: mongoose.Schema.Types.ObjectId,
        reviewedAt: {
          type: Date,
          default: Date.now,
        },
        isCorrect: Boolean,
        responseTime: Number, // milliseconds
        masteryLevel: {
          type: String,
          enum: ["learning", "reviewing", "mastered"],
          default: "learning",
        },
      },
    ],

    // Loại bỏ phần này - không cần thiết cho AI học tập

    // Thống kê học tập hàng ngày (chỉ essentials)
    dailyLearning: [
      {
        date: {
          type: Date,
          required: true,
        },
        totalStudyTime: Number, // seconds
        lessonsCompleted: Number,
        cardsReviewed: Number,
        cardsLearned: Number, // new cards learned
        correctRate: Number, // percentage overall
        streakDays: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Cài đặt học tập cơ bản
    studyPreferences: {
      dailyGoal: {
        type: Number,
        default: 30, // minutes per day
      },
      studyReminder: {
        enabled: {
          type: Boolean,
          default: false,
        },
        time: String,
      },
    },
  },
  {
    timestamps: true,
    collection: "useractivities",
  }
);

// Indexes
userActivitySchema.index({ userId: 1, "dailyLearning.date": -1 });
userActivitySchema.index({ "courseActivities.lastAccessedAt": -1 });
userActivitySchema.index({ "lessonActivities.completedAt": -1 });

const UserActivity = mongoose.model("UserActivity", userActivitySchema);
export default UserActivity;

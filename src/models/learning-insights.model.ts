import mongoose from "mongoose";

const learningInsightsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    analysisDate: {
      type: Date,
      default: Date.now,
    },

    // Hiệu suất học tập cốt lõi
    learningPerformance: {
      overallLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
      },
      weeklyProgress: Number, // % change from last week
      consistency: Number, // 0-100, how regular they study
      retention: Number, // % retained knowledge
    },

    // Phân tích học tập theo content
    learningAnalysis: {
      // Course learning
      courseProgress: {
        coursesInProgress: Number,
        averageCompletionTime: Number, // days
        strugglingCourses: [
          {
            courseId: mongoose.Schema.Types.ObjectId,
            stuckAt: String, // lesson title or section
          },
        ],
      },

      // Lesson learning patterns
      lessonMastery: {
        videoLessons: {
          averageWatchTime: Number, // minutes
          completionRate: Number, // %
          rewatch: Number, // average rewatches
        },
        taskLessons: {
          averageScore: Number, // %
          averageAttempts: Number,
          commonMistakes: [String],
        },
      },

      // Flashcard mastery
      flashcardMastery: {
        masteredCards: Number,
        learningCards: Number,
        difficultCards: Number,
        averageResponseTime: Number, // milliseconds
        dailyRetention: Number, // % cards remembered day after
      },

      // Skill tracking (Nghe, Nói, Đọc, Viết)
      skillMastery: {
        listening: {
          level: Number, // 0-100
          tasksCompleted: Number,
          averageScore: Number, // %
          lastPracticed: Date,
        },
        speaking: {
          level: Number, // 0-100
          tasksCompleted: Number,
          averageScore: Number, // %
          lastPracticed: Date,
        },
        reading: {
          level: Number, // 0-100
          tasksCompleted: Number,
          averageScore: Number, // %
          lastPracticed: Date,
        },
        writing: {
          level: Number, // 0-100
          tasksCompleted: Number,
          averageScore: Number, // %
          lastPracticed: Date,
        },
      },
    },

    // Study patterns và thói quen học tập
    studyPatterns: {
      bestStudyTime: String, // morning, afternoon, evening
      averageSessionLength: Number, // minutes
      studyFrequency: Number, // days per week
      currentStreak: Number,
      longestStreak: Number,
      preferredContent: String, // video, task, flashcard
    },

    // Recommendations (tính bằng code, KHÔNG dùng AI)
    recommendations: {
      // Next content to study (rule-based)
      nextLessons: [
        {
          lessonId: mongoose.Schema.Types.ObjectId,
          courseId: mongoose.Schema.Types.ObjectId,
          priority: {
            type: String,
            enum: ["high", "medium", "low"],
          },
          reason: String, // "improve_weak_skill", "continue_course", "review", etc
        },
      ],

      // Flashcards to review (rule-based)
      reviewCards: [
        {
          cardId: mongoose.Schema.Types.ObjectId,
          flashcardId: mongoose.Schema.Types.ObjectId,
          urgency: Number, // 1-10
          lastSeen: Date,
        },
      ],

      // Study plan (rule-based)
      studyPlan: {
        dailyMinutes: Number,
        contentMix: {
          newLessons: Number, // % of time
          reviewCards: Number, // % of time
          practiceTask: Number, // % of time
        },
      },
    },

    // AI Advice (LỜI KHUYÊN ĐỘNG VIÊN từ AI - CHỈ TEXT)
    aiAdvice: {
      message: String, // Lời khuyên động viên từ AI
      tone: {
        type: String,
        enum: ["encouraging", "motivating", "supportive", "constructive"],
        default: "encouraging",
      },
      generatedAt: Date,
    },

    // Learning progress predictions
    predictions: {
      courseCompletionDates: [
        {
          courseId: mongoose.Schema.Types.ObjectId,
          estimatedDate: Date,
          confidence: Number, // 0-100
        },
      ],
      skillImprovement: {
        currentLevel: Number, // 0-100
        projectedLevel: Number, // in 30 days
        timeToNextLevel: Number, // days
      },
    },

    // Metadata (tối thiểu)
    modelMetadata: {
      version: String,
      confidence: Number, // 0-100
      lastUpdated: Date,
      lastSyncedAt: {
        type: Date,
        default: Date.now,
      }, // Thời điểm sync cuối cùng, dùng cho AI service
      dataPoints: Number, // Số lượng data points được phân tích
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    collection: "learninginsights",
  }
);

// Indexes
learningInsightsSchema.index({ userId: 1, analysisDate: -1 });
learningInsightsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const LearningInsights = mongoose.model(
  "LearningInsights",
  learningInsightsSchema
);
export default LearningInsights;

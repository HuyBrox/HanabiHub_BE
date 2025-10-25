import axios from "axios";
import mongoose from "mongoose";
import UserActivity from "../models/user-activity.model";
import LearningInsights from "../models/learning-insights.model";
import Course from "../models/course.model";
import Lesson from "../models/lesson.model";

/**
 * Service để call AI API và get learning advice (CHỈ LỜI KHUYÊN, không recommendations)
 */
class AIRecommendationService {
  private aiServiceUrl =
    process.env.AI_SERVICE_URL || "http://localhost:8000";

  /**
   * Generate AI advice cho user (CHỈ TEXT động viên)
   */
  async generateAdvice(userId: string | mongoose.Types.ObjectId) {
    try {
      console.log(`🤖 Generating AI advice for user: ${userId}`);

      // 1. Prepare user data
      const userData = await this.prepareUserData(userId);

      if (!userData) {
        console.warn("⚠️ Not enough user data for advice");
        return this.getDefaultAdvice();
      }

      // 2. Call AI service (endpoint for ADVICE only)
      try {
        const response = await axios.post(
          `${this.aiServiceUrl}/api/learning-advice`,
          userData,
          {
            timeout: 30000, // 30s timeout
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.success) {
          console.log("✅ AI advice generated successfully");
          return {
            message: response.data.message || "Keep up the great work!",
            tone: response.data.tone || "encouraging",
          };
        } else {
          console.warn("⚠️ AI service returned unsuccessful response");
          return this.getDefaultAdvice();
        }
      } catch (aiError: any) {
        console.error("❌ AI service error:", aiError.message);
        // Fallback to default advice
        return this.getDefaultAdvice();
      }
    } catch (error) {
      console.error("❌ Error generating advice:", error);
      return this.getDefaultAdvice();
    }
  }

  /**
   * Prepare user data từ MongoDB để gửi cho AI
   */
  private async prepareUserData(userId: string | mongoose.Types.ObjectId) {
    try {
      // Get UserActivity
      const activity = await UserActivity.findOne({ userId });
      if (!activity) {
        console.warn("UserActivity not found");
        return null;
      }

      // Get LearningInsights
      const insights = await LearningInsights.findOne({ userId });
      if (!insights) {
        console.warn("LearningInsights not found");
        return null;
      }

      // Get user's courses
      const courses = await this.getUserCourses(userId, activity);

      // Get available lessons
      const availableLessons = await this.getAvailableLessons(userId);

      // Calculate study duration
      const studyDuration = this.calculateStudyDuration(activity);

      // Build data structure
      return {
        userId: userId.toString(),

        // Performance
        overallLevel: insights.learningPerformance?.overallLevel || "beginner",
        weeklyProgress: insights.learningPerformance?.weeklyProgress || 0,
        consistency: insights.learningPerformance?.consistency || 0,
        retention: insights.learningPerformance?.retention || 0,

        // Skills
        skills: {
          listening: {
            level: insights.learningAnalysis?.skillMastery?.listening?.level || 0,
            tasksCompleted:
              insights.learningAnalysis?.skillMastery?.listening
                ?.tasksCompleted || 0,
            averageScore:
              insights.learningAnalysis?.skillMastery?.listening?.averageScore ||
              0,
            lastPracticed:
              insights.learningAnalysis?.skillMastery?.listening?.lastPracticed?.toISOString() ||
              new Date().toISOString(),
          },
          speaking: {
            level: insights.learningAnalysis?.skillMastery?.speaking?.level || 0,
            tasksCompleted:
              insights.learningAnalysis?.skillMastery?.speaking
                ?.tasksCompleted || 0,
            averageScore:
              insights.learningAnalysis?.skillMastery?.speaking?.averageScore ||
              0,
            lastPracticed:
              insights.learningAnalysis?.skillMastery?.speaking?.lastPracticed?.toISOString() ||
              new Date().toISOString(),
          },
          reading: {
            level: insights.learningAnalysis?.skillMastery?.reading?.level || 0,
            tasksCompleted:
              insights.learningAnalysis?.skillMastery?.reading?.tasksCompleted ||
              0,
            averageScore:
              insights.learningAnalysis?.skillMastery?.reading?.averageScore ||
              0,
            lastPracticed:
              insights.learningAnalysis?.skillMastery?.reading?.lastPracticed?.toISOString() ||
              new Date().toISOString(),
          },
          writing: {
            level: insights.learningAnalysis?.skillMastery?.writing?.level || 0,
            tasksCompleted:
              insights.learningAnalysis?.skillMastery?.writing?.tasksCompleted ||
              0,
            averageScore:
              insights.learningAnalysis?.skillMastery?.writing?.averageScore ||
              0,
            lastPracticed:
              insights.learningAnalysis?.skillMastery?.writing?.lastPracticed?.toISOString() ||
              new Date().toISOString(),
          },
        },

        // Courses
        courses: courses,

        // Flashcards
        flashcards: {
          total:
            (insights.learningAnalysis?.flashcardMastery?.masteredCards || 0) +
            (insights.learningAnalysis?.flashcardMastery?.learningCards || 0) +
            (insights.learningAnalysis?.flashcardMastery?.difficultCards || 0),
          mastered:
            insights.learningAnalysis?.flashcardMastery?.masteredCards || 0,
          learning:
            insights.learningAnalysis?.flashcardMastery?.learningCards || 0,
          difficult:
            insights.learningAnalysis?.flashcardMastery?.difficultCards || 0,
        },

        // Study patterns
        studyDuration: studyDuration,
        avgSessionLength: insights.studyPatterns?.averageSessionLength || 30,
        studyFrequency: insights.studyPatterns?.studyFrequency || 3,
        currentStreak: insights.studyPatterns?.currentStreak || 0,

        // Available lessons
        availableLessons: availableLessons,

        // Options
        maxRecommendations: 5,
      };
    } catch (error) {
      console.error("Error preparing user data:", error);
      return null;
    }
  }

  /**
   * Get user's courses với progress
   */
  private async getUserCourses(
    userId: string | mongoose.Types.ObjectId,
    activity: any
  ) {
    const courses: any[] = [];

    for (const courseActivity of activity.courseActivities || []) {
      try {
        const course = await Course.findById(courseActivity.courseId)
          .select("title lessons")
          .lean();

        if (!course) continue;

        // Calculate progress
        const totalLessons = course.lessons?.length || 0;
        const completedLessons = activity.lessonActivities.filter(
          (la: any) =>
            la.courseId &&
            la.courseId.toString() === courseActivity.courseId.toString() &&
            la.isCompleted
        ).length;

        const progress =
          totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

        // Find stuck lesson (if any)
        const recentLessons = activity.lessonActivities
          .filter(
            (la: any) =>
              la.courseId &&
              la.courseId.toString() === courseActivity.courseId.toString()
          )
          .sort(
            (a: any, b: any) =>
              new Date(b.completedAt).getTime() -
              new Date(a.completedAt).getTime()
          );

        let stuckAt = null;
        if (recentLessons.length > 0) {
          const lastLesson = recentLessons[0];
          if (
            lastLesson.attempts &&
            lastLesson.attempts >= 3 &&
            lastLesson.taskData &&
            lastLesson.taskData.score / lastLesson.taskData.maxScore < 0.6
          ) {
            const lessonDoc = await Lesson.findById(lastLesson.lessonId)
              .select("title")
              .lean();
            stuckAt = lessonDoc?.title || "Unknown lesson";
          }
        }

        courses.push({
          courseId: courseActivity.courseId.toString(),
          title: course.title,
          progress: Math.round(progress),
          avgLessonTime: courseActivity.totalTimeSpent
            ? Math.round(courseActivity.totalTimeSpent / 60)
            : 20,
          stuckAt: stuckAt,
          lastStudied:
            courseActivity.lastAccessedAt?.toISOString() ||
            new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error processing course:", error);
      }
    }

    return courses;
  }

  /**
   * Get available lessons cho user
   */
  private async getAvailableLessons(userId: string | mongoose.Types.ObjectId) {
    try {
      // Get user's completed lessons
      const activity = await UserActivity.findOne({ userId });
      const completedLessonIds =
        activity?.lessonActivities
          ?.filter((la: any) => la.isCompleted)
          .map((la: any) => la.lessonId.toString()) || [];

      // Get all lessons not completed
      const lessons = await Lesson.find({
        _id: { $nin: completedLessonIds.map((id) => new mongoose.Types.ObjectId(id)) },
      })
        .select("_id course title difficulty taskType")
        .limit(20)
        .lean();

      return lessons.map((lesson: any) => ({
        lessonId: lesson._id.toString(),
        courseId: lesson.course?.toString() || "unknown",
        title: lesson.title || "Untitled Lesson",
        difficulty: "beginner", // Default, có thể lấy từ course
        skills: this.mapTaskTypeToSkills(lesson.taskType),
      }));
    } catch (error) {
      console.error("Error getting available lessons:", error);
      return [];
    }
  }

  /**
   * Map taskType sang skills
   */
  private mapTaskTypeToSkills(taskType?: string): string[] {
    if (!taskType) return ["reading"];

    const mapping: { [key: string]: string[] } = {
      listening: ["listening"],
      speaking: ["speaking"],
      reading: ["reading"],
      multiple_choice: ["reading"],
      fill_blank: ["writing", "reading"],
      matching: ["reading"],
    };

    return mapping[taskType] || ["reading"];
  }

  /**
   * Calculate study duration in days
   */
  private calculateStudyDuration(activity: any): number {
    if (!activity.dailyLearning || activity.dailyLearning.length === 0) {
      return 0;
    }

    const sorted = [...activity.dailyLearning].sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstDay = new Date(sorted[0].date);
    const today = new Date();

    const diffTime = Math.abs(today.getTime() - firstDay.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Default advice nếu AI fail
   */
  private getDefaultAdvice() {
    const defaultMessages = [
      "Keep up the great work! Consistency is key to success.",
      "You're making excellent progress! Keep learning every day.",
      "Great job on your learning journey! Stay motivated.",
      "Your dedication is impressive! Continue at your own pace.",
      "Well done! Every step forward counts.",
    ];

    const randomMessage = defaultMessages[Math.floor(Math.random() * defaultMessages.length)];

    return {
      message: randomMessage,
      tone: "encouraging" as const,
    };
  }
}

export default new AIRecommendationService();


import mongoose from "mongoose";
import UserActivity from "../models/user-activity.model";

/**
 * Helper functions để cập nhật UserActivity
 */
class ActivityTrackerHelper {
  /**
   * Cập nhật hoặc tạo mới daily learning stats
   */
  async updateDailyStats(
    userId: string | mongoose.Types.ObjectId,
    data: {
      studyTime?: number; // seconds
      lessonsCompleted?: number;
      cardsReviewed?: number;
      cardsLearned?: number;
      correctAnswers?: number;
      totalCards?: number;
    }
  ) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activity = await UserActivity.findOne({ userId });
      if (!activity) {
        throw new Error("UserActivity not found");
      }

      // Tìm daily record hôm nay
      const todayIndex = activity.dailyLearning.findIndex((day: any) => {
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);
        return dayDate.getTime() === today.getTime();
      });

      const correctRate =
        data.totalCards && data.totalCards > 0
          ? (data.correctAnswers! / data.totalCards) * 100
          : 0;

      if (todayIndex >= 0) {
        // Update existing record
        const todayRecord = activity.dailyLearning[todayIndex];
        todayRecord.totalStudyTime =
          (todayRecord.totalStudyTime || 0) + (data.studyTime || 0);
        todayRecord.lessonsCompleted =
          (todayRecord.lessonsCompleted || 0) + (data.lessonsCompleted || 0);
        todayRecord.cardsReviewed =
          (todayRecord.cardsReviewed || 0) + (data.cardsReviewed || 0);
        todayRecord.cardsLearned =
          (todayRecord.cardsLearned || 0) + (data.cardsLearned || 0);

        // Recalculate average correct rate
        if (correctRate > 0 && todayRecord.cardsReviewed) {
          const oldTotal =
            (todayRecord.correctRate || 0) *
            ((todayRecord.cardsReviewed || 0) - (data.cardsReviewed || 0));
          const newTotal = oldTotal + correctRate * (data.cardsReviewed || 0);
          todayRecord.correctRate = newTotal / todayRecord.cardsReviewed;
        }
      } else {
        // Create new record
        const streak = this.calculateStreak(activity.dailyLearning);
        activity.dailyLearning.push({
          date: today,
          totalStudyTime: data.studyTime || 0,
          lessonsCompleted: data.lessonsCompleted || 0,
          cardsReviewed: data.cardsReviewed || 0,
          cardsLearned: data.cardsLearned || 0,
          correctRate,
          streakDays: streak,
        });
      }

      await activity.save();
      return activity;
    } catch (error) {
      console.error("Error updating daily stats:", error);
      throw error;
    }
  }

  /**
   * Tính streak hiện tại
   */
  private calculateStreak(dailyLearning: any[]): number {
    if (dailyLearning.length === 0) return 1;

    const sorted = [...dailyLearning].sort(
      (a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let streak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sorted.length; i++) {
      const dayDate = new Date(sorted[i].date);
      dayDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (dayDate.getTime() === expectedDate.getTime()) {
        streak = i + 1;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Track lesson completion
   */
  async trackLessonCompletion(
    userId: string | mongoose.Types.ObjectId,
    lessonData: {
      lessonId: mongoose.Types.ObjectId;
      courseId?: mongoose.Types.ObjectId;
      lessonType: "video" | "task";
      taskType?:
        | "multiple_choice"
        | "fill_blank"
        | "listening"
        | "matching"
        | "speaking"
        | "reading";
      timeSpent: number; // seconds
      videoData?: {
        watchedDuration: number;
        totalDuration: number;
        isWatchedCompletely: boolean;
      };
      taskData?: {
        score: number;
        maxScore: number;
        correctAnswers: number;
        totalQuestions: number;
        isPassed: boolean;
      };
    }
  ) {
    try {
      const activity = await UserActivity.findOne({ userId });
      if (!activity) {
        throw new Error("UserActivity not found");
      }

      // Tìm lesson activity đã tồn tại
      const existingIndex = activity.lessonActivities.findIndex(
        (l: any) => l.lessonId.toString() === lessonData.lessonId.toString()
      );

      if (existingIndex >= 0) {
        // Update existing
        const lesson = activity.lessonActivities[existingIndex];
        lesson.completedAt = new Date();
        lesson.isCompleted = true;
        lesson.timeSpent = (lesson.timeSpent || 0) + lessonData.timeSpent;
        lesson.attempts = (lesson.attempts || 0) + 1;

        if (lessonData.taskType) {
          lesson.taskType = lessonData.taskType;
        }
        if (lessonData.videoData) {
          lesson.videoData = lessonData.videoData;
        }
        if (lessonData.taskData) {
          lesson.taskData = lessonData.taskData;
        }
      } else {
        // Create new
        activity.lessonActivities.push({
          lessonId: lessonData.lessonId,
          courseId: lessonData.courseId,
          lessonType: lessonData.lessonType,
          taskType: lessonData.taskType,
          startedAt: new Date(),
          completedAt: new Date(),
          timeSpent: lessonData.timeSpent,
          isCompleted: true,
          attempts: 1,
          videoData: lessonData.videoData,
          taskData: lessonData.taskData,
        });
      }

      await activity.save();

      // Update daily stats
      await this.updateDailyStats(userId, {
        studyTime: lessonData.timeSpent,
        lessonsCompleted: 1,
      });

      return activity;
    } catch (error) {
      console.error("Error tracking lesson completion:", error);
      throw error;
    }
  }

  /**
   * Track flashcard session
   */
  async trackFlashcardSession(
    userId: string | mongoose.Types.ObjectId,
    sessionData: {
      contentType: "flashlist" | "flashcard";
      contentId: mongoose.Types.ObjectId;
      cardsStudied: number;
      correctAnswers: number;
      sessionDuration: number; // seconds
    }
  ) {
    try {
      const activity = await UserActivity.findOne({ userId });
      if (!activity) {
        throw new Error("UserActivity not found");
      }

      // Add flashcard session
      activity.flashcardSessions.push({
        contentType: sessionData.contentType,
        contentId: sessionData.contentId,
        studiedAt: new Date(),
        cardsStudied: sessionData.cardsStudied,
        correctAnswers: sessionData.correctAnswers,
        sessionDuration: sessionData.sessionDuration,
      });

      await activity.save();

      // Update daily stats
      await this.updateDailyStats(userId, {
        studyTime: sessionData.sessionDuration,
        cardsReviewed: sessionData.cardsStudied,
        correctAnswers: sessionData.correctAnswers,
        totalCards: sessionData.cardsStudied,
      });

      return activity;
    } catch (error) {
      console.error("Error tracking flashcard session:", error);
      throw error;
    }
  }

  /**
   * Track individual card learning
   */
  async trackCardLearning(
    userId: string | mongoose.Types.ObjectId,
    cardData: {
      cardId: string | mongoose.Types.ObjectId;
      flashcardId: string | mongoose.Types.ObjectId;
      isCorrect: boolean;
      responseTime: number; // milliseconds
    }
  ) {
    try {
      const activity = await UserActivity.findOne({ userId });
      if (!activity) {
        throw new Error("UserActivity not found");
      }

      // Determine mastery level
      const previousAttempts = activity.cardLearning.filter(
        (c: any) => c.cardId.toString() === cardData.cardId.toString()
      );

      const correctCount = previousAttempts.filter(
        (c: any) => c.isCorrect
      ).length;
      const totalCount = previousAttempts.length;

      let masteryLevel: "learning" | "reviewing" | "mastered" = "learning";
      if (cardData.isCorrect && correctCount >= 3) {
        masteryLevel = "mastered";
      } else if (totalCount >= 2) {
        masteryLevel = "reviewing";
      }

      // Add card learning record
      activity.cardLearning.push({
        cardId: new mongoose.Types.ObjectId(cardData.cardId),
        flashcardId: new mongoose.Types.ObjectId(cardData.flashcardId),
        reviewedAt: new Date(),
        isCorrect: cardData.isCorrect,
        responseTime: cardData.responseTime,
        masteryLevel,
      });

      await activity.save();
      return activity;
    } catch (error) {
      console.error("Error tracking card learning:", error);
      throw error;
    }
  }

  /**
   * Track course progress
   */
  async trackCourseAccess(
    userId: string | mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId
  ) {
    try {
      const activity = await UserActivity.findOne({ userId });
      if (!activity) {
        throw new Error("UserActivity not found");
      }

      const existingIndex = activity.courseActivities.findIndex(
        (c: any) => c.courseId.toString() === courseId.toString()
      );

      if (existingIndex >= 0) {
        // Update last accessed
        activity.courseActivities[existingIndex].lastAccessedAt = new Date();
      } else {
        // Create new course activity
        activity.courseActivities.push({
          courseId,
          startedAt: new Date(),
          totalTimeSpent: 0,
          isCompleted: false,
          lastAccessedAt: new Date(),
        });
      }

      await activity.save();
      return activity;
    } catch (error) {
      console.error("Error tracking course access:", error);
      throw error;
    }
  }
}

export default new ActivityTrackerHelper();

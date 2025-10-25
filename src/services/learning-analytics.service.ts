import mongoose from "mongoose";
import UserActivity from "../models/user-activity.model";
import LearningInsights from "../models/learning-insights.model";

interface IUserActivity {
  userId: mongoose.Types.ObjectId;
  courseActivities: any[];
  lessonActivities: any[];
  flashcardSessions: any[];
  cardLearning: any[];
  dailyLearning: any[];
}

/**
 * Service tính toán và cập nhật LearningInsights từ UserActivity
 * Xử lý 80% dữ liệu bằng logic code thuần, không cần AI
 */
class LearningAnalyticsService {
  /**
   * 1️⃣ Tính learningPerformance
   */
  private calculatePerformance(activity: IUserActivity) {
    const { lessonActivities, flashcardSessions, dailyLearning } = activity;

    // weeklyProgress: so sánh điểm tuần này vs tuần trước
    const weeklyProgress = this.calculateWeeklyProgress(
      lessonActivities,
      flashcardSessions
    );

    // consistency: số ngày có học / 7 * 100
    const consistency = this.calculateConsistency(dailyLearning);

    // retention: correctAnswers / cardsStudied * 100 (7 ngày gần nhất)
    const retention = this.calculateRetention(flashcardSessions);

    // overallLevel: Rule-based theo điểm trung bình
    const overallLevel = this.calculateOverallLevel(
      lessonActivities,
      flashcardSessions
    );

    return {
      overallLevel,
      weeklyProgress,
      consistency,
      retention,
    };
  }

  private calculateWeeklyProgress(
    lessonActivities: any[],
    flashcardSessions: any[]
  ): number {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Điểm tuần này
    const thisWeekScore = this.calculateAverageScore(
      lessonActivities,
      flashcardSessions,
      oneWeekAgo,
      now
    );

    // Điểm tuần trước
    const lastWeekScore = this.calculateAverageScore(
      lessonActivities,
      flashcardSessions,
      twoWeeksAgo,
      oneWeekAgo
    );

    if (lastWeekScore === 0) return 0;

    return ((thisWeekScore - lastWeekScore) / lastWeekScore) * 100;
  }

  private calculateAverageScore(
    lessonActivities: any[],
    flashcardSessions: any[],
    startDate: Date,
    endDate: Date
  ): number {
    // Tính điểm trung bình từ task lessons
    const taskScores = lessonActivities
      .filter(
        (lesson) =>
          lesson.lessonType === "task" &&
          new Date(lesson.completedAt) >= startDate &&
          new Date(lesson.completedAt) <= endDate &&
          lesson.taskData
      )
      .map((lesson) => {
        const { score, maxScore } = lesson.taskData;
        return maxScore > 0 ? (score / maxScore) * 100 : 0;
      });

    // Tính điểm trung bình từ flashcards
    const flashcardScores = flashcardSessions
      .filter(
        (session) =>
          new Date(session.studiedAt) >= startDate &&
          new Date(session.studiedAt) <= endDate
      )
      .map((session) => {
        const { correctAnswers, cardsStudied } = session;
        return cardsStudied > 0 ? (correctAnswers / cardsStudied) * 100 : 0;
      });

    const allScores = [...taskScores, ...flashcardScores];
    if (allScores.length === 0) return 0;

    return allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
  }

  private calculateConsistency(dailyLearning: any[]): number {
    const last7Days = dailyLearning.filter((day) => {
      const dayDate = new Date(day.date);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return dayDate >= sevenDaysAgo;
    });

    return (last7Days.length / 7) * 100;
  }

  private calculateRetention(flashcardSessions: any[]): number {
    const last7Days = flashcardSessions.filter((session) => {
      const sessionDate = new Date(session.studiedAt);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return sessionDate >= sevenDaysAgo;
    });

    if (last7Days.length === 0) return 0;

    const totalCorrect = last7Days.reduce(
      (sum, s) => sum + (s.correctAnswers || 0),
      0
    );
    const totalStudied = last7Days.reduce(
      (sum, s) => sum + (s.cardsStudied || 0),
      0
    );

    return totalStudied > 0 ? (totalCorrect / totalStudied) * 100 : 0;
  }

  private calculateOverallLevel(
    lessonActivities: any[],
    flashcardSessions: any[]
  ): "beginner" | "intermediate" | "advanced" {
    const avgScore = this.calculateAverageScore(
      lessonActivities,
      flashcardSessions,
      new Date(0), // from beginning
      new Date()
    );

    if (avgScore < 60) return "beginner";
    if (avgScore < 80) return "intermediate";
    return "advanced";
  }

  /**
   * 2️⃣ Tính learningAnalysis.courseProgress
   */
  private calculateCourseProgress(activity: IUserActivity) {
    const { courseActivities, lessonActivities } = activity;

    // Đếm courses đang học
    const coursesInProgress = courseActivities.filter(
      (c) => !c.isCompleted
    ).length;

    // Tính thời gian hoàn thành trung bình (days)
    const completedCourses = courseActivities.filter((c) => c.isCompleted);
    const averageCompletionTime =
      completedCourses.length > 0
        ? completedCourses.reduce((sum, course) => {
            const start = new Date(course.startedAt).getTime();
            const end = new Date(course.completedAt).getTime();
            return sum + (end - start) / (1000 * 60 * 60 * 24); // days
          }, 0) / completedCourses.length
        : 0;

    // Tìm courses đang gặp khó khăn
    const strugglingCourses = this.findStrugglingCourses(
      courseActivities,
      lessonActivities
    );

    return {
      coursesInProgress,
      averageCompletionTime: Math.round(averageCompletionTime),
      strugglingCourses,
    };
  }

  private findStrugglingCourses(
    courseActivities: any[],
    lessonActivities: any[]
  ) {
    return courseActivities
      .filter((course) => !course.isCompleted)
      .map((course) => {
        const courseLessons = lessonActivities.filter(
          (l) => l.courseId?.toString() === course.courseId.toString()
        );

        const completedCount = courseLessons.filter(
          (l) => l.isCompleted
        ).length;
        const totalCount = courseLessons.length;

        // Nếu < 50% hoàn thành
        if (totalCount > 0 && completedCount / totalCount < 0.5) {
          // Tìm lesson cuối cùng chưa hoàn thành
          const stuckLesson = courseLessons.find((l) => !l.isCompleted);
          return {
            courseId: course.courseId,
            stuckAt: stuckLesson?.lessonId || "unknown",
          };
        }
        return null;
      })
      .filter((c) => c !== null);
  }

  /**
   * 3️⃣ Tính learningAnalysis.lessonMastery
   */
  private calculateLessonMastery(activity: IUserActivity) {
    const { lessonActivities } = activity;

    const videoLessons = lessonActivities.filter(
      (l) => l.lessonType === "video"
    );
    const taskLessons = lessonActivities.filter((l) => l.lessonType === "task");

    // Video lessons analysis
    const videoCompletionRate =
      videoLessons.length > 0
        ? (videoLessons.filter((v) => v.videoData?.isWatchedCompletely).length /
            videoLessons.length) *
          100
        : 0;

    const averageWatchTime =
      videoLessons.length > 0
        ? videoLessons.reduce((sum, v) => {
            if (v.videoData?.totalDuration > 0) {
              return (
                sum +
                (v.videoData.watchedDuration / v.videoData.totalDuration) * 100
              );
            }
            return sum;
          }, 0) / videoLessons.length
        : 0;

    const rewatch =
      videoLessons.length > 0
        ? videoLessons.reduce((sum, v) => sum + (v.attempts || 1), 0) /
          videoLessons.length
        : 1;

    // Task lessons analysis
    const taskScores = taskLessons
      .filter((t) => t.taskData)
      .map((t) => {
        const { score, maxScore } = t.taskData;
        return maxScore > 0 ? (score / maxScore) * 100 : 0;
      });

    const averageScore =
      taskScores.length > 0
        ? taskScores.reduce((sum, s) => sum + s, 0) / taskScores.length
        : 0;

    const averageAttempts =
      taskLessons.length > 0
        ? taskLessons.reduce((sum, t) => sum + (t.attempts || 1), 0) /
          taskLessons.length
        : 1;

    // Common mistakes (câu hỏi sai > 2 lần)
    const commonMistakes = this.findCommonMistakes(taskLessons);

    return {
      videoLessons: {
        averageWatchTime: Math.round(averageWatchTime),
        completionRate: Math.round(videoCompletionRate),
        rewatch: Math.round(rewatch * 10) / 10,
      },
      taskLessons: {
        averageScore: Math.round(averageScore),
        averageAttempts: Math.round(averageAttempts * 10) / 10,
        commonMistakes,
      },
    };
  }

  private findCommonMistakes(taskLessons: any[]): string[] {
    // Simplified: Lấy các lesson có attempts > 2
    return taskLessons
      .filter((t) => (t.attempts || 1) > 2)
      .map((t) => t.lessonId.toString())
      .slice(0, 5); // Top 5
  }

  /**
   * 4️⃣ Tính flashcardMastery
   */
  private calculateFlashcardMastery(activity: IUserActivity) {
    const { cardLearning, flashcardSessions } = activity;

    // Đếm theo mastery level
    const masteredCards = cardLearning.filter(
      (c) => c.masteryLevel === "mastered"
    ).length;
    const learningCards = cardLearning.filter(
      (c) => c.masteryLevel === "learning"
    ).length;

    // Difficult cards: isCorrect = false > 3 lần
    const cardFailCount = new Map<string, number>();
    cardLearning.forEach((card) => {
      if (!card.isCorrect) {
        const key = card.cardId.toString(); // ObjectId luôn dùng toString
        cardFailCount.set(key, (cardFailCount.get(key) || 0) + 1);
      }
    });
    const difficultCards = Array.from(cardFailCount.values()).filter(
      (count) => count > 3
    ).length;

    // Average response time
    const responseTimes = cardLearning
      .filter((c) => c.responseTime)
      .map((c) => c.responseTime);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : 0;

    // Daily retention: correctRate trong 24h gần nhất
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSessions = flashcardSessions.filter(
      (s) => new Date(s.studiedAt) >= yesterday
    );

    const dailyRetention =
      recentSessions.length > 0
        ? recentSessions.reduce((sum, s) => {
            return (
              sum +
              (s.cardsStudied > 0
                ? (s.correctAnswers / s.cardsStudied) * 100
                : 0)
            );
          }, 0) / recentSessions.length
        : 0;

    return {
      masteredCards,
      learningCards,
      difficultCards,
      averageResponseTime: Math.round(averageResponseTime),
      dailyRetention: Math.round(dailyRetention),
    };
  }

  /**
   * 4️⃣ Tính skillMastery (Nghe, Nói, Đọc, Viết) từ taskType
   */
  private calculateSkillMastery(activity: IUserActivity) {
    const { lessonActivities } = activity;

    // Map taskType → skill
    const skillMap: Record<string, string> = {
      listening: "listening",
      speaking: "speaking",
      reading: "reading",
      fill_blank: "writing",
      multiple_choice: "reading", // Giả định đọc hiểu
      matching: "reading", // Ghép từ cũng liên quan đọc
    };

    const skills = {
      listening: {
        level: 0,
        tasksCompleted: 0,
        averageScore: 0,
        lastPracticed: null as Date | null,
      },
      speaking: {
        level: 0,
        tasksCompleted: 0,
        averageScore: 0,
        lastPracticed: null as Date | null,
      },
      reading: {
        level: 0,
        tasksCompleted: 0,
        averageScore: 0,
        lastPracticed: null as Date | null,
      },
      writing: {
        level: 0,
        tasksCompleted: 0,
        averageScore: 0,
        lastPracticed: null as Date | null,
      },
    };

    // Lọc task lessons có taskType
    const taskLessons = lessonActivities.filter(
      (l) => l.lessonType === "task" && l.taskType && l.taskData
    );

    taskLessons.forEach((lesson) => {
      const skill = skillMap[lesson.taskType];
      if (!skill || !skills[skill as keyof typeof skills]) return;

      const skillData = skills[skill as keyof typeof skills];
      skillData.tasksCompleted += 1;

      // Tính điểm
      const { score, maxScore } = lesson.taskData;
      const taskScore = maxScore > 0 ? (score / maxScore) * 100 : 0;
      skillData.averageScore =
        (skillData.averageScore * (skillData.tasksCompleted - 1) + taskScore) /
        skillData.tasksCompleted;

      // Cập nhật lastPracticed
      if (lesson.completedAt) {
        const completedDate = new Date(lesson.completedAt);
        if (
          !skillData.lastPracticed ||
          completedDate > skillData.lastPracticed
        ) {
          skillData.lastPracticed = completedDate;
        }
      }
    });

    // Tính level dựa trên averageScore và tasksCompleted
    Object.keys(skills).forEach((key) => {
      const skill = skills[key as keyof typeof skills];
      const { averageScore, tasksCompleted } = skill;

      // Level = averageScore * (1 + log(tasksCompleted + 1) / 10)
      // Càng làm nhiều bài, level càng cao
      const multiplier = 1 + Math.log10(tasksCompleted + 1) / 10;
      skill.level = Math.min(100, Math.round(averageScore * multiplier));
      skill.averageScore = Math.round(skill.averageScore);
    });

    return skills;
  }

  /**
   * 5️⃣ Tính studyPatterns
   */
  private calculateStudyPatterns(activity: IUserActivity) {
    const { dailyLearning, flashcardSessions, lessonActivities } = activity;

    // Best study time
    const bestStudyTime = this.findBestStudyTime(dailyLearning);

    // Average session length
    const sessionLengths = [
      ...flashcardSessions.map((s) => s.sessionDuration || 0),
      ...lessonActivities.map((l) => l.timeSpent || 0),
    ].filter((t) => t > 0);

    const averageSessionLength =
      sessionLengths.length > 0
        ? sessionLengths.reduce((sum, t) => sum + t, 0) /
          sessionLengths.length /
          60
        : 0; // minutes

    // Study frequency (số ngày có học trong 7 ngày)
    const last7Days = dailyLearning.filter((day) => {
      const dayDate = new Date(day.date);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return dayDate >= sevenDaysAgo;
    });
    const studyFrequency = last7Days.length;

    // Current streak
    const currentStreak = this.calculateCurrentStreak(dailyLearning);

    // Longest streak
    const longestStreak = this.calculateLongestStreak(dailyLearning);

    // Preferred content
    const preferredContent = this.findPreferredContent(
      lessonActivities,
      flashcardSessions
    );

    return {
      bestStudyTime,
      averageSessionLength: Math.round(averageSessionLength),
      studyFrequency,
      currentStreak,
      longestStreak,
      preferredContent,
    };
  }

  private findBestStudyTime(dailyLearning: any[]): string {
    // Phân tích giờ học từ date
    const hourCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    dailyLearning.forEach((day) => {
      const hour = new Date(day.date).getHours();
      if (hour >= 6 && hour < 12) hourCounts.morning++;
      else if (hour >= 12 && hour < 18) hourCounts.afternoon++;
      else if (hour >= 18 && hour < 22) hourCounts.evening++;
      else hourCounts.night++;
    });

    const max = Math.max(...Object.values(hourCounts));
    const best = Object.entries(hourCounts).find(([_, count]) => count === max);

    return best ? best[0] : "morning";
  }

  private calculateCurrentStreak(dailyLearning: any[]): number {
    if (dailyLearning.length === 0) return 0;

    // Sort by date desc
    const sorted = [...dailyLearning].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const day of sorted) {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (currentDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateLongestStreak(dailyLearning: any[]): number {
    if (dailyLearning.length === 0) return 0;

    const sorted = [...dailyLearning].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1].date);
      const currDate = new Date(sorted[i].date);

      const diffDays = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return maxStreak;
  }

  private findPreferredContent(
    lessonActivities: any[],
    flashcardSessions: any[]
  ): string {
    const videoCount = lessonActivities.filter(
      (l) => l.lessonType === "video"
    ).length;
    const taskCount = lessonActivities.filter(
      (l) => l.lessonType === "task"
    ).length;
    const flashcardCount = flashcardSessions.length;

    const max = Math.max(videoCount, taskCount, flashcardCount);

    if (max === videoCount) return "video";
    if (max === taskCount) return "task";
    return "flashcard";
  }

  /**
   * Main function: Update LearningInsights
   * Includes safe defaults for new users and data validation
   */
  async updateLearningInsights(userId: string | mongoose.Types.ObjectId) {
    try {
      // Lấy UserActivity
      const activity = await UserActivity.findOne({ userId });
      if (!activity) {
        // User mới chưa có activity, tạo default insights
        return await this.createDefaultInsights(userId);
      }

      // Check if user has enough data
      const hasEnoughData = this.validateDataSufficiency(activity);

      // Tìm hoặc tạo mới LearningInsights
      let insights = await LearningInsights.findOne({ userId });
      if (!insights) {
        insights = new LearningInsights({ userId });
      }

      // Tính toán các phần (80% bằng code)
      if (hasEnoughData) {
        insights.learningPerformance = this.calculatePerformance(
          activity
        ) as any;
        insights.learningAnalysis = {
          courseProgress: this.calculateCourseProgress(activity) as any,
          lessonMastery: this.calculateLessonMastery(activity) as any,
          flashcardMastery: this.calculateFlashcardMastery(activity) as any,
          skillMastery: this.calculateSkillMastery(activity) as any,
        };
        insights.studyPatterns = this.calculateStudyPatterns(activity) as any;
      } else {
        // Chưa đủ dữ liệu, khởi tạo với giá trị mặc định
        insights.learningPerformance = this.getDefaultPerformance() as any;
        insights.learningAnalysis = this.getDefaultAnalysis() as any;
        insights.studyPatterns = this.getDefaultStudyPatterns() as any;
      }

      // Đếm số data points để biết độ tin cậy
      const dataPoints = this.countDataPoints(activity);

      // Cập nhật metadata
      insights.analysisDate = new Date();
      insights.modelMetadata = {
        version: "1.0.0",
        confidence: hasEnoughData ? 100 : Math.min(dataPoints * 10, 100), // Scale với data
        lastUpdated: new Date(),
        lastSyncedAt: new Date(),
        dataPoints,
      };

      // Lưu vào database
      await insights.save();

      return insights;
    } catch (error: any) {
      console.error("Error updating learning insights:", error);
      throw error;
    }
  }

  /**
   * Validate if user has enough data for accurate analysis
   */
  private validateDataSufficiency(activity: IUserActivity): boolean {
    const { lessonActivities, flashcardSessions, cardLearning, dailyLearning } =
      activity;

    // Cần ít nhất 1 trong các điều kiện sau:
    // - 3+ lessons completed
    // - 2+ flashcard sessions
    // - 10+ cards learned
    // - 2+ days of learning
    return (
      lessonActivities.length >= 3 ||
      flashcardSessions.length >= 2 ||
      cardLearning.length >= 10 ||
      dailyLearning.length >= 2
    );
  }

  /**
   * Count total data points for confidence calculation
   */
  private countDataPoints(activity: IUserActivity): number {
    const { lessonActivities, flashcardSessions, cardLearning, dailyLearning } =
      activity;

    return (
      lessonActivities.length +
      flashcardSessions.length +
      cardLearning.length +
      dailyLearning.length
    );
  }

  /**
   * Create default insights for new users
   */
  private async createDefaultInsights(
    userId: string | mongoose.Types.ObjectId
  ) {
    const insights = new LearningInsights({
      userId,
      learningPerformance: this.getDefaultPerformance(),
      learningAnalysis: this.getDefaultAnalysis(),
      studyPatterns: this.getDefaultStudyPatterns(),
      analysisDate: new Date(),
      modelMetadata: {
        version: "1.0.0",
        confidence: 0,
        lastUpdated: new Date(),
        lastSyncedAt: new Date(),
        dataPoints: 0,
      },
    });

    await insights.save();
    return insights;
  }

  /**
   * Default performance for new users
   */
  private getDefaultPerformance() {
    return {
      overallLevel: "beginner" as const,
      weeklyProgress: 0,
      consistency: 0,
      retention: 0,
    };
  }

  /**
   * Default analysis for new users
   */
  private getDefaultAnalysis() {
    return {
      courseProgress: {
        coursesInProgress: 0,
        averageCompletionTime: 0,
        strugglingCourses: [],
      },
      lessonMastery: {
        videoLessons: {
          averageWatchTime: 0,
          completionRate: 0,
          rewatch: 0,
        },
        taskLessons: {
          averageScore: 0,
          averageAttempts: 0,
          commonMistakes: [],
        },
      },
      flashcardMastery: {
        masteredCards: 0,
        learningCards: 0,
        difficultCards: 0,
        averageResponseTime: 0,
        dailyRetention: 0,
      },
      skillMastery: {
        listening: {
          level: 0,
          tasksCompleted: 0,
          averageScore: 0,
          lastPracticed: null,
        },
        speaking: {
          level: 0,
          tasksCompleted: 0,
          averageScore: 0,
          lastPracticed: null,
        },
        reading: {
          level: 0,
          tasksCompleted: 0,
          averageScore: 0,
          lastPracticed: null,
        },
        writing: {
          level: 0,
          tasksCompleted: 0,
          averageScore: 0,
          lastPracticed: null,
        },
      },
    };
  }

  /**
   * Default study patterns for new users
   */
  private getDefaultStudyPatterns() {
    return {
      bestStudyTime: "morning",
      averageSessionLength: 0,
      studyFrequency: 0,
      currentStreak: 0,
      longestStreak: 0,
      preferredContent: "video",
    };
  }
}

export default new LearningAnalyticsService();

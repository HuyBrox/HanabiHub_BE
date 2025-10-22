import mongoose, { Document } from "mongoose";

/**
 * 📚 UserCourseProgress Model
 *
 * Lưu vết tiến độ học tập của user trong từng khóa học:
 * - Bài học cuối cùng đang học (để resume)
 * - Các bài đã hoàn thành (để hiển thị dấu tích)
 * - Checkpoint data (thời gian, điểm số, v.v.)
 */

// TypeScript interface
interface ICompletedLesson {
  lessonId: mongoose.Types.ObjectId;
  completedAt: Date;
  score?: number;
  maxScore?: number;
  attempts: number;
}

interface ICurrentLessonProgress {
  videoTimestamp: number;
  taskAnswers: any;
  lastAccessedAt: Date;
}

interface IUserCourseProgress extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  currentLessonId?: mongoose.Types.ObjectId;
  currentLessonProgress: ICurrentLessonProgress;
  completedLessons: ICompletedLesson[];
  status: "not_started" | "in_progress" | "completed";
  startedAt?: Date;
  completedAt?: Date;
  totalTimeSpent: number;
  progressPercentage: number;

  // Methods
  isLessonCompleted(lessonId: string): boolean;
  markLessonComplete(lessonId: string, score?: number, maxScore?: number): void;
  updateCurrentLesson(lessonId: string, videoTimestamp?: number, taskAnswers?: any): void;
}

const userCourseProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    // Bài học hiện tại (để resume lần sau)
    currentLessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
    },

    currentLessonProgress: {
      // Cho video: thời điểm đang xem (seconds)
      videoTimestamp: {
        type: Number,
        default: 0,
      },
      // Cho task: dữ liệu tạm thời (nếu chưa submit)
      taskAnswers: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      // Lần cuối cùng access bài này
      lastAccessedAt: {
        type: Date,
        default: Date.now,
      },
    },

    // Danh sách các bài đã hoàn thành
    completedLessons: [
      {
        lessonId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Lesson",
          required: true,
        },
        completedAt: {
          type: Date,
          default: Date.now,
        },
        // Điểm số (nếu là task lesson)
        score: Number,
        maxScore: Number,
        // Số lần học lại
        attempts: {
          type: Number,
          default: 1,
        },
      },
    ],

    // Trạng thái khóa học
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },

    // Thời gian bắt đầu khóa học
    startedAt: {
      type: Date,
    },

    // Thời gian hoàn thành khóa học
    completedAt: {
      type: Date,
    },

    // Tổng thời gian học (seconds)
    totalTimeSpent: {
      type: Number,
      default: 0,
    },

    // Progress percentage
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
    collection: "usercourseprogress",
  }
);

// Compound index để query nhanh
userCourseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Index để tìm courses in progress
userCourseProgressSchema.index({ userId: 1, status: 1 });

// Method: Check nếu lesson đã hoàn thành
userCourseProgressSchema.methods.isLessonCompleted = function (
  lessonId: string
): boolean {
  return this.completedLessons.some(
    (lesson: any) => lesson.lessonId.toString() === lessonId.toString()
  );
};

// Method: Mark lesson as completed
userCourseProgressSchema.methods.markLessonComplete = function (
  lessonId: string,
  score?: number,
  maxScore?: number
) {
  // Check nếu đã complete rồi thì tăng attempts
  const existingIndex = this.completedLessons.findIndex(
    (lesson: any) => lesson.lessonId.toString() === lessonId.toString()
  );

  if (existingIndex !== -1) {
    // Đã complete, chỉ tăng attempts
    this.completedLessons[existingIndex].attempts += 1;
    if (score !== undefined) {
      this.completedLessons[existingIndex].score = score;
      this.completedLessons[existingIndex].maxScore = maxScore;
    }
  } else {
    // Chưa complete, thêm mới
    this.completedLessons.push({
      lessonId: new mongoose.Types.ObjectId(lessonId),
      completedAt: new Date(),
      score,
      maxScore,
      attempts: 1,
    });
  }
};

// Method: Update current lesson
userCourseProgressSchema.methods.updateCurrentLesson = function (
  lessonId: string,
  videoTimestamp?: number,
  taskAnswers?: any
) {
  this.currentLessonId = new mongoose.Types.ObjectId(lessonId);
  this.currentLessonProgress.lastAccessedAt = new Date();

  if (videoTimestamp !== undefined) {
    this.currentLessonProgress.videoTimestamp = videoTimestamp;
  }

  if (taskAnswers !== undefined) {
    this.currentLessonProgress.taskAnswers = taskAnswers;
  }

  // Cập nhật status nếu chưa bắt đầu
  if (this.status === "not_started") {
    this.status = "in_progress";
    this.startedAt = new Date();
  }
};

const UserCourseProgress = mongoose.model<IUserCourseProgress>(
  "UserCourseProgress",
  userCourseProgressSchema
);

export default UserCourseProgress;


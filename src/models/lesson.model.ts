import mongoose, { Schema, Model } from "mongoose";
import { ILesson, LessonType, TaskType } from "../types/lesson.types";
import Comment from "./comment.model";

const lessonSchema = new Schema<ILesson>(
  {
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["video", "task"] as LessonType[],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    jsonTask: {
      type: mongoose.Schema.Types.Mixed, //types.Mixed để lưu trữ dữ liệu JSON
      default: null,
    },
    taskType: {
      type: String,
      enum: [
        "multiple_choice",
        "fill_blank",
        "listening",
        "matching",
        "speaking",
        "reading",
      ] as TaskType[],
      default: null,
    },
    videoUrl: {
      type: String,
    },
    videoType: {
      type: String,
      enum: ["upload", "youtube"],
      default: "youtube",
    },
    userCompleted: [
      //mảng user đã hoàn thành bài học
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    Comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  },
  { timestamps: true }
);

lessonSchema.pre("save", function (next) {
  if (this.type === "task" && !this.jsonTask) {
    return next(new Error("jsonTask is required for task type"));
  }
  if (this.type === "task" && this.jsonTask) {
    // Tự động parse taskType từ jsonTask nếu có
    if (this.jsonTask.type) {
      this.taskType = this.jsonTask.type;
    }
  }
  if (this.type === "video" && !this.videoUrl) {
    return next(new Error("videoUrl is required for video type"));
  }
  next();
});

const Lesson: Model<ILesson> = mongoose.model<ILesson>("Lesson", lessonSchema);
export default Lesson;

//định nghĩa ra các kiểu dùng cho Lesson để quản lý chặt chẽ hơn
import { Document, Types } from "mongoose";

// Enum cho lesson type
export type LessonType = "video" | "task";

// Enum cho task type (loại bài tập)
export type TaskType =
  | "multiple_choice" // Trắc nghiệm
  | "fill_blank" // Điền từ
  | "listening" // Nghe hiểu
  | "matching" // Ghép từ
  | "speaking" // Phát âm
  | "reading"; // Đọc hiểu

// Interface cho task JSON structure
export interface ITaskData {
  lessonId?: string;
  title?: string;
  type: TaskType; // Loại bài tập
  instructions?: string;
  audioUrl?: string; // Cho listening
  items?: any[]; // Flexible cho các dạng bài khác nhau
  timeLimit?: number; // thời gian làm bài (phút)
  maxAttempts?: number; // số lần làm tối đa
  [key: string]: any; // flexible cho các task khác nhau
}

// Interface cơ bản cho Lesson (không kế thừa Document)
export interface ILessonBase {
  title: string; // tiêu đề bài học
  type: LessonType; // loại bài học
  content: string; // nội dung bài học
  jsonTask?: ITaskData; // dữ liệu task (nếu type là task)
  taskType?: TaskType; // loại task (multiple_choice, fill_blank, listening, matching, speaking, reading)
  videoUrl?: string; // URL video (nếu type là video)
  videoType?: "youtube" | "upload";
  Comments: Types.ObjectId[]; // ref tới Comment
  userCompleted: Types.ObjectId[]; // ref tới User đã hoàn thành bài học
}

// Interface cho Mongoose Document (kế thừa Document)
export interface ILesson extends ILessonBase, Document {
  _id: Types.ObjectId; // id mặc định của Mongo
  taskType?: TaskType; // loại task
  videoType?: "youtube" | "upload";
  createdAt?: Date;
  updatedAt?: Date;
}

// Request types
export interface CreateVideoLessonRequest {
  title: string;
  content: string;
  videoUrl: string;
  type: "video";
}

export interface CreateTaskLessonRequest {
  title: string;
  content: string;
  jsonTask: ITaskData;
  type: "task";
}

export type CreateLessonRequest =
  | CreateVideoLessonRequest
  | CreateTaskLessonRequest;

export interface UpdateVideoLessonRequest {
  title?: string;
  content?: string;
  videoUrl?: string;
}

export interface UpdateTaskLessonRequest {
  title?: string;
  content?: string;
  jsonTask?: ITaskData;
}

export type UpdateLessonRequest =
  | UpdateVideoLessonRequest
  | UpdateTaskLessonRequest;

export interface GetLessonsRequest {
  type?: LessonType; // filter by type
  limit?: number;
  page?: number;
  search?: string; // tìm kiếm theo title/content
}

// Utility types để tái sử dụng
export type VideoLesson = ILesson & { type: "video"; videoUrl: string };
export type TaskLesson = ILesson & { type: "task"; jsonTask: ITaskData };

export type LessonPublicInfo = Pick<
  ILesson,
  "title" | "type" | "content" | "createdAt"
>;
export type LessonWithCommentsCount = ILesson & { commentsCount: number };

export type LessonCreateInput = Pick<
  ILessonBase,
  "title" | "type" | "content"
> & {
  jsonTask?: ITaskData;
  videoUrl?: string;
};

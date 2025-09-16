//định nghĩa kiểu dữ liệu cho Comment - chỉ interface cho model
import { Document, Types } from "mongoose";

// Enum cho target model
export type CommentTargetModel = "Post" | "Lesson";

// Interface cho Comment Document - chỉ cần cái này thôi
export interface IComment extends Document {
  _id: Types.ObjectId;
  text: string;
  author: Types.ObjectId;
  likes: Types.ObjectId[];
  parentId?: Types.ObjectId;
  score: number;
  depth: number;
  targetModel: CommentTargetModel;
  targetId: Types.ObjectId;
  path: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
  replies?: IComment[];
}

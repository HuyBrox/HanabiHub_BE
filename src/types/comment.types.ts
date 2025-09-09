
//định nghĩa ra các kiểu dùng cho Comment để quản lý chặt chẽ hơn
import { Document, Types } from "mongoose";

// Enum cho target model
export type CommentTargetModel = "Post" | "Lesson";

// Interface cơ bản cho Comment (không kế thừa Document)
export interface ICommentBase {
  text: string;
  author: Types.ObjectId;              // ref tới User
  likes: Types.ObjectId[];             // ref tới User
  parentId?: Types.ObjectId;           // ref tới Comment (null nếu là comment gốc)
  score: number;                       // điểm upvote/downvote
  depth: number;                       // độ sâu (0 = gốc, 1 = reply, ...)
  targetModel: CommentTargetModel;     // Post hoặc Lesson
  targetId: Types.ObjectId;            // id của Post hoặc Lesson
  path: Types.ObjectId[];              // materialized path từ gốc
}


export interface IComment extends ICommentBase, Document {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  replies?: IComment[];                // virtual field
}

// Request types
export interface CreateCommentRequest {
  text: string;
  targetModel: CommentTargetModel;
  targetId: string;
  parentId?: string;                   // optional cho reply
}

export interface UpdateCommentRequest {
  text: string;
}

export interface LikeCommentRequest {
  commentId: string;
}

// Utility types để tái sử dụng
export type CommentWithoutAuthor = Omit<IComment, 'author'>;
export type CommentPublicInfo = Pick<IComment, 'text' | 'likes' | 'score' | 'depth' | 'createdAt' | 'replies'>;
export type CommentCreateInput = Pick<ICommentBase, 'text' | 'author' | 'targetModel' | 'targetId' | 'parentId'>;
export type CommentTreeNode = IComment & { replies: CommentTreeNode[] };

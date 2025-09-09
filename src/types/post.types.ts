//định nghĩa ra các kiểu dùng cho Post để quản lý chặt chẽ hơn
import { Document, Types } from "mongoose";

// Interface cơ bản cho Post (không kế thừa Document)
export interface IPostBase {
  caption?: string;
  img?: string;
  author: Types.ObjectId;              // ref tới User
  desc?: string;
  likes: Types.ObjectId[];             // ref tới User
  comments: Types.ObjectId[];          // ref tới Comment
}

// Interface cho Mongoose Document (kế thừa Document)
export interface IPost extends IPostBase, Document {
  _id: Types.ObjectId;                 // id mặc định của Mongo
  createdAt?: Date;
  updatedAt?: Date;
}

// Request types
export interface CreatePostRequest {
  caption?: string;
  img?: string;
  desc?: string;
}

export interface UpdatePostRequest {
  caption?: string;
  img?: string;
  desc?: string;
}

export interface LikePostRequest {
  postId: string;
}

export interface CommentPostRequest {
  postId: string;
  content: string;
}

// Utility types để tái sử dụng
export type PostWithoutAuthor = Omit<IPost, 'author'>;
export type PostPublicInfo = Pick<IPost, 'caption' | 'img' | 'desc' | 'likes' | 'comments' | 'createdAt'>;
export type PostCreateInput = Pick<IPostBase, 'caption' | 'img' | 'desc' | 'author'>;

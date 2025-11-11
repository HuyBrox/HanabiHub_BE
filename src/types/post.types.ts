import { Document, Types } from "mongoose";

export interface IPost extends Document {
  _id: Types.ObjectId;
  caption?: string;
  images?: string[];
  author: Types.ObjectId;
  desc?: string;
  likes: Types.ObjectId[];
  comments: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PostPlainObject {
  _id: Types.ObjectId | string;
  caption?: string;
  images?: string[];
  author: Types.ObjectId | string | any;
  desc?: string;
  likes: Types.ObjectId[] | string[];
  comments?: Types.ObjectId[] | string[];
  commentCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

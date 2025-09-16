//định nghĩa kiểu dữ liệu cho Post - chỉ interface cho model
import { Document, Types } from "mongoose";

// Interface cho Post Document - chỉ cần cái này thôi
export interface IPost extends Document {
  _id: Types.ObjectId;
  caption?: string;
  img?: string;
  author: Types.ObjectId;
  desc?: string;
  likes: Types.ObjectId[];
  comments: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

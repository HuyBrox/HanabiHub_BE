//định nghĩa kiểu dữ liệu cho FlashList - chỉ interface cho model
import { Document, Types } from "mongoose";

// Interface cho FlashList Document - chỉ cần cái này thôi
export interface IFlashList extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  isPublic: boolean;
  title: string;
  flashcards: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

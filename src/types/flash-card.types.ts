//định nghĩa kiểu dữ liệu cho FlashCard - chỉ interface cho model
import { Document, Types } from "mongoose";

// Interface cơ bản cho Card item
export interface ICardItem {
  vocabulary: string;
  meaning: string;
}

// Interface cho FlashCard Document - chỉ cần cái này thôi
export interface IFlashCard extends Document {
  _id: Types.ObjectId;
  name: string;
  cards: ICardItem[];
  user: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

//định nghĩa kiểu dữ liệu cho FlashList - chỉ interface cho model
import { Document, Types } from "mongoose";

// Interface cho FlashList Document - chỉ cần cái này thôi
export interface IFlashList extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  isPublic: boolean;
  title: string;
  flashcards: Types.ObjectId[];
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  thumbnail: string;
  // `rating` removed from schema; average rating should be computed from `ratings` when needed
  averageRating?: number; // optional computed value returned by controllers
  // ratings stores per-user ratings so updates/changes can be handled
  ratings?: {
    user: Types.ObjectId;
    rating: number;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
  description: string;
}

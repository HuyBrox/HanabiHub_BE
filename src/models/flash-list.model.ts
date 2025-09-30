import { de } from "zod/v4/locales/index.cjs";
import mongoose, { Schema, Model } from "mongoose";
import { IFlashList } from "../types/flash-list.types";
import User from "./user.model";

const flashListSchema = new Schema<IFlashList>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User,
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    title: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      enum: ["N5", "N4", "N3", "N2", "N1"],
      default: "N5",
    },
    description: {
      type: String,
      default: "",
    },
    thumbnail: {
      type: String,
      default:
        "https://tse1.mm.bing.net/th/id/OIP.rc3gjFWuSBAb9IMTQHaHKQAAAA?rs=1&pid=ImgDetMain&o=7&rm=3",
    },
    rating: {
      type: Number,
      default: 0,
    }, // điểm trung bình
    ratingCount: {
      type: Number,
      default: 0,
    }, // số lượt đánh giá
    flashcards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FlashCard",
      },
    ],
  },
  { timestamps: true }
);

const FlashList: Model<IFlashList> = mongoose.model<IFlashList>(
  "FlashList",
  flashListSchema
);
export default FlashList;

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

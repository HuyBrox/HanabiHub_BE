import mongoose, { Schema, Model } from "mongoose";
import { IFlashCard } from "../types/flash-card.types";
import User from "../models/user.model";

const flashCardSchema = new Schema<IFlashCard>(
  {
    name: {
      type: String,
      required: true,
    },
    cards: [
      {
        vocabulary: {
          type: String,
          required: true,
        },
        meaning: {
          type: String,
          required: true,
        },
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    thumbnail: {
      type: String,
      default:
        "https://www.senviet.art/wp-content/uploads/2021/12/duytanuni.jpg",
    },
    description: {
      type: String,
      default: "",
    },
    level: {
      type: String,
      enum: ["N5", "N4", "N3", "N2", "N1"],
      default: "N5",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User,
      required: true,
    },
  },
  { timestamps: true }
);

const FlashCard: Model<IFlashCard> = mongoose.model<IFlashCard>(
  "FlashCard",
  flashCardSchema
);
export default FlashCard;

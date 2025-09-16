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

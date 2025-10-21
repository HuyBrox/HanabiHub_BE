import mongoose, { Schema, Model, Document, Types } from "mongoose";

export type NewsStatus = "draft" | "published";

export interface INews extends Document {
  _id: Types.ObjectId;
  title: string;
  content: string; // HTML or markdown
  author?: Types.ObjectId;
  status: NewsStatus;
  views: number;
  tags?: string[];
  publishedAt?: Date | null;
  deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const NewsSchema = new Schema<INews>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    views: { type: Number, default: 0 },
    tags: [{ type: String }],
    publishedAt: { type: Date, default: null },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const News: Model<INews> = mongoose.model<INews>("News", NewsSchema);
export default News;

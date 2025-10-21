import mongoose, { Schema, Model, Document, Types } from "mongoose";

export type TemplateType = "system" | "personal";

export interface ITemplate extends Document {
  _id: Types.ObjectId;
  name: string;
  type: TemplateType;
  title: string;
  content: string;
  usageCount: number;
  deleted: boolean;
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    type: { type: String, enum: ["system", "personal"], default: "system" },
    title: { type: String, required: true },
    content: { type: String, required: true },
    usageCount: { type: Number, default: 0 },
    deleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Template: Model<ITemplate> = mongoose.model<ITemplate>(
  "Template",
  TemplateSchema
);
export default Template;

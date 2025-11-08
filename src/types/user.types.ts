import { de } from "zod/v4/locales/index.cjs";
//định nghĩa kiểu dữ liệu cho User - chỉ interface cho model
import { Document, Types } from "mongoose";

// Định nghĩa level type để tái sử dụng
export type UserLevel = "N5" | "N4" | "N3" | "N2" | "N1";

// Interface cho refresh token device
export interface RefreshTokenDevice {
  token: string;
  device?: string;
  createdAt: Date;
}

// Interface cho User Document - chỉ cần cái này thôi
export interface IUser extends Document {
  _id: Types.ObjectId;
  deleted: boolean;
  fullname: string;
  username: string;
  email: string;
  gender: string;
  password?: string;
  googleId?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  address?: string;
  course?: Types.ObjectId;
  lastActiveAt: Date;
  posts: number;
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  level: UserLevel;
  isActive: boolean;
  isAdmin: boolean;
  isOnline: boolean;
  isPrivate: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

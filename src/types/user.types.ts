//định nghĩa ra các kiểu dùng trong từng controller để quản lý chặc chẽ hơn
import { Document, Types } from "mongoose";

// Định nghĩa level type để tái sử dụng
export type UserLevel = "N5" | "N4" | "N3" | "N2" | "N1";

// Interface cơ bản cho User (không kế thừa Document)
export interface IUserBase {
  fullname: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  address?: string;
  course?: Types.ObjectId;             // ref tới Course
  lastActiveAt: Date;
  posts: number;
  followers: Types.ObjectId[];         // ref tới User
  following: Types.ObjectId[];         // ref tới User
  level: UserLevel;
  isActive: boolean;
  isAdmin: boolean;
}

// Interface cho Mongoose Document (kế thừa Document)
export interface IUser extends IUserBase, Document {
  _id: Types.ObjectId;                 // id mặc định của Mongo
  createdAt?: Date;
  updatedAt?: Date;
}


export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  fullname: string;
  //xác thực mật khẩu
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  username?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  address?: string;
  level?: UserLevel;
  //không cho update email và password
}
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
//

// Utility types để tái sử dụng
//omit là bỏ thuộc tính, pick là chọn thuộc tính
export type UserWithoutPassword = Omit<IUser, 'password'>;
export type UserPublicInfo = Pick<IUser, 'fullname' | 'username' | 'avatar' | 'bio' | 'level' | 'posts' | 'followers' | 'following'>;
export type UserCreateInput = Pick<IUserBase, 'fullname' | 'username' | 'email' | 'password'>;

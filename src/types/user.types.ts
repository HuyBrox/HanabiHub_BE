//định nghĩa ra các kiểu dùng trong từng controller để quản lý chặc chẽ hơn
import { Document, Types } from "mongoose";

// Định nghĩa level type để tái sử dụng
export type UserLevel = "N5" | "N4" | "N3" | "N2" | "N1";

// Interface cho refresh token device
export interface RefreshTokenDevice {
  token: string;
  device?: string;
  createdAt: Date;
}

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
  refreshToken?: string; // Single refresh token for simplicity
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
  Otp: string; //mã otp gửi về email
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
  logoutAll?: boolean; // true = logout all devices, false = logout current device only
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    fullname: string;
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
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
  Otp: string; //mã otp gửi về email
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    fullname: string;
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
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

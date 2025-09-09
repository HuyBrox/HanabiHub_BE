//định nghĩa ra các kiểu dùng cho Message để quản lý chặt chẽ hơn
import { Document, Types } from "mongoose";

// Interface cơ bản cho Message (không kế thừa Document)
export interface IMessageBase {
  receiverId: Types.ObjectId;          // ref tới User (người nhận)
  senderId: Types.ObjectId;            // ref tới User (người gửi)
  message: string;                     // nội dung tin nhắn
  isRead: boolean;                     // đã đọc hay chưa
}

// Interface cho Mongoose Document (kế thừa Document)
export interface IMessage extends IMessageBase, Document {
  _id: Types.ObjectId;                 // id mặc định của Mongo
  createdAt?: Date;
  updatedAt?: Date;
}

// Request types
export interface SendMessageRequest {
  receiverId: string;
  message: string;
}

export interface MarkMessagesAsReadRequest {
  messageIds: string[];                // array message IDs để mark as read
}

export interface GetMessagesRequest {
  receiverId?: string;                 // lấy tin nhắn với user cụ thể
  limit?: number;
  page?: number;
}

// Utility types để tái sử dụng
export type MessageWithPopulatedUsers = Omit<IMessage, 'senderId' | 'receiverId'> & {
  senderId: { _id: Types.ObjectId; fullname: string; username: string; avatar?: string };
  receiverId: { _id: Types.ObjectId; fullname: string; username: string; avatar?: string };
};

export type MessageCreateInput = Pick<IMessageBase, 'receiverId' | 'senderId' | 'message'>;
export type MessagePublicInfo = Pick<IMessage, 'message' | 'isRead' | 'createdAt'>;

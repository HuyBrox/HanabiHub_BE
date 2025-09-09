//định nghĩa ra các kiểu dùng cho Conversation để quản lý chặt chẽ hơn
import { Document, Types } from "mongoose";

// Interface cho unread message item
export interface IUnreadMessage {
  userId: Types.ObjectId;              // ref tới User
  count: number;                       // số tin nhắn chưa đọc của user này
}

// Interface cơ bản cho Conversation (không kế thừa Document)
export interface IConversationBase {
  members: Types.ObjectId[];           // ref tới User
  messages: Types.ObjectId[];          // ref tới Message
  unreadMessages: IUnreadMessage[];    // danh sách tin nhắn chưa đọc theo từng user
}

// Interface cho Mongoose Document (kế thừa Document)
export interface IConversation extends IConversationBase, Document {
  _id: Types.ObjectId;                 // id mặc định của Mongo
  createdAt?: Date;
  updatedAt?: Date;
}

// Request types
export interface CreateConversationRequest {
  memberIds: string[];                 // array user IDs
}

export interface AddMemberRequest {
  conversationId: string;
  memberIds: string[];
}

export interface RemoveMemberRequest {
  conversationId: string;
  memberId: string;
}

export interface MarkConversationAsReadRequest {
  conversationId: string;
  userId: string;                      // user đã đọc tin nhắn
}

export interface GetUnreadCountRequest {
  conversationId: string;
  userId: string;
}

// Utility types để tái sử dụng
export type ConversationWithPopulatedMembers = Omit<IConversation, 'members'> & {
  members: { _id: Types.ObjectId; fullname: string; username: string; avatar?: string }[];
};

export type ConversationWithLastMessage = IConversation & {
  lastMessage?: {
    _id: Types.ObjectId;
    text: string;
    sender: Types.ObjectId;
    createdAt: Date;
  };
};

export type ConversationCreateInput = Pick<IConversationBase, 'members'>;

//định nghĩa ra các kiểu dùng cho FlashCard để quản lý chặt chẽ hơn
import { Document, Types } from "mongoose";

// Interface cho Card item
export interface ICardItem {
  vocabulary: string;                  // từ vựng
  meaning: string;                     // nghĩa
}

// Interface cơ bản cho FlashCard (không kế thừa Document)
export interface IFlashCardBase {
  name: string;                        // tên bộ flashcard
  cards: ICardItem[];                  // danh sách thẻ từ vựng
  user: Types.ObjectId;                // ref tới User (chủ sở hữu)
}

// Interface cho Mongoose Document (kế thừa Document)
export interface IFlashCard extends IFlashCardBase, Document {
  _id: Types.ObjectId;                 // id mặc định của Mongo
  createdAt?: Date;
  updatedAt?: Date;
}

// Request types
export interface CreateFlashCardRequest {
  name: string;
  cards?: ICardItem[];                 // optional, có thể tạo rồi thêm card sau
}

export interface UpdateFlashCardRequest {
  name?: string;
  cards?: ICardItem[];
}

export interface AddCardRequest {
  flashCardId: string;
  vocabulary: string;
  meaning: string;
}

export interface UpdateCardRequest {
  flashCardId: string;
  cardIndex: number;                   // index của card trong array
  vocabulary?: string;
  meaning?: string;
}

export interface RemoveCardRequest {
  flashCardId: string;
  cardIndex: number;
}

// Utility types để tái sử dụng
export type FlashCardWithoutUser = Omit<IFlashCard, 'user'>;
export type FlashCardPublicInfo = Pick<IFlashCard, 'name' | 'cards' | 'createdAt' | 'updatedAt'>;
export type FlashCardCreateInput = Pick<IFlashCardBase, 'name' | 'user'> & { cards?: ICardItem[] };
export type FlashCardSummary = Pick<IFlashCard, '_id' | 'name' | 'createdAt'> & {
  cardCount: number;
};

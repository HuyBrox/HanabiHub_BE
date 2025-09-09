//định nghĩa ra các kiểu dùng cho FlashList để quản lý chặt chẽ hơn
import { Document, Types } from "mongoose";

// Interface cơ bản cho FlashList (không kế thừa Document)
export interface IFlashListBase {
  user: Types.ObjectId;                // ref tới User (chủ sở hữu)
  public: boolean;                     // có public hay không
  title: string;                       // tiêu đề danh sách
  flashcards: Types.ObjectId[];        // ref tới FlashCard
}

// Interface cho Mongoose Document (kế thừa Document)
export interface IFlashList extends IFlashListBase, Document {
  _id: Types.ObjectId;                 // id mặc định của Mongo
  createdAt?: Date;
  updatedAt?: Date;
}

// Request types
export interface CreateFlashListRequest {
  title: string;
  public?: boolean;                    // mặc định true
  flashcardIds?: string[];             // optional, có thể tạo rồi thêm flashcard sau
}

export interface UpdateFlashListRequest {
  title?: string;
  public?: boolean;
  flashcardIds?: string[];
}

export interface AddFlashCardToListRequest {
  flashListId: string;
  flashCardIds: string[];              // có thể thêm nhiều flashcard cùng lúc
}

export interface RemoveFlashCardFromListRequest {
  flashListId: string;
  flashCardIds: string[];              // có thể xóa nhiều flashcard cùng lúc
}

export interface GetPublicFlashListsRequest {
  limit?: number;
  page?: number;
  search?: string;                     // tìm kiếm theo title
}

// Utility types để tái sử dụng
export type FlashListWithoutUser = Omit<IFlashList, 'user'>;
export type FlashListPublicInfo = Pick<IFlashList, 'title' | 'public' | 'createdAt' | 'updatedAt'> & {
  flashcardCount: number;
};

export type FlashListWithPopulatedCards = Omit<IFlashList, 'flashcards'> & {
  flashcards: {
    _id: Types.ObjectId;
    name: string;
    cardCount: number;
  }[];
};

export type FlashListCreateInput = Pick<IFlashListBase, 'user' | 'title'> & {
  public?: boolean;
  flashcards?: Types.ObjectId[];
};

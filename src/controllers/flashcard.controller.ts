import FlashCard from "../models/flash-card.model";
import FlashList from "../models/flash-list.model";
import { ApiResponse, AuthRequest } from "../types";
import { Response } from "express";

//====================FlashCardList======================
// [GET] /api/flashcards/?limit=&page=
export const getAllFlashList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Lấy query phân trang
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const [flashLists, myLists] = await Promise.all([
      FlashList.find({ owner: { $ne: userId } })
        .skip(skip)
        .limit(limit)
        .lean(),
      FlashList.find({ owner: userId }).skip(skip).limit(limit).lean(),
    ]);

    const response: ApiResponse = {
      success: true,
      message: "Lấy danh sách flashcard thành công",
      data: {
        flashLists,
        myLists,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: "Lỗi khi lấy danh sách flashcard",
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
};

// [GET] /api/flashcards/:id/?limit=&page=
export const getFlashListById = async (req: AuthRequest, res: Response) => {
  try {
    const flashListId = req.params.id;

    const list = await FlashList.findById(flashListId);
    if (!list) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh sách flashcard",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    return res.status(200).json({
      success: true,
      message: "Lấy danh sách flashcard thành công",
      data: list,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách flashcardbyid:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách flashcard",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
//==============================FlashCard===================
//POST /api/flashcards/new-flash-card - Tạo mới flashcard
export const createFlashCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const newFlashCard: {
      name: string;
      cards?: { vocabulary: string; meaning: string }[];
    } = req.body;

    const flashCard = await FlashCard.create({
      name: newFlashCard.name,
      user: userId,
      cards: newFlashCard.cards || [],
    });

    return res.status(201).json({
      success: true,
      message: "Tạo mới flashcard thành công",
      data: flashCard,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi tạo mới flashcard:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo mới flashcard",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

//============================CardItem======================
//[POST] /api/flashcards/new-card/:id :thêm thẻ vào flashcard
export const newCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const cardId = req.params.id;
    const card: { vocabulary: string; meaning: string } = req.body;
    const flashCard = await FlashCard.findOne({ _id: cardId, user: userId });
    if (!flashCard) {
      throw new Error("Không tìm thấy bộ thẻ!");
    }
    flashCard.cards.push(card);
    await flashCard.save();

    return res.status(200).json({
      success: true,
      message: "Thêm card vào bộ thẻ thành công!",
      data: flashCard,
    } as ApiResponse);
  } catch (err) {
    return res.status(200).json({
      success: false,
      message: "Có lỗi khi thêm card vào bộ thẻ",
    } as ApiResponse);
  }
};
//[DELETE] /api/flashcards/del-card/:id :xóa thẻ khỏi flashcard
export const deleteCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const flashCardId = req.params.id;
    const { cardIndex, cardId } = req.body;

    const flashCard = await FlashCard.findOne({
      _id: flashCardId,
      user: userId,
    });
    if (!flashCard) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bộ thẻ!",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (typeof cardIndex === "number") {
      // Xóa theo index
      if (cardIndex < 0 || cardIndex >= flashCard.cards.length) {
        return res.status(400).json({
          success: false,
          message: "Index không hợp lệ!",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
      flashCard.cards.splice(cardIndex, 1);
    } else if (cardId) {
      // Xóa theo _id của card trong mảng
      flashCard.cards = flashCard.cards.filter(
        (c: any) => c._id.toString() !== cardId
      );
    } else {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin cardIndex hoặc cardId!",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    await flashCard.save();

    return res.status(200).json({
      success: true,
      message: "Xóa card khỏi bộ thẻ thành công!",
      data: flashCard,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Có lỗi khi xóa card",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

import FlashCard from "../models/flash-card.model";
import FlashList from "../models/flash-list.model";
import { ApiResponse, AuthRequest } from "../types";
import { Response } from "express";
import { uploadImage } from "../helpers/upload-media";

//====================FlashList Management======================
// [GET] /api/flashcards/lists/page=1&limit=10 - Lấy danh sách FlashList
export const getAllFlashLists = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Lấy FlashList public của người khác và FlashList của user hiện tại
    const [publicLists, myLists, totalPublic, totalMy] = await Promise.all([
      FlashList.find({ user: { $ne: userId }, isPublic: true })
        .populate("user", "fullname username avatar")
        .populate("flashcards", "name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      FlashList.find({ user: userId })
        .populate("flashcards", "name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      FlashList.countDocuments({ user: { $ne: userId }, isPublic: true }),
      FlashList.countDocuments({ user: userId }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách FlashList thành công",
      data: {
        publicLists,
        myLists,
        pagination: {
          currentPage: page,
          limit,
          totalPublic,
          totalMy,
          totalPublicPages: Math.ceil(totalPublic / limit),
          totalMyPages: Math.ceil(totalMy / limit),
        },
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách FlashList:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách FlashList",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/flashcards/lists/:id - Lấy FlashList theo ID
export const getFlashListById = async (req: AuthRequest, res: Response) => {
  try {
    const listId = req.params.id;
    const userId = req.user?.id;

    const flashList = await FlashList.findById(listId)
      .populate("user", "fullname username avatar")
      .populate("flashcards");

    if (!flashList) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy FlashList",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Kiểm tra quyền truy cập (public hoặc owner)
    if (!flashList.isPublic && flashList.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập FlashList này",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Lấy FlashList thành công",
      data: flashList,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi lấy FlashList:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy FlashList",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [POST] /api/flashcards/lists - Tạo FlashList mới
export const createFlashList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { title, isPublic, level, description } = req.body as {
      title: string;
      isPublic?: boolean;
      level?: string;
      description?: string;
    };
    let thumbnail: any = req.file as undefined;
    if (thumbnail) {
      const uploadedImage = await uploadImage(thumbnail);
      if (uploadedImage) {
        thumbnail = uploadedImage;
      }
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề FlashList không được để trống",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const flashList = await FlashList.create({
      title,
      user: userId,
      isPublic,
      level,
      thumbnail,
      flashcards: [],
    });

    return res.status(201).json({
      success: true,
      message: "Tạo FlashList thành công",
      data: flashList,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi tạo FlashList:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo FlashList",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
//[POST] /api/flashcards/rate/:id - Đánh giá FlashList
export const rateFlashList = async (req: AuthRequest, res: Response) => {
  try {
    const listId = req.params.id;
    const userId = req.user?.id;
    const { rating } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để đánh giá",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Đánh giá không hợp lệ",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const flashList = await FlashList.findById(listId);
    if (!flashList) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy FlashList",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Cập nhật đánh giá
    flashList.rating =
      (flashList.rating * flashList.ratingCount + rating) /
      (flashList.ratingCount + 1);
    flashList.ratingCount += 1;
    await flashList.save();

    return res.status(200).json({
      success: true,
      message: "Đánh giá FlashList thành công",
      data: flashList,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi đánh giá FlashList:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi đánh giá FlashList",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [PUT] /api/flashcards/lists/:id - Cập nhật FlashList
export const updateFlashList = async (req: AuthRequest, res: Response) => {
  try {
    const listId = req.params.id;
    const userId = req.user?.id;
    const { title, isPublic, level, thumbnail } = req.body;

    const flashList = await FlashList.findOne({ _id: listId, user: userId });
    if (!flashList) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy FlashList hoặc bạn không có quyền chỉnh sửa",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (title) flashList.title = title;
    if (typeof isPublic === "boolean") flashList.isPublic = isPublic;
    if (level) flashList.level = level;
    if (thumbnail) flashList.thumbnail = thumbnail;

    await flashList.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật FlashList thành công",
      data: flashList,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi cập nhật FlashList:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật FlashList",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [DELETE] /api/flashcards/lists/:id - Xóa FlashList
export const deleteFlashList = async (req: AuthRequest, res: Response) => {
  try {
    const listId = req.params.id;
    const userId = req.user?.id;

    const flashList = await FlashList.findOne({ _id: listId, user: userId });
    if (!flashList) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy FlashList hoặc bạn không có quyền xóa",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    await FlashList.findByIdAndDelete(listId);

    return res.status(200).json({
      success: true,
      message: "Xóa FlashList thành công",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi xóa FlashList:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xóa FlashList",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
//xóa all (tạm để dev)
export const deleteAllFlashLists = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    await FlashList.deleteMany({ user: userId });
    return res.status(200).json({
      success: true,
      message: "Xóa tất cả FlashList thành công",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi xóa tất cả FlashList:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xóa tất cả FlashList",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

//====================FlashCard Management======================
// [GET] /api/flashcards - Lấy tất cả FlashCard của user
export const getAllFlashCards = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [flashCards, total] = await Promise.all([
      FlashCard.find({ user: userId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      FlashCard.countDocuments({ user: userId }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách FlashCard thành công",
      data: {
        flashCards,
        pagination: {
          currentPage: page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách FlashCard:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách FlashCard",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/flashcards/:id - Lấy FlashCard theo ID
export const getFlashCardById = async (req: AuthRequest, res: Response) => {
  try {
    const cardId = req.params.id;
    const userId = req.user?.id;

    const flashCard = await FlashCard.findOne({ _id: cardId, user: userId });
    if (!flashCard) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy FlashCard",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Lấy FlashCard thành công",
      data: flashCard,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi lấy FlashCard:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy FlashCard",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [POST] /api/flashcards - Tạo FlashCard mới
export const createFlashCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, cards, cardsText, isPublic, thumbnail, description, level } =
      req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Tên FlashCard không được để trống",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    let finalCards = cards || [];

    // Xử lý cardsText như code cũ (nếu có)
    if (cardsText && typeof cardsText === "string") {
      const parsedCards = cardsText
        .trim()
        .split("\n")
        .map((line) => {
          const [vocabulary, meaning] = line
            .split("-")
            .map((item) => item.trim());
          return { vocabulary, meaning };
        })
        .filter((card) => card.vocabulary && card.meaning);

      finalCards = [...finalCards, ...parsedCards];
    }

    const flashCard = await FlashCard.create({
      name,
      cards: finalCards,
      user: userId,
      isPublic: typeof isPublic === "boolean" ? isPublic : false,
      thumbnail: thumbnail || undefined,
      description: description || "",
      level: level || "N5",
    });

    return res.status(201).json({
      success: true,
      message: "Tạo FlashCard thành công",
      data: flashCard,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi tạo FlashCard:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo FlashCard",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [PUT] /api/flashcards/:id - Cập nhật FlashCard
export const updateFlashCard = async (req: AuthRequest, res: Response) => {
  try {
    const cardId = req.params.id;
    const userId = req.user?.id;
    const { name, cards, isPublic, thumbnail, description, level } = req.body;

    const flashCard = await FlashCard.findOne({ _id: cardId, user: userId });
    if (!flashCard) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy FlashCard hoặc bạn không có quyền chỉnh sửa",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (name) flashCard.name = name;
    if (cards) flashCard.cards = cards;
    if (typeof isPublic === "boolean") flashCard.isPublic = isPublic;
    if (thumbnail) flashCard.thumbnail = thumbnail;
    if (description !== undefined) flashCard.description = description;
    if (level) flashCard.level = level;

    await flashCard.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật FlashCard thành công",
      data: flashCard,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi cập nhật FlashCard:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật FlashCard",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [DELETE] /api/flashcards/:id - Xóa FlashCard
export const deleteFlashCard = async (req: AuthRequest, res: Response) => {
  try {
    const cardId = req.params.id;
    const userId = req.user?.id;

    const flashCard = await FlashCard.findOne({ _id: cardId, user: userId });
    if (!flashCard) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy FlashCard hoặc bạn không có quyền xóa",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Xóa FlashCard khỏi tất cả FlashList chứa nó
    await FlashList.updateMany(
      { flashcards: cardId },
      { $pull: { flashcards: cardId } }
    );

    await FlashCard.findByIdAndDelete(cardId);

    return res.status(200).json({
      success: true,
      message: "Xóa FlashCard thành công",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi xóa FlashCard:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xóa FlashCard",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

//============================Card Item Management======================
// [POST] /api/flashcards/:id/cards - Thêm thẻ vào FlashCard
export const addCardToFlashCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const cardId = req.params.id;
    const { vocabulary, meaning } = req.body;

    if (!vocabulary || !meaning) {
      return res.status(400).json({
        success: false,
        message: "Vocabulary và meaning không được để trống",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const flashCard = await FlashCard.findOne({ _id: cardId, user: userId });
    if (!flashCard) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy FlashCard",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    flashCard.cards.push({ vocabulary, meaning });
    await flashCard.save();

    return res.status(200).json({
      success: true,
      message: "Thêm thẻ vào FlashCard thành công",
      data: flashCard,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi thêm thẻ:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi thêm thẻ vào FlashCard",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [DELETE] /api/flashcards/:id/cards - Xóa thẻ khỏi FlashCard
export const deleteCardFromFlashCard = async (
  req: AuthRequest,
  res: Response
) => {
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
        message: "Không tìm thấy FlashCard",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (typeof cardIndex === "number") {
      // Xóa theo index
      if (cardIndex < 0 || cardIndex >= flashCard.cards.length) {
        return res.status(400).json({
          success: false,
          message: "Index không hợp lệ",
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
        message: "Thiếu thông tin cardIndex hoặc cardId",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    await flashCard.save();

    return res.status(200).json({
      success: true,
      message: "Xóa thẻ khỏi FlashCard thành công",
      data: flashCard,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi xóa thẻ:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xóa thẻ",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

//============================FlashList & FlashCard Relationship======================
// [POST] /api/flashcards/lists/:listId/flashcards/:cardId - Thêm FlashCard vào FlashList
export const addFlashCardToList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { listId, cardId } = req.params;

    const [flashList, flashCard] = await Promise.all([
      FlashList.findOne({ _id: listId, user: userId }),
      FlashCard.findOne({ _id: cardId, user: userId }),
    ]);

    if (!flashList) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy FlashList",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (!flashCard) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy FlashCard",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Kiểm tra FlashCard đã có trong list chưa
    if (flashList.flashcards.includes(flashCard._id)) {
      return res.status(400).json({
        success: false,
        message: "FlashCard đã có trong FlashList này",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    flashList.flashcards.push(flashCard._id);
    await flashList.save();

    return res.status(200).json({
      success: true,
      message: "Thêm FlashCard vào FlashList thành công",
      data: flashList,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi thêm FlashCard vào FlashList:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi thêm FlashCard vào FlashList",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [DELETE] /api/flashcards/lists/:listId/flashcards/:cardId - Xóa FlashCard khỏi FlashList
export const removeFlashCardFromList = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { listId, cardId } = req.params;

    const flashList = await FlashList.findOne({ _id: listId, user: userId });
    if (!flashList) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy FlashList",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    flashList.flashcards = flashList.flashcards.filter(
      (id) => id.toString() !== cardId
    );
    await flashList.save();

    return res.status(200).json({
      success: true,
      message: "Xóa FlashCard khỏi FlashList thành công",
      data: flashList,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi xóa FlashCard khỏi FlashList:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xóa FlashCard khỏi FlashList",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

//============================Study & Practice======================
// [GET] /api/flashcards/:id/study - Lấy dữ liệu để học tập (dựa trên code cũ baiTapTuVung)
export const getStudyData = async (req: AuthRequest, res: Response) => {
  try {
    const cardId = req.params.id;
    const userId = req.user?.id;

    const flashCard = await FlashCard.findOne({ _id: cardId, user: userId });
    if (!flashCard) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy FlashCard",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (flashCard.cards.length === 0) {
      return res.status(400).json({
        success: false,
        message: "FlashCard này chưa có thẻ nào để học",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Xáo trộn mảng cards
    let cardsData = [...flashCard.cards];
    for (let i = cardsData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardsData[i], cardsData[j]] = [cardsData[j], cardsData[i]];
    }

    const half = Math.floor(cardsData.length / 2);

    // Nhóm 1: vocabulary -> meaning
    const group1 = cardsData.slice(0, half).map((card) => ({
      question: card.vocabulary,
      answer: card.meaning,
      mode: "vocab-to-meaning",
    }));

    // Nhóm 2: meaning -> vocabulary
    const group2 = cardsData.slice(half, half * 2).map((card) => ({
      question: card.meaning,
      answer: card.vocabulary,
      mode: "meaning-to-vocab",
    }));

    const quiz = [...group1, ...group2];

    return res.status(200).json({
      success: true,
      message: "Lấy dữ liệu học tập thành công",
      data: {
        flashCard: {
          _id: flashCard._id,
          name: flashCard.name,
        },
        quiz,
        totalCards: cardsData.length,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu học tập:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy dữ liệu học tập",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/flashcards/lists/:id/study - Lấy dữ liệu để học tập từ FlashList
export const getStudyDataFromList = async (req: AuthRequest, res: Response) => {
  try {
    const listId = req.params.id;
    const userId = req.user?.id;

    const flashList = await FlashList.findById(listId).populate("flashcards");

    if (!flashList) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy FlashList",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Kiểm tra quyền truy cập
    if (!flashList.isPublic && flashList.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập FlashList này",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Gộp tất cả cards từ các FlashCard trong list
    let allCards: any[] = [];
    flashList.flashcards.forEach((flashCard: any) => {
      allCards = [...allCards, ...flashCard.cards];
    });

    if (allCards.length === 0) {
      return res.status(400).json({
        success: false,
        message: "FlashList này chưa có thẻ nào để học",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Xáo trộn
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    const half = Math.floor(allCards.length / 2);

    const group1 = allCards.slice(0, half).map((card) => ({
      question: card.vocabulary,
      answer: card.meaning,
      mode: "vocab-to-meaning",
    }));

    const group2 = allCards.slice(half, half * 2).map((card) => ({
      question: card.meaning,
      answer: card.vocabulary,
      mode: "meaning-to-vocab",
    }));

    const quiz = [...group1, ...group2];

    return res.status(200).json({
      success: true,
      message: "Lấy dữ liệu học tập từ FlashList thành công",
      data: {
        flashList: {
          _id: flashList._id,
          title: flashList.title,
        },
        quiz,
        totalCards: allCards.length,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu học tập từ FlashList:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy dữ liệu học tập từ FlashList",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

import express from "express";
import {
  // FlashList Management
  getAllFlashLists,
  getFlashListById,
  createFlashList,
  updateFlashList,
  deleteFlashList,

  // FlashCard Management
  getAllFlashCards,
  getFlashCardById,
  createFlashCard,
  updateFlashCard,
  deleteFlashCard,

  // Card Item Management
  addCardToFlashCard,
  deleteCardFromFlashCard,

  // FlashList & FlashCard Relationship
  addFlashCardToList,
  removeFlashCardFromList,

  // Study & Practice
  getStudyData,
  getStudyDataFromList,
} from "../controllers/flashcard.controller";
import { isAuth } from "../middleware/isAuth";

const router = express.Router();

//====================FlashList Routes======================
// GET /api/v1/flashcards/lists - Lấy danh sách FlashList
router.get("/lists", isAuth, getAllFlashLists);

// GET /api/v1/flashcards/lists/:id - Lấy FlashList theo ID
router.get("/lists/:id", isAuth, getFlashListById);

// POST /api/v1/flashcards/lists - Tạo FlashList mới
router.post("/lists", isAuth, createFlashList);

// PUT /api/v1/flashcards/lists/:id - Cập nhật FlashList
router.put("/lists/:id", isAuth, updateFlashList);

// DELETE /api/v1/flashcards/lists/:id - Xóa FlashList
router.delete("/lists/:id", isAuth, deleteFlashList);

// GET /api/v1/flashcards/lists/:id/study - Học tập từ FlashList
router.get("/lists/:id/study", isAuth, getStudyDataFromList);

//====================FlashCard Routes======================
// GET /api/v1/flashcards - Lấy tất cả FlashCard của user
router.get("/", isAuth, getAllFlashCards);

// GET /api/v1/flashcards/:id - Lấy FlashCard theo ID
router.get("/:id", isAuth, getFlashCardById);

// POST /api/v1/flashcards - Tạo FlashCard mới
router.post("/", isAuth, createFlashCard);

// PUT /api/v1/flashcards/:id - Cập nhật FlashCard
router.put("/:id", isAuth, updateFlashCard);

// DELETE /api/v1/flashcards/:id - Xóa FlashCard
router.delete("/:id", isAuth, deleteFlashCard);

// GET /api/v1/flashcards/:id/study - Lấy dữ liệu học tập từ FlashCard
router.get("/:id/study", isAuth, getStudyData);

//====================Card Item Routes======================
// POST /api/v1/flashcards/:id/cards - Thêm thẻ vào FlashCard
router.post("/:id/cards", isAuth, addCardToFlashCard);

// DELETE /api/v1/flashcards/:id/cards - Xóa thẻ khỏi FlashCard
router.delete("/:id/cards", isAuth, deleteCardFromFlashCard);

//====================FlashList & FlashCard Relationship Routes======================
// POST /api/v1/flashcards/lists/:listId/flashcards/:cardId - Thêm FlashCard vào FlashList
router.post("/lists/:listId/flashcards/:cardId", isAuth, addFlashCardToList);

// DELETE /api/v1/flashcards/lists/:listId/flashcards/:cardId - Xóa FlashCard khỏi FlashList
router.delete("/lists/:listId/flashcards/:cardId", isAuth, removeFlashCardFromList);

export default router;

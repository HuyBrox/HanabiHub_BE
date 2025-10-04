import express from "express";
import {
  // FlashList Management
  getAllFlashLists,
  getFlashListById,
  createFlashList,
  updateFlashList,
  deleteFlashList,
  rateFlashList,

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
  deleteAllFlashLists,
  searchFlashList,
  searchFlashCard,
} from "../controllers/flashcard.controller";
import { isAuth } from "../middleware/isAuth";
import upload from "../middleware/multer";
const router = express.Router();

//====================FlashList Routes======================
// Lấy danh sách tất cả FlashList (public + của mình)
router.get("/get-all-flashlists", isAuth, getAllFlashLists);

// Lấy chi tiết FlashList theo ID
router.get("/get-flashlist-detail/:id", isAuth, getFlashListById);

// Tạo FlashList mới
router.post(
  "/create-flashlist",
  isAuth,
  upload.single("thumbnail"),
  createFlashList
);

// Cập nhật FlashList
router.put("/update-flashlist/:id", isAuth, updateFlashList);

// Xóa FlashList
router.delete("/delete-flashlist/:id", isAuth, deleteFlashList);

// Lấy dữ liệu học tập từ FlashList
router.get("/study-flashlist/:id", isAuth, getStudyDataFromList);

//đánh giá FlashList
router.post("/rate-flashlist/:id", isAuth, rateFlashList);
//xóa hết (để dev)
router.delete("/delete-all", isAuth, deleteAllFlashLists);

//====================FlashCard Routes======================
// Lấy tất cả FlashCard của user
router.get("/get-all-flashcards", isAuth, getAllFlashCards);

// Lấy chi tiết FlashCard theo ID
router.get("/get-flashcard-detail/:id", isAuth, getFlashCardById);

// Tạo FlashCard mới
router.post(
  "/create-flashcard",
  isAuth,
  upload.single("thumbnail"),
  createFlashCard
);

// Cập nhật FlashCard
router.put(
  "/update-flashcard/:id",
  isAuth,
  upload.single("thumbnail"),
  updateFlashCard
);

// Xóa FlashCard
router.delete("/delete-flashcard/:id", isAuth, deleteFlashCard);

// Lấy dữ liệu học tập từ FlashCard
router.get("/study-flashcard/:id", isAuth, getStudyData);

//====================Card Item Routes======================
// Thêm thẻ vào FlashCard
router.post("/add-card-to-flashcard/:id", isAuth, addCardToFlashCard);

// Xóa thẻ khỏi FlashCard
router.delete(
  "/delete-card-from-flashcard/:id",
  isAuth,
  deleteCardFromFlashCard
);

//====================FlashList & FlashCard Relationship Routes======================
// Thêm FlashCard vào FlashList
router.post(
  "/add-flashcard-to-flashlist/:listId/:cardId",
  isAuth,
  addFlashCardToList
);

// Xóa FlashCard khỏi FlashList
router.delete(
  "/remove-flashcard-from-flashlist/:listId/:cardId",
  isAuth,
  removeFlashCardFromList
);

//====================Search Routes======================
// Tìm kiếm FlashList
router.get("/search-flashlist", isAuth, searchFlashList);
// Tìm kiếm FlashCard
router.get("/search-flashcard", isAuth, searchFlashCard);

export default router;

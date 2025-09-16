import express from "express";
import {
  getAllFlashList,
  getFlashListById,
  createFlashCard,
  newCard,
  deleteCard,
} from "../controllers/flashcard.controller";
import { isAuth } from "../middleware/isAuth";

const router = express.Router();

router.get("/flashcards", isAuth, getAllFlashList);
router.get("/flashcards/card/:id", isAuth, getFlashListById);
router.post("/flashcards/card/:id", isAuth, newCard);
router.get("/flashcards/createCard", isAuth, createFlashCard);
router.post("/flashcards/createCard", isAuth, createFlashCard);
router.delete("/flashcards/delete/:id", isAuth, deleteCard);

export default router;

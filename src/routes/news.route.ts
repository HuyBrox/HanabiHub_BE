import { Router } from "express";
import { isAdmin } from "../middleware/isAuth";
import {
  createNews,
  getNewsById,
  listNews,
  updateNews,
  deleteNews,
  getNewsStats,
  exportNewsCsv,
} from "../controllers/news.controller";

const router = Router();

// Stats and export routes MUST come before :id routes
router.get("/news/stats", isAdmin, getNewsStats);
router.get("/news/export", isAdmin, exportNewsCsv);

// CRUD routes
router.post("/news", isAdmin, createNews);
router.get("/news", isAdmin, listNews);
router.get("/news/:id", isAdmin, getNewsById);
router.put("/news/:id", isAdmin, updateNews);
router.delete("/news/:id", isAdmin, deleteNews);

export default router;

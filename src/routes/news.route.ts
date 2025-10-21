import { Router } from "express";
import { isAdmin } from "../middleware/isAuth";
import {
  createNews,
  listNews,
  updateNews,
  deleteNews,
  getNewsStats,
  exportNewsCsv,
} from "../controllers/news.controller";

const router = Router();

router.post("/news", isAdmin, createNews);
router.get("/news", isAdmin, listNews);
router.put("/news/:id", isAdmin, updateNews);
router.delete("/news/:id", isAdmin, deleteNews);
router.get("/news/stats", isAdmin, getNewsStats);
router.get("/news/export", isAdmin, exportNewsCsv);

export default router;

import { Router, Response } from "express";
import { isAdmin } from "../middleware/isAuth";
import { AuthRequest } from "../types";
import News from "../models/news.model";
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

// Public route - Get published news only (no auth required)
router.get("/news/public", async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 100);
    const skip = (page - 1) * limit;

    const search = (req.query.search as string) || "";

    const query: any = { 
      deleted: { $ne: true },
      status: "published" // Only show published news
    };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      News.find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "fullname username")
        .lean(),
      News.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách tin tức thành công",
      data: { items, total, page, limit },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("listNews public error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// Stats and export routes MUST come before :id routes
router.get("/news/stats", isAdmin, getNewsStats);
router.get("/news/export", isAdmin, exportNewsCsv);

// CRUD routes - Admin only
router.post("/news", isAdmin, createNews);
router.get("/news", isAdmin, listNews);
router.get("/news/:id", isAdmin, getNewsById);
router.put("/news/:id", isAdmin, updateNews);
router.delete("/news/:id", isAdmin, deleteNews);

export default router;

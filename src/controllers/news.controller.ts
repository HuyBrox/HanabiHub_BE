import { Response } from "express";
import News from "../models/news.model";
import { ApiResponse, AuthRequest } from "../types";

// [POST] /api/news
export const createNews = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, status, tags } = req.body as {
      title?: string;
      content?: string;
      status?: "draft" | "published";
      tags?: string[];
    };

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tiêu đề hoặc nội dung",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const now = new Date();
    const doc = await News.create({
      title,
      content,
      author: req.user?.id,
      status: status || "draft",
      tags: Array.isArray(tags) ? tags : [],
      publishedAt: status === "published" ? now : null,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo bài tin tức thành công",
      data: doc,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("createNews error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/news/:id
export const getNewsById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const doc = await News.findOne({ _id: id, deleted: { $ne: true } })
      .populate("author", "fullname username")
      .lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết bài viết thành công",
      data: doc,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("getNewsById error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/news
export const listNews = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 100);
    const skip = (page - 1) * limit;

    const search = (req.query.search as string) || "";
    const author = (req.query.author as string) || undefined;
    const status = (req.query.status as string) || undefined;

    const query: any = { deleted: { $ne: true } };
    if (status && ["draft", "published"].includes(status)) query.status = status;
    if (author) query.author = author;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      News.find(query)
        .sort({ createdAt: -1 })
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
    } as ApiResponse);
  } catch (error) {
    console.error("listNews error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [PUT] /api/news/:id
export const updateNews = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { title, content, status, tags } = req.body as {
      title?: string;
      content?: string;
      status?: "draft" | "published";
      tags?: string[];
    };

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (Array.isArray(tags)) updates.tags = tags;
    if (status !== undefined) {
      updates.status = status;
      updates.publishedAt = status === "published" ? new Date() : null;
    }

    const doc = await News.findOneAndUpdate({ _id: id, deleted: { $ne: true } }, updates, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật bài viết thành công",
      data: doc,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("updateNews error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [DELETE] /api/news/:id
export const deleteNews = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const doc = await News.findOneAndUpdate(
      { _id: id, deleted: { $ne: true } },
      { deleted: true },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Xóa bài viết thành công (soft delete)",
      data: doc,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("deleteNews error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/news/stats
export const getNewsStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [total, published, drafts] = await Promise.all([
      News.countDocuments({ deleted: { $ne: true } }),
      News.countDocuments({ status: "published", deleted: { $ne: true } }),
      News.countDocuments({ status: "draft", deleted: { $ne: true } }),
    ]);

    const viewAgg = await News.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]);

    const totalViews = viewAgg[0]?.totalViews || 0;

    return res.status(200).json({
      success: true,
      message: "Thống kê tin tức",
      data: { total, published, drafts, totalViews },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("getNewsStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/news/export
// Simple CSV export (Excel can open CSV). Avoid heavy Excel libs.
export const exportNewsCsv = async (req: AuthRequest, res: Response) => {
  try {
    const items = await News.find({ deleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();

    const header = [
      "id",
      "title",
      "status",
      "views",
      "publishedAt",
      "createdAt",
      "updatedAt",
    ];

    const rows = items.map((n: any) => [
      n._id,
      escapeCsv(n.title),
      n.status,
      n.views,
      n.publishedAt ? new Date(n.publishedAt).toISOString() : "",
      n.createdAt ? new Date(n.createdAt).toISOString() : "",
      n.updatedAt ? new Date(n.updatedAt).toISOString() : "",
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=news.csv");

    return res.status(200).send(csv);
  } catch (error) {
    console.error("exportNewsCsv error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/"/g, '""');
  if (str.search(/[",\n]/g) >= 0) return `"${str}"`;
  return str;
}

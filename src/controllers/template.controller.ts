import { Response } from "express";
import Template from "../models/template.model";
import { ApiResponse, AuthRequest } from "../types";

// [POST] /api/templates
export const createTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { name, title, content, type } = req.body as {
      name?: string;
      title?: string;
      content?: string;
      type?: "system" | "personal";
    };

    if (!name || !title || !content) {
      return res.status(400).json({
        success: false,
        message: "Thiếu name, title hoặc content",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const exist = await Template.findOne({ name });
    if (exist) {
      return res.status(400).json({
        success: false,
        message: "Tên template đã tồn tại",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const doc = await Template.create({
      name,
      title,
      content,
      type: type || "system",
      createdBy: req.user?.id,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo template thành công",
      data: doc,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("createTemplate error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/templates
export const listTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 100);
    const skip = (page - 1) * limit;

    const search = (req.query.search as string) || "";
    const type = (req.query.type as string) || undefined;

    const query: any = { deleted: { $ne: true } };
    if (type && ["system", "personal"].includes(type)) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Template.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Template.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách template thành công",
      data: { items, total, page, limit },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("listTemplates error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [PUT] /api/templates/:id
export const updateTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { name, title, content, type } = req.body as {
      name?: string;
      title?: string;
      content?: string;
      type?: "system" | "personal";
    };

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (type !== undefined) updates.type = type;

    const doc = await Template.findOneAndUpdate(
      { _id: id, deleted: { $ne: true } },
      updates,
      { new: true, runValidators: true }
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy template",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật template thành công",
      data: doc,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("updateTemplate error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [DELETE] /api/templates/:id
export const deleteTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;

    const doc = await Template.findOneAndUpdate(
      { _id: id, deleted: { $ne: true } },
      { deleted: true },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy template",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Xóa template thành công (soft delete)",
      data: doc,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("deleteTemplate error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/templates/stats
export const getTemplateStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [total, system, personal] = await Promise.all([
      Template.countDocuments({ deleted: { $ne: true } }),
      Template.countDocuments({ type: "system", deleted: { $ne: true } }),
      Template.countDocuments({ type: "personal", deleted: { $ne: true } }),
    ]);

    const usageAgg = await Template.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: null, totalUsage: { $sum: "$usageCount" } } },
    ]);

    const totalUsage = usageAgg[0]?.totalUsage || 0;

    return res.status(200).json({
      success: true,
      message: "Thống kê template",
      data: { total, system, personal, totalUsage },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("getTemplateStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

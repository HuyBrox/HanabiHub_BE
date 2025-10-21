import { Response } from "express";
import Report from "../models/report.model";
import { ApiResponse, AuthRequest } from "../types";

// [GET] /api/reports
export const listReports = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 100);
    const skip = (page - 1) * limit;

    const status = (req.query.status as string) || undefined;
    const category = (req.query.category as string) || undefined;
    const priority = (req.query.priority as string) || undefined;
    const search = (req.query.search as string) || "";

    const query: any = { deleted: { $ne: true } };
    if (status && ["pending", "approved", "rejected"].includes(status)) query.status = status;
    if (category && ["spam", "content", "harassment", "scam", "copyright"].includes(category)) query.category = category;
    if (priority && ["low", "medium", "high"].includes(priority)) query.priority = priority;
    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reporter", "fullname username")
        .populate("targetUser", "fullname username")
        .lean(),
      Report.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách tố cáo thành công",
      data: { items, total, page, limit },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("listReports error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [PUT] /api/reports/:id/approve
export const approveReport = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { note } = req.body as { note?: string };

    const doc = await Report.findOneAndUpdate(
      { _id: id, deleted: { $ne: true } },
      { status: "approved", note: note || undefined },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tố cáo",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Đã duyệt tố cáo",
      data: doc,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("approveReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [PUT] /api/reports/:id/reject
export const rejectReport = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { note } = req.body as { note?: string };

    const doc = await Report.findOneAndUpdate(
      { _id: id, deleted: { $ne: true } },
      { status: "rejected", note: note || undefined },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tố cáo",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Đã từ chối tố cáo",
      data: doc,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("rejectReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/reports/stats
export const getReportStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [total, pending, approved, rejected, highPriority] = await Promise.all([
      Report.countDocuments({ deleted: { $ne: true } }),
      Report.countDocuments({ status: "pending", deleted: { $ne: true } }),
      Report.countDocuments({ status: "approved", deleted: { $ne: true } }),
      Report.countDocuments({ status: "rejected", deleted: { $ne: true } }),
      Report.countDocuments({ priority: "high", deleted: { $ne: true } }),
    ]);

    // Category distribution
    const byCategory = await Report.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const categories: Record<string, number> = {
      spam: 0,
      content: 0,
      harassment: 0,
      scam: 0,
      copyright: 0,
    };
    byCategory.forEach((r: any) => {
      if (r._id && categories.hasOwnProperty(r._id)) categories[r._id] = r.count;
    });

    return res.status(200).json({
      success: true,
      message: "Thống kê tố cáo",
      data: { total, pending, approved, rejected, highPriority, categories },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("getReportStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/reports/export
export const exportReportsCsv = async (_req: AuthRequest, res: Response) => {
  try {
    const items = await Report.find({ deleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();

    const header = [
      "id",
      "category",
      "status",
      "priority",
      "reason",
      "note",
      "createdAt",
      "updatedAt",
    ];

    const rows = items.map((r: any) => [
      r._id,
      r.category,
      r.status,
      r.priority || "",
      escapeCsv(r.reason),
      escapeCsv(r.note || ""),
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
      r.updatedAt ? new Date(r.updatedAt).toISOString() : "",
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=reports.csv");

    return res.status(200).send(csv);
  } catch (error) {
    console.error("exportReportsCsv error:", error);
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

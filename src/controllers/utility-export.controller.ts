import { Response } from "express";
import Notification from "../models/notification.model";
import Template from "../models/template.model";
import { ApiResponse, AuthRequest } from "../types";

export const exportNotificationsCsv = async (_req: AuthRequest, res: Response) => {
  try {
    const items = await Notification.find({ deleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();

    const header = [
      "id",
      "type",
      "title",
      "receiversCount",
      "deliveredCount",
      "createdAt",
      "updatedAt",
    ];

    const rows = items.map((n: any) => [
      n._id,
      n.type,
      escapeCsv(n.title),
      Array.isArray(n.receivers) ? n.receivers.length : 0,
      n.deliveredCount || 0,
      n.createdAt ? new Date(n.createdAt).toISOString() : "",
      n.updatedAt ? new Date(n.updatedAt).toISOString() : "",
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=notifications.csv");

    return res.status(200).send(csv);
  } catch (error) {
    console.error("exportNotificationsCsv error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const exportTemplatesCsv = async (_req: AuthRequest, res: Response) => {
  try {
    const items = await Template.find({ deleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();

    const header = [
      "id",
      "name",
      "type",
      "usageCount",
      "createdAt",
      "updatedAt",
    ];

    const rows = items.map((t: any) => [
      t._id,
      escapeCsv(t.name),
      t.type,
      t.usageCount || 0,
      t.createdAt ? new Date(t.createdAt).toISOString() : "",
      t.updatedAt ? new Date(t.updatedAt).toISOString() : "",
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=templates.csv");

    return res.status(200).send(csv);
  } catch (error) {
    console.error("exportTemplatesCsv error:", error);
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

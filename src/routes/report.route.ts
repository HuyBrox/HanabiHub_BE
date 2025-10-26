import { Router } from "express";
import { isAdmin } from "../middleware/isAuth";
import {
  getReportById,
  listReports,
  approveReport,
  rejectReport,
  getReportStats,
  exportReportsCsv,
} from "../controllers/report.controller";

const router = Router();

// Stats and export routes MUST come before :id routes
router.get("/reports/stats", isAdmin, getReportStats);
router.get("/reports/export", isAdmin, exportReportsCsv);

// CRUD routes
router.get("/reports", isAdmin, listReports);
router.get("/reports/:id", isAdmin, getReportById);
router.put("/reports/:id/approve", isAdmin, approveReport);
router.put("/reports/:id/reject", isAdmin, rejectReport);

export default router;

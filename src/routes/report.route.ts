import { Router } from "express";
import { isAdmin } from "../middleware/isAuth";
import {
  listReports,
  approveReport,
  rejectReport,
  getReportStats,
  exportReportsCsv,
} from "../controllers/report.controller";

const router = Router();

router.get("/reports", isAdmin, listReports);
router.put("/reports/:id/approve", isAdmin, approveReport);
router.put("/reports/:id/reject", isAdmin, rejectReport);
router.get("/reports/stats", isAdmin, getReportStats);
router.get("/reports/export", isAdmin, exportReportsCsv);

export default router;

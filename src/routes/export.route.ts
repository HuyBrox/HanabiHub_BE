import { Router } from "express";
import { isAdmin } from "../middleware/isAuth";
import { exportNewsCsv } from "../controllers/news.controller";
import { exportReportsCsv } from "../controllers/report.controller";
import { exportNotificationsCsv } from "../controllers/utility-export.controller";
import { exportTemplatesCsv } from "../controllers/utility-export.controller";

const router = Router();

router.get("/export/news", isAdmin, exportNewsCsv);
router.get("/export/reports", isAdmin, exportReportsCsv);
router.get("/export/notifications", isAdmin, exportNotificationsCsv);
router.get("/export/templates", isAdmin, exportTemplatesCsv);

export default router;

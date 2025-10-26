import { Router } from "express";
import { isAdmin } from "../middleware/isAuth";
import {
  createTemplate,
  getTemplateById,
  listTemplates,
  updateTemplate,
  deleteTemplate,
  getTemplateStats,
  exportTemplatesCsv,
  useTemplate,
} from "../controllers/template.controller";

const router = Router();

// Stats and export routes MUST come before :id routes
router.get("/templates/stats", isAdmin, getTemplateStats);
router.get("/templates/export", isAdmin, exportTemplatesCsv);

// CRUD routes
router.post("/templates", isAdmin, createTemplate);
router.get("/templates", isAdmin, listTemplates);
router.get("/templates/:id", isAdmin, getTemplateById);
router.put("/templates/:id", isAdmin, updateTemplate);
router.delete("/templates/:id", isAdmin, deleteTemplate);
router.post("/templates/:id/use", isAdmin, useTemplate);

export default router;

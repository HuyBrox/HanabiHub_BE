import { Router } from "express";
import { isAdmin } from "../middleware/isAuth";
import {
  createTemplate,
  listTemplates,
  updateTemplate,
  deleteTemplate,
  getTemplateStats,
} from "../controllers/template.controller";

const router = Router();

router.post("/templates", isAdmin, createTemplate);
router.get("/templates", isAdmin, listTemplates);
router.put("/templates/:id", isAdmin, updateTemplate);
router.delete("/templates/:id", isAdmin, deleteTemplate);
router.get("/templates/stats", isAdmin, getTemplateStats);

export default router;

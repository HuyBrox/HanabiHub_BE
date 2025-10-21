import { Router } from "express";
import { isAdmin } from "../middleware/isAuth";
import { searchUsers, getUsersStats } from "../controllers/user-admin.controller";

const router = Router();

router.get("/users/search", isAdmin, searchUsers);
router.get("/users/stats", isAdmin, getUsersStats);

export default router;

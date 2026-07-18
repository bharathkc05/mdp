import express from 'express';
import { protect, authorize } from "../middleware/auth.js";
import * as causeController from "../controllers/causeController.js";

const router = express.Router();

// ── Public routes (no auth required) ────────────────────────────────────────
router.get("/", causeController.getPublicCauses);
router.get("/categories/list", causeController.getCategories);

// ── Admin-only routes (mounted BEFORE /:id to avoid swallowing /admin) ──────
const adminRouter = express.Router();
adminRouter.use(protect, authorize("admin"));

adminRouter.get("/", causeController.getAdminCauses);
adminRouter.get("/:id", causeController.getAdminCauseById);
adminRouter.post("/", causeController.createCause);
adminRouter.put("/:id", causeController.updateCause);
adminRouter.delete("/:id", causeController.deleteCause);
adminRouter.patch("/:id/archive", causeController.archiveCause);
adminRouter.post("/update-expired", causeController.updateExpiredCauses);

router.use("/admin", adminRouter);

// ── Public wildcard route LAST — must come after /admin mount ────────────────
router.get("/:id", causeController.getPublicCauseById);

export default router;

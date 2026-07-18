import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import * as userController from "../controllers/userController.js";

const router = express.Router();

// Current user profile routes (Requires authentication)
router.get('/me', protect, userController.getMyProfile);
router.put('/me', protect, userController.updateMyProfile);

// Admin-only user management routes
router.use(protect);
router.use(authorize('admin'));

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id/role', userController.updateUserRole);

export default router;

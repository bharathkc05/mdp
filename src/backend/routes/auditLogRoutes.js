/**
 * Story 3.4: View System Audit Logs
 * Admin-only routes for viewing and querying audit logs
 */

import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import * as auditLogController from "../controllers/auditLogController.js";

const router = express.Router();

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs with filtering and pagination
 * @access  Admin only
 * @implements Story 3.4 - AC1: Secure, admin-only page with logs in reverse chronological order
 */
router.get('/', auditLogController.getAuditLogs);

/**
 * @route   GET /api/admin/audit-logs/stats
 * @desc    Get audit log statistics
 * @access  Admin only
 */
router.get('/stats', auditLogController.getAuditLogStats);

/**
 * @route   GET /api/admin/audit-logs/:id
 * @desc    Get single audit log by ID
 * @access  Admin only
 */
router.get('/:id', auditLogController.getAuditLogById);

export default router;

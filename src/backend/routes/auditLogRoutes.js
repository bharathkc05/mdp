/**
 * Story 3.4: View System Audit Logs
 * Admin-only routes for viewing and querying audit logs
 */

import express from "express";
import AuditLog from "../models/AuditLog.js";
import { protect, authorize } from "../middleware/auth.js";
import { logAdminAction } from "../utils/auditLogger.js";

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
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      eventType,
      severity,
      userId,
      startDate,
      endDate,
      search
    } = req.query;

    // Build query
    const query = {};

    // Filter by event type
    if (eventType && eventType !== 'all') {
      query.eventType = eventType;
    }

    // Filter by severity
    if (severity && severity !== 'all') {
      query.severity = severity;
    }

    // Filter by user ID
    if (userId) {
      query.userId = userId;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Search in description or user email
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination
    const [logs, totalCount] = await Promise.all([
      AuditLog.find(query)
        .populate('userId', 'firstName lastName email role')
        .sort({ createdAt: -1 }) // AC1: Reverse chronological order
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    // Sanitize logs (remove sensitive data) - AC4
    const sanitizedLogs = logs.map(log => {
      const sanitized = { ...log };
      
      // Remove sensitive metadata
      if (sanitized.metadata) {
        delete sanitized.metadata.password;
        delete sanitized.metadata.token;
        delete sanitized.metadata.secret;
      }
      
      return sanitized;
    });

    // Log admin action of viewing audit logs
    await logAdminAction(req, 'VIEW_AUDIT_LOGS', {
      filters: { eventType, severity, userId, startDate, endDate, search },
      page,
      limit
    });

    res.json({
      success: true,
      data: {
        logs: sanitizedLogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit),
          hasMore: skip + logs.length < totalCount
        },
        filters: {
          eventType: eventType || 'all',
          severity: severity || 'all',
          userId,
          startDate,
          endDate,
          search
        }
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching audit logs'
    });
  }
});

/**
 * @route   GET /api/admin/audit-logs/stats
 * @desc    Get audit log statistics
 * @access  Admin only
 */
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get statistics
    const [
      totalLogs,
      eventTypeStats,
      severityStats,
      recentActivity
    ] = await Promise.all([
      AuditLog.countDocuments(dateFilter),
      
      AuditLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      AuditLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      
      AuditLog.find(dateFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .select('eventType severity createdAt description')
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        totalLogs,
        eventTypeStats,
        severityStats,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching audit log statistics'
    });
  }
});

/**
 * @route   GET /api/admin/audit-logs/:id
 * @desc    Get single audit log by ID
 * @access  Admin only
 */
router.get('/:id', async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('userId', 'firstName lastName email role')
      .lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    // Sanitize log (AC4: Remove sensitive data)
    if (log.metadata) {
      delete log.metadata.password;
      delete log.metadata.token;
      delete log.metadata.secret;
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching audit log'
    });
  }
});

export default router;

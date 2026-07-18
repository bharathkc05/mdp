import { sendResponse } from "../utils/response.js";
import * as auditLogService from "../services/auditLogService.js";
import { logAdminAction } from "../services/auditLogService.js";

export const getAuditLogs = async (req, res) => {
  try {
    const result = await auditLogService.getAuditLogs(req.query);

    await logAdminAction(req, 'VIEW_AUDIT_LOGS', {
      filters: { 
        eventType: req.query.eventType, 
        severity: req.query.severity, 
        userId: req.query.userId, 
        startDate: req.query.startDate, 
        endDate: req.query.endDate, 
        search: req.query.search 
      },
      page: req.query.page,
      limit: req.query.limit
    });

    res.json({
      success: true,
      data: {
        logs: result.logs,
        pagination: result.pagination,
        filters: {
          eventType: req.query.eventType || 'all',
          severity: req.query.severity || 'all',
          userId: req.query.userId,
          startDate: req.query.startDate,
          endDate: req.query.endDate,
          search: req.query.search
        }
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    sendResponse(res, 500, false, 'Server error while fetching audit logs' );
  }
};

export const getAuditLogStats = async (req, res) => {
  try {
    const stats = await auditLogService.getAuditLogStats(req.query.startDate, req.query.endDate);
    sendResponse(res, 200, true, 'Success', stats );
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    sendResponse(res, 500, false, 'Server error while fetching audit log statistics' );
  }
};

export const getAuditLogById = async (req, res) => {
  try {
    const log = await auditLogService.getAuditLogById(req.params.id);
    if (!log) {
      return sendResponse(res, 404, false, 'Audit log not found' );
    }
    res.json({ success: true, log });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    sendResponse(res, 500, false, 'Server error while fetching audit log' );
  }
};

import AuditLog from "../models/AuditLog.js";

export const getAuditLogs = async (queryParams) => {
  const { page = 1, limit = 50, eventType, severity, userId, startDate, endDate, search } = queryParams;

  const query = {};
  if (eventType && eventType !== 'all') query.eventType = eventType;
  if (severity && severity !== 'all') query.severity = severity;
  if (userId) query.userId = userId;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (search) {
    query.$or = [
      { description: { $regex: search, $options: 'i' } },
      { userEmail: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [logs, totalCount] = await Promise.all([
    AuditLog.find(query)
      .populate('userId', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    AuditLog.countDocuments(query)
  ]);

  const sanitizedLogs = logs.map(log => {
    const sanitized = { ...log };
    if (sanitized.metadata) {
      delete sanitized.metadata.password;
      delete sanitized.metadata.token;
      delete sanitized.metadata.secret;
    }
    return sanitized;
  });

  return {
    logs: sanitizedLogs,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      totalCount,
      limit: parseInt(limit),
      hasMore: skip + logs.length < totalCount
    }
  };
};

export const getAuditLogStats = async (startDate, endDate) => {
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  const [totalLogs, eventTypeStats, severityStats, recentActivity] = await Promise.all([
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

  return { totalLogs, eventTypeStats, severityStats, recentActivity };
};

export const getAuditLogById = async (id) => {
  const log = await AuditLog.findById(id).populate('userId', 'firstName lastName email role').lean();
  if (!log) return null;

  if (log.metadata) {
    delete log.metadata.password;
    delete log.metadata.token;
    delete log.metadata.secret;
  }
  return log;
};
/**
 * Create an audit log entry
 * @param {Object} params - Log parameters
 * @param {string} params.eventType - Type of event
 * @param {string} params.description - Event description
 * @param {Object} params.req - Express request object (optional)
 * @param {string} params.userId - User ID (optional)
 * @param {string} params.userEmail - User email (optional)
 * @param {string} params.severity - Severity level (optional)
 * @param {Object} params.metadata - Additional data (optional)
 * @param {string} params.resourceType - Resource type (optional)
 * @param {string} params.resourceId - Resource ID (optional)
 */
export const createAuditLog = async (params) => {
  try {
    const {
      eventType,
      description,
      req,
      userId,
      userEmail,
      severity = 'INFO',
      metadata = {},
      resourceType,
      resourceId
    } = params;

    // Extract IP address and user agent from request
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress = req.ip || 
                  req.headers['x-forwarded-for'] || 
                  req.connection?.remoteAddress || 
                  req.socket?.remoteAddress;
      
      userAgent = req.headers['user-agent'];
    }

    // Sanitize metadata - remove sensitive fields
    const sanitizedMetadata = { ...metadata };
    delete sanitizedMetadata.password;
    delete sanitizedMetadata.token;
    delete sanitizedMetadata.secret;
    delete sanitizedMetadata.twoFactorSecret;
    delete sanitizedMetadata.accessToken;
    delete sanitizedMetadata.refreshToken;

    const logData = {
      userId: userId || (req?.user?._id || req?.user?.id),
      userEmail: userEmail || req?.user?.email,
      eventType,
      description,
      ipAddress,
      userAgent,
      severity,
      metadata: sanitizedMetadata,
      resourceType,
      resourceId
    };

    await AuditLog.createLog(logData);
  } catch (error) {
    // Silently fail - audit logging should not break the application
    console.error('Audit logging error:', error.message);
  }
};

/**
 * Helper functions for specific event types
 */

// User Registration
export const logUserRegistration = async (req, user) => {
  const userEmail = user.email || user.userEmail;
  const userId = user._id || user.id;
  
  await createAuditLog({
    eventType: 'USER_REGISTRATION',
    description: `New user registered: ${userEmail}`,
    req,
    userId,
    userEmail,
    severity: 'INFO',
    resourceType: 'USER',
    resourceId: userId
  });
};

// Login Success
export const logLoginSuccess = async (req, user) => {
  const userEmail = user.email || user.userEmail;
  const userId = user._id || user.id;
  
  await createAuditLog({
    eventType: 'USER_LOGIN_SUCCESS',
    description: `User logged in successfully: ${userEmail}`,
    req,
    userId,
    userEmail,
    severity: 'INFO',
    resourceType: 'USER',
    resourceId: userId
  });
};

// Login Failed
export const logLoginFailed = async (req, userEmail, reason) => {
  await createAuditLog({
    eventType: 'USER_LOGIN_FAILED',
    description: `Login failed for ${userEmail}: ${reason}`,
    req,
    userEmail,
    severity: 'WARNING',
    metadata: { reason },
    resourceType: 'USER'
  });
};

// User Logout
export const logUserLogout = async (req, user) => {
  const userEmail = user.email || user.userEmail;
  const userId = user._id || user.id;
  
  await createAuditLog({
    eventType: 'USER_LOGOUT',
    description: `User logged out: ${userEmail}`,
    req,
    userId,
    userEmail,
    severity: 'INFO',
    resourceType: 'USER',
    resourceId: userId
  });
};

// Email Verification
export const logEmailVerified = async (req, user) => {
  const userEmail = user.email || user.userEmail;
  const userId = user._id || user.id;
  
  await createAuditLog({
    eventType: 'USER_EMAIL_VERIFIED',
    description: `Email verified for user: ${userEmail}`,
    req,
    userId,
    userEmail,
    severity: 'INFO',
    resourceType: 'USER',
    resourceId: userId
  });
};

// Password Reset
export const logPasswordReset = async (req, user) => {
  const userEmail = user.email || user.userEmail;
  const userId = user._id || user.id;
  
  await createAuditLog({
    eventType: 'USER_PASSWORD_RESET',
    description: `Password reset for user: ${userEmail}`,
    req,
    userId,
    userEmail,
    severity: 'WARNING',
    resourceType: 'USER',
    resourceId: userId
  });
};

// Donation Created
export const logDonationCreated = async (req, donationData) => {
  const userEmail = req.user?.email;
  const userId = req.user?._id || req.user?.id;
  
  await createAuditLog({
    eventType: 'DONATION_CREATED',
    description: `Donation of $${donationData.amount} made by ${userEmail} to ${donationData.causeName || 'cause'}`,
    req,
    userId,
    userEmail,
    severity: 'INFO',
    metadata: {
      amount: donationData.amount,
      causeId: donationData.causeId,
      causeName: donationData.causeName
    },
    resourceType: 'DONATION',
    resourceId: donationData.donationId
  });
};

// Donation Failed
export const logDonationFailed = async (req, donationData) => {
  const userEmail = req.user?.email;
  const userId = req.user?._id || req.user?.id;
  
  await createAuditLog({
    eventType: 'DONATION_FAILED',
    description: `Donation failed for ${userEmail}: ${donationData.reason || 'Unknown error'}`,
    req,
    userId,
    userEmail,
    severity: 'ERROR',
    metadata: { 
      reason: donationData.reason,
      amount: donationData.amount,
      causeName: donationData.causeName
    },
    resourceType: 'DONATION'
  });
};

// Cause Created
export const logCauseCreated = async (req, cause) => {
  const causeId = cause._id || cause.id;
  const causeName = cause.name;
  
  await createAuditLog({
    eventType: 'CAUSE_CREATED',
    description: `New cause created: ${causeName}`,
    req,
    severity: 'INFO',
    metadata: { 
      causeName,
      targetAmount: cause.targetAmount,
      category: cause.category
    },
    resourceType: 'CAUSE',
    resourceId: causeId
  });
};

// Cause Updated
export const logCauseUpdated = async (req, cause, changes) => {
  const causeId = cause._id || cause.id;
  const causeName = cause.name;
  
  await createAuditLog({
    eventType: 'CAUSE_UPDATED',
    description: `Cause updated: ${causeName}`,
    req,
    severity: 'INFO',
    metadata: { causeName, changes },
    resourceType: 'CAUSE',
    resourceId: causeId
  });
};

// Cause Deleted
export const logCauseDeleted = async (req, cause) => {
  const causeId = cause._id || cause.id;
  const causeName = cause.name;
  
  await createAuditLog({
    eventType: 'CAUSE_DELETED',
    description: `Cause deleted: ${causeName}`,
    req,
    severity: 'WARNING',
    metadata: { causeName },
    resourceType: 'CAUSE',
    resourceId: causeId
  });
};

// Cause Archived
export const logCauseArchived = async (req, cause) => {
  const causeId = cause._id || cause.id;
  const causeName = cause.name;
  
  await createAuditLog({
    eventType: 'CAUSE_ARCHIVED',
    description: `Cause archived: ${causeName}`,
    req,
    severity: 'INFO',
    metadata: { 
      causeName,
      status: cause.status
    },
    resourceType: 'CAUSE',
    resourceId: causeId
  });
};

// User Role Changed
export const logUserRoleChanged = async (req, user, oldRole, newRole) => {
  const targetUserId = user._id || user.id;
  const targetUserEmail = user.email;
  
  await createAuditLog({
    eventType: 'USER_ROLE_CHANGED',
    description: `User role changed for ${targetUserEmail}: ${oldRole} → ${newRole}`,
    req,
    severity: 'WARNING',
    metadata: { targetUserId, oldRole, newRole },
    resourceType: 'USER',
    resourceId: targetUserId
  });
};

// Admin Action
export const logAdminAction = async (req, action, details) => {
  await createAuditLog({
    eventType: 'ADMIN_ACTION',
    description: `Admin action: ${action}`,
    req,
    severity: 'INFO',
    metadata: { action, details }
  });
};

// Platform Configuration Updated
export const logConfigUpdated = async (userId, updates) => {
  await createAuditLog({
    eventType: 'PLATFORM_CONFIG_UPDATED',
    description: `Platform configuration updated by admin`,
    userId,
    severity: 'INFO',
    metadata: { updates },
    resourceType: 'CONFIG'
  });
};

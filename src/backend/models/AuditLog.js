/**
 * Story 3.4: View System Audit Logs
 * AuditLog Model - Tracks key system events for security and monitoring
 */

import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    // User involved in the action (optional for system events)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    
    // Email for reference (denormalized for easier querying)
    userEmail: {
      type: String,
      default: null
    },
    
    // Event type category
    eventType: {
      type: String,
      required: true,
      enum: [
        'USER_REGISTRATION',
        'USER_LOGIN_SUCCESS',
        'USER_LOGIN_FAILED',
        'USER_LOGOUT',
        'USER_EMAIL_VERIFIED',
        'USER_PASSWORD_RESET',
        'DONATION_CREATED',
        'DONATION_FAILED',
        'CAUSE_CREATED',
        'CAUSE_UPDATED',
        'CAUSE_DELETED',
        'CAUSE_ARCHIVED',
        'USER_ROLE_CHANGED',
        'PLATFORM_CONFIG_UPDATED',
        'PLATFORM_CONFIG_VIEWED',
        'ADMIN_ACTION',
        'SYSTEM_EVENT'
      ]
    },
    
    // Detailed description of the event
    description: {
      type: String,
      required: true,
      maxlength: 500
    },
    
    // IP address of the request
    ipAddress: {
      type: String,
      default: null
    },
    
    // User agent (browser/device info)
    userAgent: {
      type: String,
      default: null
    },
    
    // Additional metadata (non-sensitive only)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Severity level
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
      default: 'INFO'
    },
    
    // Resource affected (e.g., cause ID, donation ID)
    resourceType: {
      type: String,
      enum: ['USER', 'CAUSE', 'DONATION', 'CONFIG', 'SYSTEM'],
      required: false,
      default: undefined
    },
    
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: 'auditlogs'
  }
);

// Indexes for efficient querying
auditLogSchema.index({ createdAt: -1 }); // Reverse chronological order
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ eventType: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

// Static method to create audit log entry
auditLogSchema.statics.createLog = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - logging should not break the main application flow
    return null;
  }
};

// Method to sanitize log for display (remove sensitive data)
auditLogSchema.methods.sanitize = function() {
  const log = this.toObject();
  
  // Remove internal MongoDB fields
  delete log.__v;
  
  // Ensure no sensitive data in metadata
  if (log.metadata) {
    delete log.metadata.password;
    delete log.metadata.token;
    delete log.metadata.secret;
  }
  
  return log;
};

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;

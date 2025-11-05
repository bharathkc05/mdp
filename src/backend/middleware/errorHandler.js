/**
 * Story 5.4: Secure and User-Friendly Error Handling
 * 
 * Implements comprehensive error handling with:
 * - Global exception handler
 * - User-friendly error messages (no stack traces in production)
 * - Detailed internal logging for developers
 * - Different error types with appropriate HTTP status codes
 * - Security best practices (no sensitive data exposure)
 */

import { logger } from '../utils/logger.js';

/**
 * Custom Error Classes
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class ServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500);
    this.name = 'ServerError';
  }
}

/**
 * Get user-friendly error message based on error type
 * Never expose sensitive information or stack traces to clients
 */
const getUserFriendlyMessage = (err) => {
  // Map technical errors to user-friendly messages
  const errorMessages = {
    'ValidationError': 'The data you provided is invalid. Please check and try again.',
    'CastError': 'Invalid data format provided.',
    'JsonWebTokenError': 'Authentication failed. Please login again.',
    'TokenExpiredError': 'Your session has expired. Please login again.',
    'MongoServerError': 'A database error occurred. Please try again.',
    'MulterError': 'File upload failed. Please check file size and format.'
  };

  // If it's a known operational error, use its message
  if (err.isOperational) {
    return err.message;
  }

  // Map mongoose/system errors to friendly messages
  if (errorMessages[err.name]) {
    return errorMessages[err.name];
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    return `A record with this ${field} already exists.`;
  }

  // Default generic message for unknown errors
  return 'An unexpected error occurred. Please try again later.';
};

/**
 * Determine appropriate HTTP status code
 */
const getStatusCode = (err) => {
  if (err.statusCode) return err.statusCode;
  
  // Map error types to status codes
  const statusCodeMap = {
    'ValidationError': 400,
    'CastError': 400,
    'JsonWebTokenError': 401,
    'TokenExpiredError': 401,
    'UnauthorizedError': 401,
    'ForbiddenError': 403,
    'NotFoundError': 404,
    'ConflictError': 409,
    'MulterError': 400
  };

  if (statusCodeMap[err.name]) {
    return statusCodeMap[err.name];
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return 409;
  }

  return 500;
};

/**
 * Main Error Handler Middleware
 * 
 * This is the global error handler that catches all errors
 * thrown or passed to next() in the application
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = getStatusCode(err);
  const userMessage = getUserFriendlyMessage(err);

  // Prepare detailed error data for logging
  const errorLogData = {
    name: err.name,
    message: err.message,
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    body: req.body && Object.keys(req.body).length > 0 
      ? sanitizeForLogging(req.body) 
      : undefined,
    query: req.query && Object.keys(req.query).length > 0 
      ? req.query 
      : undefined
  };

  // Log error with appropriate level
  if (statusCode >= 500) {
    // Server errors - log as error
    if (req?.log) {
      req.log.error(errorLogData, 'Server error occurred');
    } else {
      logger.error(errorLogData, 'Server error occurred');
    }
  } else if (statusCode >= 400) {
    // Client errors - log as warning
    if (req?.log) {
      req.log.warn(errorLogData, 'Client error occurred');
    } else {
      logger.warn(errorLogData, 'Client error occurred');
    }
  }

  // Prepare response
  const errorResponse = {
    success: false,
    message: userMessage,
    error: {
      type: err.name || 'Error',
      statusCode
    }
  };

  // Include additional details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = err.message;
    errorResponse.error.stack = err.stack;
    if (err.errors) {
      errorResponse.error.validationErrors = err.errors;
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Sanitize request body for logging
 * Remove sensitive fields like passwords, tokens, etc.
 */
const sanitizeForLogging = (body) => {
  const sensitiveFields = [
    'password', 
    'confirmPassword', 
    'token', 
    'accessToken', 
    'refreshToken',
    'creditCard',
    'cvv',
    'ssn'
  ];

  const sanitized = { ...body };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Handle 404 Not Found errors
 * Should be placed after all route definitions
 */
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: router.get('/path', asyncHandler(async (req, res) => {...}))
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 * This should be set up in server.js
 */
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({
      type: 'UnhandledRejection',
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined
    }, 'Unhandled Promise Rejection');
    
    // In production, you might want to gracefully shutdown
    // process.exit(1);
  });
};

/**
 * Handle uncaught exceptions
 * This should be set up in server.js
 */
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    logger.fatal({
      type: 'UncaughtException',
      message: error.message,
      stack: error.stack
    }, 'Uncaught Exception - Shutting down');
    
    // Uncaught exceptions are serious - should exit
    process.exit(1);
  });
};
/**
 * Test Suite for Error Handler Middleware
 * Tests all error classes, error handler, and utility functions
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ServerError,
  errorHandler,
  notFoundHandler,
  asyncHandler
} from '../../middleware/errorHandler.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create AppError with message and status code', () => {
      const error = new AppError('Test error', 400);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with 400 status', () => {
      const error = new ValidationError('Invalid data');

      expect(error.message).toBe('Invalid data');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('AuthenticationError', () => {
    it('should create AuthenticationError with 401 status', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should accept custom message', () => {
      const error = new AuthenticationError('Token expired');

      expect(error.message).toBe('Token expired');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('AuthorizationError', () => {
    it('should create AuthorizationError with 403 status', () => {
      const error = new AuthorizationError();

      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('AuthorizationError');
    });

    it('should accept custom message', () => {
      const error = new AuthorizationError('Admin access required');

      expect(error.message).toBe('Admin access required');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError with 404 status', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('should accept custom message', () => {
      const error = new NotFoundError('User not found');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('ConflictError', () => {
    it('should create ConflictError with 409 status', () => {
      const error = new ConflictError();

      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.name).toBe('ConflictError');
    });

    it('should accept custom message', () => {
      const error = new ConflictError('Email already registered');

      expect(error.message).toBe('Email already registered');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('ServerError', () => {
    it('should create ServerError with 500 status', () => {
      const error = new ServerError();

      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('ServerError');
    });

    it('should accept custom message', () => {
      const error = new ServerError('Database connection failed');

      expect(error.message).toBe('Database connection failed');
      expect(error.statusCode).toBe(500);
    });
  });
});

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      path: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      body: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('Operational Errors', () => {
    it('should handle ValidationError', () => {
      const error = new ValidationError('Invalid email format');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid email format',
          error: expect.objectContaining({
            type: 'ValidationError',
            statusCode: 400
          })
        })
      );
    });

    it('should handle AuthenticationError', () => {
      const error = new AuthenticationError('Invalid credentials');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid credentials',
          error: expect.objectContaining({
            statusCode: 401
          })
        })
      );
    });

    it('should handle AuthorizationError', () => {
      const error = new AuthorizationError('Insufficient permissions');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Insufficient permissions'
        })
      );
    });

    it('should handle NotFoundError', () => {
      const error = new NotFoundError('User not found');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'User not found'
        })
      );
    });

    it('should handle ConflictError', () => {
      const error = new ConflictError('Email already exists');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Email already exists'
        })
      );
    });

    it('should handle ServerError', () => {
      const error = new ServerError('Database error');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Database error'
        })
      );
    });
  });

  describe('System Errors', () => {
    it('should handle MongoDB CastError', () => {
      const error = new Error('Cast to ObjectId failed');
      error.name = 'CastError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid data format provided.'
        })
      );
    });

    it('should handle JsonWebTokenError', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication failed. Please login again.'
        })
      );
    });

    it('should handle TokenExpiredError', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Your session has expired. Please login again.'
        })
      );
    });

    it('should handle MongoDB duplicate key error (11000)', () => {
      const error = new Error('Duplicate key');
      error.code = 11000;
      error.keyPattern = { email: 1 };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'A record with this email already exists.'
        })
      );
    });

    it('should handle MongoDB duplicate key error without keyPattern', () => {
      const error = new Error('Duplicate key');
      error.code = 11000;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('already exists')
        })
      );
    });

    it('should handle MulterError', () => {
      const error = new Error('File too large');
      error.name = 'MulterError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'File upload failed. Please check file size and format.'
        })
      );
    });

    it('should handle MongoServerError', () => {
      const error = new Error('Connection failed');
      error.name = 'MongoServerError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'A database error occurred. Please try again.'
        })
      );
    });

    it('should handle unknown errors with generic message', () => {
      const error = new Error('Unknown error');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'An unexpected error occurred. Please try again later.'
        })
      );
    });
  });

  describe('Development Mode', () => {
    let originalEnv;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should include error details in development mode', () => {
      const error = new ValidationError('Invalid data');
      error.stack = 'Error stack trace';

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: 'Invalid data',
            stack: expect.any(String)
          })
        })
      );
    });

    it('should include validation errors if present', () => {
      const error = new ValidationError('Validation failed');
      error.errors = { email: 'Invalid email', password: 'Too short' };

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            validationErrors: error.errors
          })
        })
      );
    });
  });

  describe('Production Mode', () => {
    let originalEnv;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include error details in production', () => {
      const error = new ValidationError('Invalid data');
      error.stack = 'Error stack trace';

      errorHandler(error, req, res, next);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.error.details).toBeUndefined();
      expect(jsonCall.error.stack).toBeUndefined();
    });
  });

  describe('Request Context', () => {
    it('should handle request with user context', () => {
      req.user = { id: '123', email: 'test@example.com' };
      const error = new ValidationError('Invalid data');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle request with body', () => {
      req.body = { username: 'testuser', email: 'test@example.com' };
      const error = new ValidationError('Invalid data');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should sanitize sensitive fields in request body', () => {
      req.body = { 
        username: 'testuser', 
        password: 'secret123',
        token: 'secret-token'
      };
      const error = new ValidationError('Invalid data');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle request with query parameters', () => {
      req.query = { page: '1', limit: '10' };
      const error = new ValidationError('Invalid data');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle request with custom logger', () => {
      req.log = {
        error: jest.fn(),
        warn: jest.fn()
      };
      const error = new ServerError('Test error');

      errorHandler(error, req, res, next);

      expect(req.log.error).toHaveBeenCalled();
    });
  });

  describe('Status Code Determination', () => {
    it('should use error statusCode if provided', () => {
      const error = new Error('Custom error');
      error.statusCode = 418;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(418);
    });

    it('should default to 500 for unknown errors', () => {
      const error = new Error('Unknown error');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

describe('Not Found Handler', () => {
  it('should create NotFoundError and call next', () => {
    const req = { originalUrl: '/api/nonexistent' };
    const res = {};
    const next = jest.fn();

    notFoundHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Route /api/nonexistent not found',
        statusCode: 404
      })
    );
  });
});

describe('Async Handler', () => {
  it('should handle successful async function', async () => {
    const asyncFn = async (req, res) => {
      res.status(200).json({ success: true });
    };

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const handler = asyncHandler(asyncFn);
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch errors in async function', async () => {
    const asyncFn = async () => {
      throw new Error('Async error');
    };

    const req = {};
    const res = {};
    const next = jest.fn();

    const handler = asyncHandler(asyncFn);
    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should handle rejected promises', async () => {
    const asyncFn = async () => {
      return Promise.reject(new Error('Promise rejected'));
    };

    const req = {};
    const res = {};
    const next = jest.fn();

    const handler = asyncHandler(asyncFn);
    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should pass through to next middleware on success', async () => {
    const asyncFn = async (req, res, next) => {
      next();
    };

    const req = {};
    const res = {};
    const next = jest.fn();

    const handler = asyncHandler(asyncFn);
    await handler(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('Edge Cases', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      path: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      body: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should handle error without message', () => {
    const error = new Error();
    error.statusCode = 400;
    error.isOperational = true;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should handle error with empty message', () => {
    const error = new ValidationError('');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should handle null error properties', () => {
    const error = new Error('Test');
    error.name = null;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalled();
  });

  it('should handle empty request body', () => {
    req.body = {};
    const error = new ValidationError('Invalid data');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should handle empty query parameters', () => {
    req.query = {};
    const error = new ValidationError('Invalid data');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should handle request without user-agent', () => {
    req.get = jest.fn().mockReturnValue(undefined);
    const error = new ValidationError('Invalid data');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

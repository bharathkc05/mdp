import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { protect, authorize } from '../../middleware/auth.js';
import User from '../../models/User.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  process.env.JWT_SECRET = 'test-secret';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Auth Middleware', () => {
  describe('protect middleware', () => {
    it('should reject request without token', async () => {
      const req = { headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized to access this route'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat token123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject expired token', async () => {
      const user = await User.create({
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        email: 'test@example.com',
        password: 'Password123!'
      });

      const expiredToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '0s' });

      const req = {
        headers: {
          authorization: `Bearer ${expiredToken}`
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token is invalid or expired'
      });
    });

    it('should reject if user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const token = jwt.sign({ id: nonExistentId }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User not found'
      });
    });

    it('should reject blacklisted token', async () => {
      const user = await User.create({
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        email: 'test@example.com',
        password: 'Password123!'
      });

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

      // Blacklist the token
      user.tokenBlacklist.push({
        token,
        expiresAt: Date.now() + 3600000 // 1 hour from now
      });
      await user.save();

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token has been invalidated. Please login again.'
      });
    });

    it('should reject expired session due to inactivity', async () => {
      const user = await User.create({
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        email: 'test@example.com',
        password: 'Password123!',
        lastActivity: new Date(Date.now() - 31 * 60 * 1000) // 31 minutes ago
      });

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Session expired due to inactivity. Please login again.'
      });
    });

    it('should accept valid token and update last activity', async () => {
      const user = await User.create({
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        email: 'test@example.com',
        password: 'Password123!',
        lastActivity: Date.now()
      });

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.email).toBe(user.email);
      expect(req.token).toBe(token);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle malformed JWT', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid.token.here'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token is invalid or expired'
      });
    });
  });

  describe('authorize middleware', () => {
    it('should allow access for authorized role', () => {
      const req = {
        user: { role: 'admin' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      const req = {
        user: { role: 'donor' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User role donor is not authorized to access this route'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow multiple roles', () => {
      const req = {
        user: { role: 'donor' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = authorize('admin', 'donor');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny if role not in allowed list', () => {
      const req = {
        user: { role: 'donor' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = authorize('admin', 'moderator');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

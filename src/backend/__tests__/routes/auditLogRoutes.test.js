/**
 * Test Suite for Audit Log Routes
 * Tests audit log retrieval and filtering
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import auditLogRoutes from '../../routes/auditLogRoutes.js';
import AuditLog from '../../models/AuditLog.js';
import User from '../../models/User.js';

let mongoServer;
let app;
let adminUser;
let donorUser;
let adminToken;
let donorToken;

// Mock audit logger
const mockLogAdminAction = jest.fn();
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAdminAction: mockLogAdminAction
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  app = express();
  app.use(express.json());
  app.use('/api/admin/audit-logs', auditLogRoutes);

  process.env.JWT_SECRET = 'test-secret-key';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  mockLogAdminAction.mockResolvedValue();

  adminUser = await User.create({
    firstName: 'Admin',
    lastName: 'User',
    age: 30,
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    verified: true
  });

  donorUser = await User.create({
    firstName: 'John',
    lastName: 'Donor',
    age: 25,
    email: 'donor@example.com',
    password: 'password123',
    role: 'donor',
    verified: true
  });

  adminToken = jwt.sign({ id: adminUser._id, email: adminUser.email }, process.env.JWT_SECRET);
  donorToken = jwt.sign({ id: donorUser._id, email: donorUser.email }, process.env.JWT_SECRET);
});

afterEach(async () => {
  await AuditLog.deleteMany({});
  await User.deleteMany({});
});

describe('Audit Log Routes - Get Logs', () => {
  describe('GET /api/admin/audit-logs', () => {
    it('should return audit logs in reverse chronological order', async () => {
      await AuditLog.create([
        {
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: 'User logged in',
          ipAddress: '127.0.0.1',
          createdAt: new Date('2024-01-01')
        },
        {
          eventType: 'CAUSE_CREATED',
          severity: 'info',
          userId: adminUser._id,
          userEmail: adminUser.email,
          description: 'Cause created',
          ipAddress: '127.0.0.1',
          createdAt: new Date('2024-01-02')
        }
      ]);

      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toHaveLength(2);
      // Verify reverse chronological order
      expect(new Date(response.body.data.logs[0].createdAt).getTime())
        .toBeGreaterThan(new Date(response.body.data.logs[1].createdAt).getTime());
    });

    it('should support pagination', async () => {
      // Create 60 audit logs
      const logs = [];
      for (let i = 0; i < 60; i++) {
        logs.push({
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: `Login ${i}`,
          ipAddress: '127.0.0.1'
        });
      }
      await AuditLog.insertMany(logs);

      const response = await request(app)
        .get('/api/admin/audit-logs?page=2&limit=50')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toHaveLength(10);
      expect(response.body.data.pagination.currentPage).toBe(2);
      expect(response.body.data.pagination.totalPages).toBe(2);
    });

    it('should filter by event type', async () => {
      await AuditLog.create([
        {
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: 'User logged in',
          ipAddress: '127.0.0.1'
        },
        {
          eventType: 'CAUSE_CREATED',
          severity: 'info',
          userId: adminUser._id,
          userEmail: adminUser.email,
          description: 'Cause created',
          ipAddress: '127.0.0.1'
        }
      ]);

      const response = await request(app)
        .get('/api/admin/audit-logs?eventType=USER_LOGIN')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toHaveLength(1);
      expect(response.body.data.logs[0].eventType).toBe('USER_LOGIN');
    });

    it('should filter by severity', async () => {
      await AuditLog.create([
        {
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: 'Login',
          ipAddress: '127.0.0.1'
        },
        {
          eventType: 'LOGIN_FAILED',
          severity: 'warning',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: 'Failed login',
          ipAddress: '127.0.0.1'
        },
        {
          eventType: 'SYSTEM_ERROR',
          severity: 'error',
          description: 'Critical error',
          ipAddress: '127.0.0.1'
        }
      ]);

      const response = await request(app)
        .get('/api/admin/audit-logs?severity=warning')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toHaveLength(1);
      expect(response.body.data.logs[0].severity).toBe('warning');
    });

    it('should filter by user ID', async () => {
      await AuditLog.create([
        {
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: 'Donor login',
          ipAddress: '127.0.0.1'
        },
        {
          eventType: 'CAUSE_CREATED',
          severity: 'info',
          userId: adminUser._id,
          userEmail: adminUser.email,
          description: 'Admin action',
          ipAddress: '127.0.0.1'
        }
      ]);

      const response = await request(app)
        .get(`/api/admin/audit-logs?userId=${donorUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toHaveLength(1);
      expect(response.body.data.logs[0].userEmail).toBe(donorUser.email);
    });

    it('should filter by date range', async () => {
      await AuditLog.create([
        {
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: 'Old login',
          ipAddress: '127.0.0.1',
          createdAt: new Date('2023-01-01')
        },
        {
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: 'Recent login',
          ipAddress: '127.0.0.1',
          createdAt: new Date('2024-06-01')
        }
      ]);

      const response = await request(app)
        .get('/api/admin/audit-logs?startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toHaveLength(1);
      expect(response.body.data.logs[0].description).toBe('Recent login');
    });

    it('should search in description and email', async () => {
      await AuditLog.create([
        {
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: 'donor@example.com',
          description: 'User login successful',
          ipAddress: '127.0.0.1'
        },
        {
          eventType: 'CAUSE_CREATED',
          severity: 'info',
          userId: adminUser._id,
          userEmail: 'admin@example.com',
          description: 'Created education cause',
          ipAddress: '127.0.0.1'
        }
      ]);

      const response = await request(app)
        .get('/api/admin/audit-logs?search=education')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toHaveLength(1);
      expect(response.body.data.logs[0].description).toContain('education');
    });

    it('should sanitize sensitive data', async () => {
      await AuditLog.create({
        eventType: 'USER_REGISTRATION',
        severity: 'info',
        userId: donorUser._id,
        userEmail: donorUser.email,
        description: 'User registered',
        ipAddress: '127.0.0.1',
        metadata: {
          password: 'secret123',
          token: 'secret-token',
          secret: 'secret-key',
          email: 'test@example.com'
        }
      });

      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const log = response.body.data.logs[0];
      expect(log.metadata).not.toHaveProperty('password');
      expect(log.metadata).not.toHaveProperty('token');
      expect(log.metadata).not.toHaveProperty('secret');
      expect(log.metadata).toHaveProperty('email'); // Non-sensitive field kept
    });

    it('should log admin viewing audit logs', async () => {
      await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(mockLogAdminAction).toHaveBeenCalled();
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/admin/audit-logs');
      expect(response.status).toBe(401);
    });

    it('should handle pagination with hasMore flag', async () => {
      // Create 60 logs
      const logs = [];
      for (let i = 0; i < 60; i++) {
        logs.push({
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: `Login ${i}`,
          ipAddress: '127.0.0.1'
        });
      }
      await AuditLog.insertMany(logs);

      const response = await request(app)
        .get('/api/admin/audit-logs?page=1&limit=50')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.hasMore).toBe(true);

      const response2 = await request(app)
        .get('/api/admin/audit-logs?page=2&limit=50')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response2.status).toBe(200);
      expect(response2.body.data.pagination.hasMore).toBe(false);
    });
  });

  describe('GET /api/admin/audit-logs/stats', () => {
    it('should return audit log statistics', async () => {
      await AuditLog.create([
        {
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: 'Login',
          ipAddress: '127.0.0.1'
        },
        {
          eventType: 'CAUSE_CREATED',
          severity: 'info',
          userId: adminUser._id,
          userEmail: adminUser.email,
          description: 'Cause created',
          ipAddress: '127.0.0.1'
        },
        {
          eventType: 'LOGIN_FAILED',
          severity: 'warning',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: 'Failed login',
          ipAddress: '127.0.0.1'
        }
      ]);

      const response = await request(app)
        .get('/api/admin/audit-logs/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalLogs).toBe(3);
      expect(response.body.data.eventTypeStats).toBeDefined();
      expect(response.body.data.severityStats).toBeDefined();
      expect(response.body.data.recentActivity).toBeDefined();
    });

    it('should filter stats by date range', async () => {
      await AuditLog.create([
        {
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: 'Old login',
          ipAddress: '127.0.0.1',
          createdAt: new Date('2023-01-01')
        },
        {
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: 'Recent login',
          ipAddress: '127.0.0.1',
          createdAt: new Date('2024-06-01')
        }
      ]);

      const response = await request(app)
        .get('/api/admin/audit-logs/stats?startDate=2024-01-01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalLogs).toBe(1);
    });

    it('should group by event type correctly', async () => {
      await AuditLog.create([
        {
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: 'Login 1',
          ipAddress: '127.0.0.1'
        },
        {
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: 'Login 2',
          ipAddress: '127.0.0.1'
        },
        {
          eventType: 'CAUSE_CREATED',
          severity: 'info',
          userId: adminUser._id,
          userEmail: adminUser.email,
          description: 'Cause created',
          ipAddress: '127.0.0.1'
        }
      ]);

      const response = await request(app)
        .get('/api/admin/audit-logs/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const loginStats = response.body.data.eventTypeStats.find(s => s._id === 'USER_LOGIN');
      expect(loginStats.count).toBe(2);
    });

    it('should return recent activity limited to 10', async () => {
      // Create 20 logs
      const logs = [];
      for (let i = 0; i < 20; i++) {
        logs.push({
          eventType: 'USER_LOGIN',
          severity: 'info',
          userId: donorUser._id,
          userEmail: donorUser.email,
          description: `Login ${i}`,
          ipAddress: '127.0.0.1'
        });
      }
      await AuditLog.insertMany(logs);

      const response = await request(app)
        .get('/api/admin/audit-logs/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.recentActivity).toHaveLength(10);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs/stats')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/admin/audit-logs/:id', () => {
    it('should return single audit log by ID', async () => {
      const log = await AuditLog.create({
        eventType: 'USER_LOGIN',
        severity: 'info',
        userId: donorUser._id,
        userEmail: donorUser.email,
        description: 'User logged in',
        ipAddress: '127.0.0.1'
      });

      const response = await request(app)
        .get(`/api/admin/audit-logs/${log._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.eventType).toBe('USER_LOGIN');
      expect(response.body.data.userId).toBeDefined();
    });

    it('should return 404 for non-existent log', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/admin/audit-logs/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Audit log not found');
    });

    it('should sanitize sensitive data in single log', async () => {
      const log = await AuditLog.create({
        eventType: 'USER_REGISTRATION',
        severity: 'info',
        userId: donorUser._id,
        userEmail: donorUser.email,
        description: 'Registration',
        ipAddress: '127.0.0.1',
        metadata: {
          password: 'secret',
          token: 'token123',
          email: 'test@example.com'
        }
      });

      const response = await request(app)
        .get(`/api/admin/audit-logs/${log._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.metadata).not.toHaveProperty('password');
      expect(response.body.data.metadata).not.toHaveProperty('token');
      expect(response.body.data.metadata).toHaveProperty('email');
    });

    it('should populate userId with user details', async () => {
      const log = await AuditLog.create({
        eventType: 'USER_LOGIN',
        severity: 'info',
        userId: donorUser._id,
        userEmail: donorUser.email,
        description: 'Login',
        ipAddress: '127.0.0.1'
      });

      const response = await request(app)
        .get(`/api/admin/audit-logs/${log._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.userId).toBeDefined();
      expect(response.body.data.userId.firstName).toBe('John');
    });

    it('should return 403 for non-admin users', async () => {
      const log = await AuditLog.create({
        eventType: 'USER_LOGIN',
        severity: 'info',
        userId: donorUser._id,
        userEmail: donorUser.email,
        description: 'Login',
        ipAddress: '127.0.0.1'
      });

      const response = await request(app)
        .get(`/api/admin/audit-logs/${log._id}`)
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(403);
    });
  });
});

describe('Audit Log Routes - Combined Filters', () => {
  it('should apply multiple filters simultaneously', async () => {
    await AuditLog.create([
      {
        eventType: 'USER_LOGIN',
        severity: 'info',
        userId: donorUser._id,
        userEmail: 'donor@example.com',
        description: 'Donor login',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2024-06-01')
      },
      {
        eventType: 'USER_LOGIN',
        severity: 'warning',
        userId: adminUser._id,
        userEmail: 'admin@example.com',
        description: 'Admin login',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2024-06-02')
      },
      {
        eventType: 'CAUSE_CREATED',
        severity: 'info',
        userId: adminUser._id,
        userEmail: 'admin@example.com',
        description: 'Cause created',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2024-06-03')
      }
    ]);

    const response = await request(app)
      .get('/api/admin/audit-logs')
      .query({
        eventType: 'USER_LOGIN',
        severity: 'info',
        startDate: '2024-06-01',
        endDate: '2024-06-30'
      })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.logs).toHaveLength(1);
    expect(response.body.data.logs[0].userEmail).toBe('donor@example.com');
  });

  it('should filter with only startDate', async () => {
    await AuditLog.create([
      {
        eventType: 'USER_LOGIN',
        severity: 'info',
        userId: donorUser._id,
        userEmail: 'donor@example.com',
        description: 'Login',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2024-05-01')
      },
      {
        eventType: 'USER_LOGIN',
        severity: 'info',
        userId: donorUser._id,
        userEmail: 'donor@example.com',
        description: 'Login',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2024-07-01')
      }
    ]);

    const response = await request(app)
      .get('/api/admin/audit-logs')
      .query({ startDate: '2024-06-01' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.logs).toHaveLength(1);
  });

  it('should filter with only endDate', async () => {
    await AuditLog.create([
      {
        eventType: 'USER_LOGIN',
        severity: 'info',
        userId: donorUser._id,
        userEmail: 'donor@example.com',
        description: 'Login',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2024-05-01')
      },
      {
        eventType: 'USER_LOGIN',
        severity: 'info',
        userId: donorUser._id,
        userEmail: 'donor@example.com',
        description: 'Login',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2024-07-01')
      }
    ]);

    const response = await request(app)
      .get('/api/admin/audit-logs')
      .query({ endDate: '2024-06-01' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.logs).toHaveLength(1);
  });

  it('should handle search query', async () => {
    await AuditLog.create([
      {
        eventType: 'USER_LOGIN',
        severity: 'info',
        userId: donorUser._id,
        userEmail: 'john@example.com',
        description: 'User John logged in',
        ipAddress: '127.0.0.1'
      },
      {
        eventType: 'USER_LOGIN',
        severity: 'info',
        userId: adminUser._id,
        userEmail: 'admin@example.com',
        description: 'Admin logged in',
        ipAddress: '127.0.0.1'
      }
    ]);

    const response = await request(app)
      .get('/api/admin/audit-logs')
      .query({ search: 'john' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.logs.length).toBeGreaterThan(0);
  });

  it('should handle logs without metadata', async () => {
    await AuditLog.create({
      eventType: 'USER_LOGIN',
      severity: 'info',
      userId: donorUser._id,
      userEmail: 'donor@example.com',
      description: 'Login',
      ipAddress: '127.0.0.1'
      // No metadata field
    });

    const response = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.logs).toHaveLength(1);
  });
});

describe('Audit Log Routes - Stats Endpoint', () => {
  it('should return audit log statistics without date filter', async () => {
    await AuditLog.create([
      {
        eventType: 'USER_LOGIN',
        severity: 'info',
        userId: donorUser._id,
        userEmail: 'donor@example.com',
        description: 'Login',
        ipAddress: '127.0.0.1'
      },
      {
        eventType: 'CAUSE_CREATED',
        severity: 'info',
        userId: adminUser._id,
        userEmail: 'admin@example.com',
        description: 'Created cause',
        ipAddress: '127.0.0.1'
      }
    ]);

    const response = await request(app)
      .get('/api/admin/audit-logs/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.totalLogs).toBe(2);
    expect(response.body.data.eventTypeStats).toHaveLength(2);
    expect(response.body.data.severityStats).toBeDefined();
    expect(response.body.data.recentActivity).toHaveLength(2);
  });

  it('should return stats with date filter', async () => {
    await AuditLog.create([
      {
        eventType: 'USER_LOGIN',
        severity: 'info',
        userId: donorUser._id,
        userEmail: 'donor@example.com',
        description: 'Login',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2024-06-01')
      },
      {
        eventType: 'USER_LOGIN',
        severity: 'warning',
        userId: adminUser._id,
        userEmail: 'admin@example.com',
        description: 'Failed login',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2024-07-01')
      }
    ]);

    const response = await request(app)
      .get('/api/admin/audit-logs/stats')
      .query({ startDate: '2024-06-01', endDate: '2024-06-30' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.totalLogs).toBe(1);
  });

  it('should handle stats query errors', async () => {
    jest.spyOn(AuditLog, 'countDocuments').mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app)
      .get('/api/admin/audit-logs/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(500);
    expect(response.body.message).toContain('Server error');
  });
});

describe('Audit Log Routes - Get Single Log', () => {
  it('should return single audit log with sanitized metadata', async () => {
    const log = await AuditLog.create({
      eventType: 'USER_LOGIN',
      severity: 'info',
      userId: donorUser._id,
      userEmail: 'donor@example.com',
      description: 'Login',
      ipAddress: '127.0.0.1',
      metadata: {
        password: 'secret123',
        token: 'jwt-token',
        secret: 'api-secret',
        userAgent: 'Mozilla'
      }
    });

    const response = await request(app)
      .get(`/api/admin/audit-logs/${log._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data._id).toBe(log._id.toString());
    expect(response.body.data.metadata.password).toBeUndefined();
    expect(response.body.data.metadata.token).toBeUndefined();
    expect(response.body.data.metadata.secret).toBeUndefined();
    expect(response.body.data.metadata.userAgent).toBe('Mozilla');
  });

  it('should return 404 for non-existent log', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .get(`/api/admin/audit-logs/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('not found');
  });

  it('should handle invalid ObjectId', async () => {
    const response = await request(app)
      .get('/api/admin/audit-logs/invalid-id')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(500);
  });
});

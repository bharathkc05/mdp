/**
 * Test Suite for Admin Routes
 * Tests admin operations for cause and user management
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import adminRoutes from '../../routes/adminRoutes.js';
import Cause from '../../models/Cause.js';
import User from '../../models/User.js';

let mongoServer;
let app;
let adminUser;
let donorUser;
let adminToken;
let donorToken;

// Mock audit logger
const mockLogCauseCreated = jest.fn();
const mockLogCauseUpdated = jest.fn();
const mockLogCauseDeleted = jest.fn();
const mockLogCauseArchived = jest.fn();
const mockLogUserRoleChanged = jest.fn();

jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logCauseCreated: mockLogCauseCreated,
  logCauseUpdated: mockLogCauseUpdated,
  logCauseDeleted: mockLogCauseDeleted,
  logCauseArchived: mockLogCauseArchived,
  logUserRoleChanged: mockLogUserRoleChanged
}));

// Mock cause status updater
const mockUpdateExpiredCauses = jest.fn();
jest.unstable_mockModule('../../utils/causeStatusUpdater.js', () => ({
  updateExpiredCauses: mockUpdateExpiredCauses
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);

  process.env.JWT_SECRET = 'test-secret-key';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  mockLogCauseCreated.mockResolvedValue();
  mockLogCauseUpdated.mockResolvedValue();
  mockLogCauseDeleted.mockResolvedValue();
  mockLogCauseArchived.mockResolvedValue();
  mockLogUserRoleChanged.mockResolvedValue();
  mockUpdateExpiredCauses.mockResolvedValue({ modifiedCount: 0 });

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
  await Cause.deleteMany({});
  await User.deleteMany({});
});

describe('Admin Routes - Get Causes', () => {
  describe('GET /api/admin/causes', () => {
    it('should return all causes with pagination', async () => {
      await Cause.create([
        {
          name: 'Cause 1',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Cause 2',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 3000,
          status: 'paused',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/admin/causes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
    });

    it('should support pagination', async () => {
      for (let i = 1; i <= 15; i++) {
        await Cause.create({
          name: `Cause ${i}`,
          description: 'Test',
          category: 'education',
          targetAmount: 1000,
          status: 'active',
          createdBy: adminUser._id
        });
      }

      const response = await request(app)
        .get('/api/admin/causes?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(5);
      expect(response.body.page).toBe(2);
      expect(response.body.totalPages).toBe(2);
    });

    it('should filter by search query', async () => {
      await Cause.create([
        {
          name: 'Education for Children',
          description: 'Support education',
          category: 'education',
          targetAmount: 5000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Healthcare Support',
          description: 'Medical aid',
          category: 'healthcare',
          targetAmount: 3000,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/admin/causes?search=education')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].name).toContain('Education');
    });

    it('should filter by category', async () => {
      await Cause.create([
        {
          name: 'Education',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Healthcare',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 3000,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/admin/causes?category=healthcare')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].category).toBe('healthcare');
    });

    it('should filter by status', async () => {
      await Cause.create([
        {
          name: 'Active',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Paused',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 3000,
          status: 'paused',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/admin/causes?status=paused')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].status).toBe('paused');
    });

    it('should return archived causes when status=archived', async () => {
      await Cause.create([
        {
          name: 'Active',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Completed',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 3000,
          status: 'completed',
          createdBy: adminUser._id
        },
        {
          name: 'Cancelled',
          description: 'Test',
          category: 'environment',
          targetAmount: 2000,
          status: 'cancelled',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/admin/causes?status=archived')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2); // completed and cancelled
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/causes')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/admin/causes');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/causes/:id', () => {
    it('should return single cause with creator details', async () => {
      const cause = await Cause.create({
        name: 'Test Cause',
        description: 'Description',
        category: 'education',
        targetAmount: 5000,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .get(`/api/admin/causes/${cause._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Cause');
      expect(response.body.data.createdBy).toBeDefined();
    });

    it('should return 404 for non-existent cause', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/admin/causes/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});

describe('Admin Routes - Create Cause', () => {
  describe('POST /api/admin/causes', () => {
    it('should create a new cause', async () => {
      const causeData = {
        name: 'New Cause',
        description: 'Test description',
        category: 'education',
        targetAmount: 5000,
        imageUrl: 'https://example.com/image.jpg'
      };

      const response = await request(app)
        .post('/api/admin/causes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(causeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Cause');
      expect(mockLogCauseCreated).toHaveBeenCalled();

      const cause = await Cause.findOne({ name: 'New Cause' });
      expect(cause).toBeTruthy();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/admin/causes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should return 400 if target amount is zero or negative', async () => {
      const response = await request(app)
        .post('/api/admin/causes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Cause',
          description: 'Test',
          targetAmount: 0
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('greater than 0');
    });

    it('should return 400 if cause name already exists', async () => {
      await Cause.create({
        name: 'Existing Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/admin/causes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Existing Cause',
          description: 'Another description',
          targetAmount: 3000
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should set default category if not provided', async () => {
      const response = await request(app)
        .post('/api/admin/causes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'No Category Cause',
          description: 'Test',
          targetAmount: 5000
        });

      expect(response.status).toBe(201);
      expect(response.body.data.category).toBe('other');
    });
  });
});

describe('Admin Routes - Update Cause', () => {
  describe('PUT /api/admin/causes/:id', () => {
    it('should update a cause successfully', async () => {
      const cause = await Cause.create({
        name: 'Original Name',
        description: 'Original description',
        category: 'education',
        targetAmount: 5000,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .put(`/api/admin/causes/${cause._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          description: 'Updated description',
          targetAmount: 7000
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.targetAmount).toBe(7000);
      expect(mockLogCauseUpdated).toHaveBeenCalled();
    });

    it('should return 404 if cause not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/admin/causes/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('should return 400 if target amount is invalid', async () => {
      const cause = await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        createdBy: adminUser._id
      });

      const response = await request(app)
        .put(`/api/admin/causes/${cause._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetAmount: -100 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('greater than 0');
    });

    it('should update only provided fields', async () => {
      const cause = await Cause.create({
        name: 'Test Cause',
        description: 'Original description',
        category: 'education',
        targetAmount: 5000,
        createdBy: adminUser._id
      });

      const response = await request(app)
        .put(`/api/admin/causes/${cause._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'New description only' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Test Cause'); // Unchanged
      expect(response.body.data.description).toBe('New description only');
    });
  });
});

describe('Admin Routes - Delete Cause', () => {
  describe('DELETE /api/admin/causes/:id', () => {
    it('should delete a cause with no donations', async () => {
      const cause = await Cause.create({
        name: 'To Delete',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        currentAmount: 0,
        createdBy: adminUser._id
      });

      const response = await request(app)
        .delete(`/api/admin/causes/${cause._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockLogCauseDeleted).toHaveBeenCalled();

      const deleted = await Cause.findById(cause._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 if cause not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/admin/causes/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 if cause has received donations', async () => {
      const cause = await Cause.create({
        name: 'With Donations',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        currentAmount: 1000,
        createdBy: adminUser._id
      });

      const response = await request(app)
        .delete(`/api/admin/causes/${cause._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('received donations');
    });
  });
});

describe('Admin Routes - Archive Cause', () => {
  describe('PATCH /api/admin/causes/:id/archive', () => {
    it('should archive an active cause', async () => {
      const cause = await Cause.create({
        name: 'Active Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .patch(`/api/admin/causes/${cause._id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
      expect(mockLogCauseArchived).toHaveBeenCalled();
    });

    it('should unarchive a cancelled cause', async () => {
      const cause = await Cause.create({
        name: 'Cancelled Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        status: 'cancelled',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .patch(`/api/admin/causes/${cause._id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('active');
    });

    it('should return 404 if cause not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .patch(`/api/admin/causes/${fakeId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});

describe('Admin Routes - User Management', () => {
  describe('GET /api/admin/users', () => {
    it('should return all users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.data[0]).not.toHaveProperty('password');
    });

    it('should return 403 for non-admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should return single user', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${donorUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('donor@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/admin/users/:id/role', () => {
    it('should update user role', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${donorUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('admin');
      expect(mockLogUserRoleChanged).toHaveBeenCalled();
    });

    it('should return 400 if role is invalid', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${donorUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superuser' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Valid role');
    });

    it('should prevent admin from changing their own role', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${adminUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'donor' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('cannot change your own role');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/admin/users/${fakeId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(404);
    });
  });
});

describe('Admin Routes - Dashboard Stats', () => {
  describe('GET /api/admin/dashboard/stats', () => {
    it('should return dashboard statistics', async () => {
      await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        currentAmount: 1000,
        donorCount: 10,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.causes).toBeDefined();
      expect(response.body.data.donations).toBeDefined();
    });
  });
});

describe('Admin Routes - Previous Donations', () => {
  describe('GET /api/admin/previous-donations', () => {
    it('should return all donations', async () => {
      donorUser.donations.push({
        amount: 100,
        cause: 'Test Cause',
        causeId: new mongoose.Types.ObjectId(),
        paymentId: 'test-1',
        paymentMethod: 'credit_card',
        status: 'completed',
        date: new Date()
      });
      await donorUser.save();

      const response = await request(app)
        .get('/api/admin/previous-donations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/admin/previous-donations')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should export as CSV', async () => {
      donorUser.donations.push({
        amount: 100,
        cause: 'Test Cause',
        causeId: new mongoose.Types.ObjectId(),
        paymentId: 'test-csv',
        status: 'completed',
        date: new Date()
      });
      await donorUser.save();

      const response = await request(app)
        .get('/api/admin/previous-donations?export=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });
  });

  describe('GET /api/admin/donations/by-user', () => {
    it('should aggregate donations by user', async () => {
      donorUser.donations.push({
        amount: 100,
        cause: 'Test',
        causeId: new mongoose.Types.ObjectId(),
        paymentId: 'test-1',
        date: new Date()
      });
      await donorUser.save();

      const response = await request(app)
        .get('/api/admin/donations/by-user')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });
});

describe('Admin Routes - Update Expired Causes', () => {
  describe('POST /api/admin/causes/update-expired', () => {
    it('should trigger expired cause update', async () => {
      mockUpdateExpiredCauses.mockResolvedValue({ modifiedCount: 2 });

      const response = await request(app)
        .post('/api/admin/causes/update-expired')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.modifiedCount).toBe(2);
      expect(mockUpdateExpiredCauses).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockUpdateExpiredCauses.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .post('/api/admin/causes/update-expired')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
    });
  });
});

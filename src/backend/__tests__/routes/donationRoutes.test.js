/**
 * Test Suite for Donation Routes
 * Tests donation processing, history, stats, and receipt generation
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import donationRoutes from '../../routes/donationRoutes.js';
import Cause from '../../models/Cause.js';
import User from '../../models/User.js';
import PlatformConfig from '../../models/PlatformConfig.js';

let mongoServer;
let app;
let donorUser;
let adminUser;
let authToken;
let adminToken;

// Mock audit logger
const mockLogDonationCreated = jest.fn();
const mockLogDonationFailed = jest.fn();

jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logDonationCreated: mockLogDonationCreated,
  logDonationFailed: mockLogDonationFailed
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  app = express();
  app.use(express.json());
  app.use('/api/donate', donationRoutes);

  process.env.JWT_SECRET = 'test-secret-key';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  mockLogDonationCreated.mockResolvedValue();
  mockLogDonationFailed.mockResolvedValue();

  // Create test users
  donorUser = await User.create({
    firstName: 'John',
    lastName: 'Donor',
    age: 25,
    email: 'donor@example.com',
    password: 'password123',
    role: 'donor',
    verified: true
  });

  adminUser = await User.create({
    firstName: 'Admin',
    lastName: 'User',
    age: 30,
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    verified: true
  });

  authToken = jwt.sign({ id: donorUser._id, email: donorUser.email }, process.env.JWT_SECRET);
  adminToken = jwt.sign({ id: adminUser._id, email: adminUser.email }, process.env.JWT_SECRET);

  // Initialize platform config
  await PlatformConfig.create({
    minimumDonation: { enabled: true, amount: 1 },
    currency: { code: 'USD', symbol: '$' }
  });
});

afterEach(async () => {
  await Cause.deleteMany({});
  await User.deleteMany({});
  await PlatformConfig.deleteMany({});
});

describe('Donation Routes - Get Causes', () => {
  describe('GET /api/donate/causes', () => {
    it('should return active causes for authenticated users', async () => {
      await Cause.create([
        {
          name: 'Active Cause',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Paused Cause',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 3000,
          status: 'paused',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/donate/causes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].status).toBe('active');
    });

    it('should filter by status', async () => {
      await Cause.create([
        {
          name: 'Active Cause',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Paused Cause',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 3000,
          status: 'paused',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/donate/causes?status=paused')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].status).toBe('paused');
    });

    it('should filter by category', async () => {
      await Cause.create([
        {
          name: 'Education Cause',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Healthcare Cause',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 3000,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/donate/causes?category=education')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].category).toBe('education');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/donate/causes');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/donate/causes/:id', () => {
    it('should return single cause details', async () => {
      const cause = await Cause.create({
        name: 'Test Cause',
        description: 'Description',
        category: 'education',
        targetAmount: 5000,
        currentAmount: 1000,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .get(`/api/donate/causes/${cause._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Cause');
    });

    it('should return 404 for non-existent cause', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/donate/causes/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Cause not found');
    });
  });
});

describe('Donation Routes - Make Donation', () => {
  describe('POST /api/donate', () => {
    it('should process donation successfully', async () => {
      const cause = await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        currentAmount: 0,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          causeId: cause._id.toString(),
          amount: 100
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Donation successful');
      expect(mockLogDonationCreated).toHaveBeenCalled();

      // Verify cause was updated
      const updatedCause = await Cause.findById(cause._id);
      expect(updatedCause.currentAmount).toBe(100);
      expect(updatedCause.donorCount).toBe(1);

      // Verify user donation history
      const updatedUser = await User.findById(donorUser._id);
      expect(updatedUser.donations).toHaveLength(1);
      expect(updatedUser.donations[0].amount).toBe(100);
    });

    it('should return 400 if cause ID is missing', async () => {
      const response = await request(app)
        .post('/api/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 100 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Cause ID and amount are required');
    });

    it('should return 400 if amount is zero or negative', async () => {
      const cause = await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          causeId: cause._id.toString(),
          amount: 0
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('amount must be greater than 0');
    });

    it('should return 400 if amount below minimum donation', async () => {
      const cause = await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          causeId: cause._id.toString(),
          amount: 0.5
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('must be at least');
    });

    it('should return 404 if cause not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post('/api/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          causeId: fakeId.toString(),
          amount: 100
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Cause not found');
    });

    it('should return 400 if cause is not active', async () => {
      const cause = await Cause.create({
        name: 'Paused Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        status: 'paused',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          causeId: cause._id.toString(),
          amount: 100
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('not accepting donations');
    });

    it('should return 400 if cause has ended', async () => {
      const cause = await Cause.create({
        name: 'Ended Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        status: 'active',
        endDate: new Date('2020-01-01'),
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          causeId: cause._id.toString(),
          amount: 100
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('has ended');
    });

    it('should mark cause as completed when target is reached', async () => {
      const cause = await Cause.create({
        name: 'Near Complete',
        description: 'Test',
        category: 'education',
        targetAmount: 1000,
        currentAmount: 900,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          causeId: cause._id.toString(),
          amount: 100
        });

      expect(response.status).toBe(201);
      
      const updatedCause = await Cause.findById(cause._id);
      expect(updatedCause.status).toBe('completed');
    });

    it('should handle transaction rollback on simulated failure', async () => {
      const cause = await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        currentAmount: 0,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          causeId: cause._id.toString(),
          amount: 100,
          simulateFailure: true
        });

      expect(response.status).toBe(500);
      expect(mockLogDonationFailed).toHaveBeenCalled();

      // Verify no changes persisted
      const unchangedCause = await Cause.findById(cause._id);
      expect(unchangedCause.currentAmount).toBe(0);
      expect(unchangedCause.donorCount).toBe(0);
    });
  });
});

describe('Donation Routes - Multi-Cause Donation', () => {
  describe('POST /api/donate/multi', () => {
    it('should donate to multiple causes', async () => {
      const cause1 = await Cause.create({
        name: 'Cause 1',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        status: 'active',
        createdBy: adminUser._id
      });

      const cause2 = await Cause.create({
        name: 'Cause 2',
        description: 'Test',
        category: 'healthcare',
        targetAmount: 3000,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/donate/multi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          totalAmount: 150,
          causes: [
            { causeId: cause1._id.toString(), amount: 100 },
            { causeId: cause2._id.toString(), amount: 50 }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.causesCount).toBe(2);

      // Verify both causes were updated
      const updated1 = await Cause.findById(cause1._id);
      const updated2 = await Cause.findById(cause2._id);
      expect(updated1.currentAmount).toBe(100);
      expect(updated2.currentAmount).toBe(50);

      // Verify user has 2 donation records
      const updatedUser = await User.findById(donorUser._id);
      expect(updatedUser.donations).toHaveLength(2);
    });

    it('should return 400 if causes array is empty', async () => {
      const response = await request(app)
        .post('/api/donate/multi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          totalAmount: 100,
          causes: []
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('At least one cause');
    });

    it('should return 400 if total amount does not match allocations', async () => {
      const cause = await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/donate/multi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          totalAmount: 150,
          causes: [
            { causeId: cause._id.toString(), amount: 100 }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('must equal total amount');
    });

    it('should return 404 if any cause not found', async () => {
      const cause = await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        status: 'active',
        createdBy: adminUser._id
      });

      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/donate/multi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          totalAmount: 150,
          causes: [
            { causeId: cause._id.toString(), amount: 100 },
            { causeId: fakeId.toString(), amount: 50 }
          ]
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 if any cause is not active', async () => {
      const cause1 = await Cause.create({
        name: 'Active Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 5000,
        status: 'active',
        createdBy: adminUser._id
      });

      const cause2 = await Cause.create({
        name: 'Paused Cause',
        description: 'Test',
        category: 'healthcare',
        targetAmount: 3000,
        status: 'paused',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/donate/multi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          totalAmount: 150,
          causes: [
            { causeId: cause1._id.toString(), amount: 100 },
            { causeId: cause2._id.toString(), amount: 50 }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('not active');
    });
  });
});

describe('Donation Routes - History and Stats', () => {
  describe('GET /api/donate/history', () => {
    it('should return user donation history', async () => {
      // Add donations to user
      donorUser.donations.push({
        amount: 100,
        cause: 'Test Cause',
        causeId: new mongoose.Types.ObjectId(),
        paymentId: 'test-payment-1',
        status: 'completed',
        date: new Date()
      });
      await donorUser.save();

      const response = await request(app)
        .get('/api/donate/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.donations).toHaveLength(1);
      expect(response.body.data.summary.totalDonated).toBe(100);
    });

    it('should return empty history for new user', async () => {
      const response = await request(app)
        .get('/api/donate/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.donations).toHaveLength(0);
      expect(response.body.data.summary.totalDonated).toBe(0);
    });
  });

  describe('GET /api/donate/stats', () => {
    it('should return donation statistics', async () => {
      donorUser.donations.push(
        {
          amount: 100,
          cause: 'Education Fund',
          causeId: new mongoose.Types.ObjectId(),
          paymentId: 'test-1',
          status: 'completed',
          date: new Date()
        },
        {
          amount: 50,
          cause: 'Education Fund',
          causeId: new mongoose.Types.ObjectId(),
          paymentId: 'test-2',
          status: 'completed',
          date: new Date()
        }
      );
      await donorUser.save();

      const response = await request(app)
        .get('/api/donate/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalDonated).toBe(150);
      expect(response.body.data.donationCount).toBe(2);
      expect(response.body.data.averageDonation).toBe(75);
      expect(response.body.data.mostSupportedCause).toBeDefined();
    });
  });

  describe('GET /api/donate/categories', () => {
    it('should return available categories', async () => {
      await Cause.create([
        {
          name: 'Education Cause',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Healthcare Cause',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 3000,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/donate/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toContain('education');
      expect(response.body.data).toContain('healthcare');
    });
  });
});

describe('Donation Routes - Receipt Generation', () => {
  describe('GET /api/donate/receipt/:paymentId', () => {
    it('should generate PDF receipt for donor', async () => {
      donorUser.donations.push({
        amount: 100,
        cause: 'Test Cause',
        causeId: new mongoose.Types.ObjectId(),
        paymentId: 'test-payment-123',
        paymentMethod: 'credit_card',
        status: 'completed',
        date: new Date()
      });
      await donorUser.save();

      const response = await request(app)
        .get('/api/donate/receipt/test-payment-123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('receipt_test-payment-123.pdf');
    });

    it('should return 404 if payment ID not found', async () => {
      const response = await request(app)
        .get('/api/donate/receipt/nonexistent-payment')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Donation not found');
    });

    it('should allow admin to fetch any receipt', async () => {
      donorUser.donations.push({
        amount: 100,
        cause: 'Test Cause',
        causeId: new mongoose.Types.ObjectId(),
        paymentId: 'donor-payment-123',
        status: 'completed',
        date: new Date()
      });
      await donorUser.save();

      const response = await request(app)
        .get('/api/donate/receipt/donor-payment-123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
    });
  });
});

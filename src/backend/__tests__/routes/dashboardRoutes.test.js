/**
 * Test Suite for Dashboard Routes
 * Tests dashboard aggregated data endpoints
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import dashboardRoutes from '../../routes/dashboardRoutes.js';
import Cause from '../../models/Cause.js';
import User from '../../models/User.js';

let mongoServer;
let app;
let donorUser;
let adminUser;
let donorToken;
let adminToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  app = express();
  app.use(express.json());
  app.use('/api/dashboard', dashboardRoutes);

  process.env.JWT_SECRET = 'test-secret-key';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
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

  donorToken = jwt.sign({ id: donorUser._id, email: donorUser.email }, process.env.JWT_SECRET);
  adminToken = jwt.sign({ id: adminUser._id, email: adminUser.email }, process.env.JWT_SECRET);
});

afterEach(async () => {
  await Cause.deleteMany({});
  await User.deleteMany({});
});

describe('Dashboard Routes - Aggregated Donations', () => {
  describe('GET /api/dashboard/aggregated-donations', () => {
    it('should return aggregated donation data', async () => {
      await Cause.create([
        {
          name: 'Education Fund',
          description: 'Support education',
          category: 'education',
          targetAmount: 5000,
          currentAmount: 1000,
          donorCount: 10,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Healthcare Support',
          description: 'Medical aid',
          category: 'healthcare',
          targetAmount: 10000,
          currentAmount: 5000,
          donorCount: 20,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/aggregated-donations')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.causes).toHaveLength(2);
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.statistics.totalCauses).toBe(2);
      expect(response.body.data.statistics.totalDonationsCollected).toBe(6000);
    });

    it('should calculate percentage achieved correctly', async () => {
      await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 1000,
        currentAmount: 250,
        donorCount: 5,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .get('/api/dashboard/aggregated-donations')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.causes[0].percentageAchieved).toBe(25);
    });

    it('should filter by status', async () => {
      await Cause.create([
        {
          name: 'Active Cause',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          currentAmount: 1000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Completed Cause',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 3000,
          currentAmount: 3000,
          status: 'completed',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/aggregated-donations?status=active')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.causes).toHaveLength(1);
      expect(response.body.data.causes[0].status).toBe('active');
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
        .get('/api/dashboard/aggregated-donations?category=education')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.causes).toHaveLength(1);
      expect(response.body.data.causes[0].category).toBe('education');
    });

    it('should sort by specified field', async () => {
      await Cause.create([
        {
          name: 'Low Donations',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          currentAmount: 100,
          donorCount: 5,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'High Donations',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 10000,
          currentAmount: 5000,
          donorCount: 50,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/aggregated-donations?sortBy=donorCount&order=desc')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.causes[0].donorCount).toBe(50);
      expect(response.body.data.causes[1].donorCount).toBe(5);
    });

    it('should calculate remaining amount', async () => {
      await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 1000,
        currentAmount: 300,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .get('/api/dashboard/aggregated-donations')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.causes[0].remainingAmount).toBe(700);
    });

    it('should calculate average donation per donor', async () => {
      await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 1000,
        currentAmount: 500,
        donorCount: 10,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .get('/api/dashboard/aggregated-donations')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.causes[0].averageDonation).toBe(50);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/dashboard/aggregated-donations');

      expect(response.status).toBe(401);
    });
  });
});

describe('Dashboard Routes - Donation Trends', () => {
  describe('GET /api/dashboard/donation-trends', () => {
    it('should return daily donation trends', async () => {
      const user = await User.create({
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        email: 'test@example.com',
        password: 'password123',
        verified: true,
        donations: [
          {
            amount: 100,
            cause: 'Test Cause',
            causeId: new mongoose.Types.ObjectId(),
            paymentId: 'test-1',
            date: new Date()
          },
          {
            amount: 50,
            cause: 'Test Cause 2',
            causeId: new mongoose.Types.ObjectId(),
            paymentId: 'test-2',
            date: new Date()
          }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/donation-trends?period=daily')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.trends).toBeDefined();
      expect(response.body.data.period).toBe('daily');
    });

    it('should support weekly period', async () => {
      const response = await request(app)
        .get('/api/dashboard/donation-trends?period=weekly')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.period).toBe('weekly');
    });

    it('should support monthly period', async () => {
      const response = await request(app)
        .get('/api/dashboard/donation-trends?period=monthly')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.period).toBe('monthly');
    });

    it('should limit results based on query parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/donation-trends?limit=10')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.limit).toBe(10);
    });
  });
});

describe('Dashboard Routes - Category Breakdown', () => {
  describe('GET /api/dashboard/category-breakdown', () => {
    it('should return donation breakdown by category', async () => {
      await Cause.create([
        {
          name: 'Education 1',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          currentAmount: 1000,
          donorCount: 10,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Education 2',
          description: 'Test',
          category: 'education',
          targetAmount: 3000,
          currentAmount: 500,
          donorCount: 5,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Healthcare',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 10000,
          currentAmount: 2000,
          donorCount: 20,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/category-breakdown')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);

      const educationCategory = response.body.data.find(c => c.category === 'education');
      expect(educationCategory).toBeDefined();
      expect(educationCategory.totalCauses).toBe(2);
      expect(educationCategory.totalDonations).toBe(1500);
    });

    it('should calculate average completion percentage', async () => {
      await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .get('/api/dashboard/category-breakdown')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      const educationCategory = response.body.data.find(c => c.category === 'education');
      expect(educationCategory.averageCompletion).toBe(50);
    });

    it('should count active and completed causes', async () => {
      await Cause.create([
        {
          name: 'Active Education',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          currentAmount: 1000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Completed Education',
          description: 'Test',
          category: 'education',
          targetAmount: 3000,
          currentAmount: 3000,
          status: 'completed',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/category-breakdown')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      const educationCategory = response.body.data.find(c => c.category === 'education');
      expect(educationCategory.activeCauses).toBe(1);
      expect(educationCategory.completedCauses).toBe(1);
    });
  });
});

describe('Dashboard Routes - Top Causes', () => {
  describe('GET /api/dashboard/top-causes', () => {
    it('should return top causes by current amount', async () => {
      await Cause.create([
        {
          name: 'High Donations',
          description: 'Test',
          category: 'education',
          targetAmount: 10000,
          currentAmount: 5000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Low Donations',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 5000,
          currentAmount: 500,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/top-causes?metric=currentAmount')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.topCauses[0].name).toBe('High Donations');
      expect(response.body.data.topCauses[0].currentAmount).toBe(5000);
    });

    it('should support sorting by donor count', async () => {
      await Cause.create([
        {
          name: 'Many Donors',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          currentAmount: 1000,
          donorCount: 100,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Few Donors',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 5000,
          currentAmount: 2000,
          donorCount: 10,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/top-causes?metric=donorCount')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.topCauses[0].name).toBe('Many Donors');
    });

    it('should respect limit parameter', async () => {
      await Cause.create([
        {
          name: 'Cause 1',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          currentAmount: 1000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Cause 2',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 3000,
          currentAmount: 500,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/top-causes?limit=1')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.topCauses).toHaveLength(1);
    });

    it('should include percentage achieved in results', async () => {
      await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 1000,
        currentAmount: 750,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .get('/api/dashboard/top-causes')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.topCauses[0].percentageAchieved).toBe(75);
    });
  });
});

describe('Dashboard Routes - Donor Insights', () => {
  describe('GET /api/dashboard/donor-insights', () => {
    it('should return donor insights for admin', async () => {
      await User.create({
        firstName: 'Active',
        lastName: 'Donor',
        age: 25,
        email: 'activedonor@example.com',
        password: 'password123',
        role: 'donor',
        verified: true,
        donations: [
          {
            amount: 100,
            cause: 'Test Cause',
            causeId: new mongoose.Types.ObjectId(),
            paymentId: 'test-1',
            date: new Date()
          }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/donor-insights')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.topDonors).toBeDefined();
      expect(response.body.data.statistics).toBeDefined();
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/dashboard/donor-insights')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(403);
    });

    it('should calculate donor statistics', async () => {
      await User.create([
        {
          firstName: 'Donor',
          lastName: 'One',
          age: 25,
          email: 'donor1@example.com',
          password: 'password123',
          role: 'donor',
          verified: true,
          donations: [
            {
              amount: 100,
              cause: 'Cause 1',
              causeId: new mongoose.Types.ObjectId(),
              paymentId: 'test-1',
              date: new Date()
            }
          ]
        },
        {
          firstName: 'Donor',
          lastName: 'Two',
          age: 30,
          email: 'donor2@example.com',
          password: 'password123',
          role: 'donor',
          verified: true,
          donations: [
            {
              amount: 50,
              cause: 'Cause 2',
              causeId: new mongoose.Types.ObjectId(),
              paymentId: 'test-2',
              date: new Date()
            },
            {
              amount: 75,
              cause: 'Cause 3',
              causeId: new mongoose.Types.ObjectId(),
              paymentId: 'test-3',
              date: new Date()
            }
          ]
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/donor-insights')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.statistics.totalDonors).toBeGreaterThan(0);
      expect(response.body.data.statistics.activeDonors).toBeGreaterThan(0);
    });
  });
});

describe('Dashboard Routes - Performance Metrics', () => {
  describe('GET /api/dashboard/performance-metrics', () => {
    it('should return comprehensive performance metrics', async () => {
      await Cause.create([
        {
          name: 'Active Cause',
          description: 'Test',
          category: 'education',
          targetAmount: 5000,
          currentAmount: 2500,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Completed Cause',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 3000,
          currentAmount: 3000,
          status: 'completed',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/performance-metrics')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.causes).toBeDefined();
      expect(response.body.data.donations).toBeDefined();
      expect(response.body.data.users).toBeDefined();
    });

    it('should calculate cause metrics correctly', async () => {
      await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .get('/api/dashboard/performance-metrics')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.causes.totalCauses).toBe(1);
      expect(response.body.data.causes.activeCauses).toBe(1);
      expect(response.body.data.causes.totalRaised).toBe(500);
    });

    it('should include timestamp', async () => {
      const response = await request(app)
        .get('/api/dashboard/performance-metrics')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.timestamp).toBeDefined();
      expect(new Date(response.body.data.timestamp)).toBeInstanceOf(Date);
    });

    it('should calculate completion rate', async () => {
      await Cause.create([
        {
          name: 'Completed',
          description: 'Test',
          category: 'education',
          targetAmount: 1000,
          currentAmount: 1000,
          status: 'completed',
          createdBy: adminUser._id
        },
        {
          name: 'Active',
          description: 'Test',
          category: 'healthcare',
          targetAmount: 1000,
          currentAmount: 500,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/performance-metrics')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.causes.completionRate).toBe('50.00');
    });
  });
});

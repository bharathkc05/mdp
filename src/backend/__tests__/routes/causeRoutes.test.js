/**
 * Test Suite for Cause Routes
 * Tests public cause endpoints (viewing causes and categories)
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import causeRoutes from '../../routes/causeRoutes.js';
import Cause from '../../models/Cause.js';
import User from '../../models/User.js';

let mongoServer;
let app;
let adminUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  app = express();
  app.use(express.json());
  app.use('/api/causes', causeRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Create admin user for cause creation
  adminUser = await User.create({
    firstName: 'Admin',
    lastName: 'User',
    age: 30,
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    verified: true
  });
});

afterEach(async () => {
  await Cause.deleteMany({});
  await User.deleteMany({});
});

describe('Cause Routes - Get All Causes', () => {
  describe('GET /api/causes', () => {
    it('should return all active causes', async () => {
      await Cause.create([
        {
          name: 'Education Fund',
          description: 'Support education',
          category: 'education',
          targetAmount: 5000,
          currentAmount: 1000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Healthcare Support',
          description: 'Medical aid',
          category: 'healthcare',
          targetAmount: 10000,
          currentAmount: 500,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Paused Cause',
          description: 'This is paused',
          category: 'other',
          targetAmount: 2000,
          status: 'paused',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app).get('/api/causes');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2); // Only active causes
      expect(response.body.causes).toHaveLength(2);
      expect(response.body.causes[0]).toHaveProperty('percentageAchieved');
    });

    it('should filter causes by search query', async () => {
      await Cause.create([
        {
          name: 'Education Fund',
          description: 'Support education for children',
          category: 'education',
          targetAmount: 5000,
          status: 'active',
          createdBy: adminUser._id
        },
        {
          name: 'Healthcare Support',
          description: 'Medical aid',
          category: 'healthcare',
          targetAmount: 10000,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/causes')
        .query({ search: 'education' });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.causes[0].name).toBe('Education Fund');
    });

    it('should filter causes by category', async () => {
      await Cause.create([
        {
          name: 'Education Fund',
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
          targetAmount: 10000,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/causes')
        .query({ category: 'healthcare' });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.causes[0].category).toBe('healthcare');
    });

    it('should return empty array when no causes exist', async () => {
      const response = await request(app).get('/api/causes');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
      expect(response.body.causes).toEqual([]);
    });

    it('should ignore category filter when set to "all"', async () => {
      await Cause.create([
        {
          name: 'Education Fund',
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
          targetAmount: 10000,
          status: 'active',
          createdBy: adminUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/causes')
        .query({ category: 'all' });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
    });

    it('should calculate percentage achieved correctly', async () => {
      await Cause.create({
        name: 'Test Cause',
        description: 'Test',
        category: 'education',
        targetAmount: 1000,
        currentAmount: 250,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app).get('/api/causes');

      expect(response.status).toBe(200);
      expect(response.body.causes[0].percentageAchieved).toBe(25);
    });

    it('should handle search with special regex characters', async () => {
      await Cause.create({
        name: 'Test (Special) Cause',
        description: 'Description with [brackets]',
        category: 'education',
        targetAmount: 1000,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .get('/api/causes')
        .query({ search: 'special' });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
    });
  });
});

describe('Cause Routes - Get Single Cause', () => {
  describe('GET /api/causes/:id', () => {
    it('should return a single cause by ID', async () => {
      const cause = await Cause.create({
        name: 'Education Fund',
        description: 'Support education',
        category: 'education',
        targetAmount: 5000,
        currentAmount: 1000,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app).get(`/api/causes/${cause._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.cause.name).toBe('Education Fund');
      expect(response.body.cause.percentageAchieved).toBe(20);
      expect(response.body.cause.createdBy).toBeDefined();
    });

    it('should return 404 if cause not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/api/causes/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cause not found');
    });

    it('should handle invalid ObjectId format', async () => {
      const response = await request(app).get('/api/causes/invalid-id');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should populate createdBy field with user details', async () => {
      const cause = await Cause.create({
        name: 'Education Fund',
        description: 'Support education',
        category: 'education',
        targetAmount: 5000,
        status: 'active',
        createdBy: adminUser._id
      });

      const response = await request(app).get(`/api/causes/${cause._id}`);

      expect(response.status).toBe(200);
      expect(response.body.cause.createdBy).toBeDefined();
      expect(response.body.cause.createdBy.firstName).toBe('Admin');
      expect(response.body.cause.createdBy.lastName).toBe('User');
    });

    it('should calculate percentage for completed causes', async () => {
      const cause = await Cause.create({
        name: 'Completed Cause',
        description: 'Fully funded',
        category: 'education',
        targetAmount: 1000,
        currentAmount: 1500,
        status: 'completed',
        createdBy: adminUser._id
      });

      const response = await request(app).get(`/api/causes/${cause._id}`);

      expect(response.status).toBe(200);
      expect(response.body.cause.percentageAchieved).toBe(150);
    });
  });
});

describe('Cause Routes - Get Categories', () => {
  describe('GET /api/causes/categories/list', () => {
    it('should return list of available categories', async () => {
      const response = await request(app).get('/api/causes/categories/list');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.categories).toBeInstanceOf(Array);
      expect(response.body.categories.length).toBeGreaterThan(0);
    });

    it('should return categories with value and label', async () => {
      const response = await request(app).get('/api/causes/categories/list');

      expect(response.status).toBe(200);
      response.body.categories.forEach(category => {
        expect(category).toHaveProperty('value');
        expect(category).toHaveProperty('label');
      });
    });

    it('should include standard categories', async () => {
      const response = await request(app).get('/api/causes/categories/list');

      const categoryValues = response.body.categories.map(c => c.value);
      expect(categoryValues).toContain('education');
      expect(categoryValues).toContain('healthcare');
      expect(categoryValues).toContain('environment');
      expect(categoryValues).toContain('disaster-relief');
      expect(categoryValues).toContain('poverty');
      expect(categoryValues).toContain('animal-welfare');
      expect(categoryValues).toContain('other');
    });
  });
});

describe('Cause Routes - Edge Cases', () => {
  it('should handle database errors gracefully', async () => {
    // Disconnect from database to simulate error
    await mongoose.disconnect();

    const response = await request(app).get('/api/causes');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);

    // Reconnect for other tests
    await mongoose.connect(mongoServer.getUri());
  });

  it('should handle causes with zero target amount', async () => {
    const cause = await Cause.create({
      name: 'Zero Target',
      description: 'Test cause',
      category: 'education',
      targetAmount: 0,
      currentAmount: 100,
      status: 'active',
      createdBy: adminUser._id
    });

    const response = await request(app).get(`/api/causes/${cause._id}`);

    expect(response.status).toBe(200);
    expect(response.body.cause.percentageAchieved).toBe(0);
  });

  it('should sort causes by creation date (newest first)', async () => {
    const cause1 = await Cause.create({
      name: 'First Cause',
      description: 'Created first',
      category: 'education',
      targetAmount: 1000,
      status: 'active',
      createdBy: adminUser._id,
      createdAt: new Date('2024-01-01')
    });

    const cause2 = await Cause.create({
      name: 'Second Cause',
      description: 'Created second',
      category: 'healthcare',
      targetAmount: 2000,
      status: 'active',
      createdBy: adminUser._id,
      createdAt: new Date('2024-01-02')
    });

    const response = await request(app).get('/api/causes');

    expect(response.status).toBe(200);
    expect(response.body.causes[0].name).toBe('Second Cause');
    expect(response.body.causes[1].name).toBe('First Cause');
  });

  it('should handle empty search query', async () => {
    await Cause.create({
      name: 'Test Cause',
      description: 'Test',
      category: 'education',
      targetAmount: 1000,
      status: 'active',
      createdBy: adminUser._id
    });

    const response = await request(app)
      .get('/api/causes')
      .query({ search: '   ' }); // Empty whitespace

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
  });
});

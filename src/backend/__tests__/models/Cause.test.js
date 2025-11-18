import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Cause from '../../models/Cause.js';
import User from '../../models/User.js';

let mongoServer;
let testUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Create a test user
  testUser = await User.create({
    firstName: 'Test',
    lastName: 'User',
    age: 30,
    email: 'test@example.com',
    password: 'Password123!'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Cause.deleteMany({});
});

describe('Cause Model', () => {
  const validCauseData = {
    name: 'Education for All',
    description: 'Provide education to underprivileged children',
    category: 'education',
    targetAmount: 10000,
    createdBy: null // Will be set in tests
  };

  describe('Cause Creation', () => {
    it('should create a new cause successfully', async () => {
      const causeData = { ...validCauseData, createdBy: testUser._id };
      const cause = new Cause(causeData);
      const savedCause = await cause.save();
      
      expect(savedCause._id).toBeDefined();
      expect(savedCause.name).toBe(causeData.name);
      expect(savedCause.description).toBe(causeData.description);
      expect(savedCause.currentAmount).toBe(0);
      expect(savedCause.status).toBe('active');
      expect(savedCause.donorCount).toBe(0);
    });

    it('should reject cause without required fields', async () => {
      const cause = new Cause({ name: 'Test' });
      await expect(cause.save()).rejects.toThrow();
    });

    it('should reject duplicate cause name', async () => {
      const causeData = { ...validCauseData, createdBy: testUser._id };
      await Cause.create(causeData);
      
      const duplicate = new Cause(causeData);
      await expect(duplicate.save()).rejects.toThrow(/duplicate key/);
    });

    it('should trim cause name', async () => {
      const causeData = { 
        ...validCauseData, 
        name: '  Trimmed Name  ',
        createdBy: testUser._id 
      };
      const cause = await Cause.create(causeData);
      
      expect(cause.name).toBe('Trimmed Name');
    });

    it('should set default category', async () => {
      const causeData = { ...validCauseData, createdBy: testUser._id };
      delete causeData.category;
      const cause = await Cause.create(causeData);
      
      expect(cause.category).toBe('other');
    });

    it('should accept valid categories', async () => {
      const categories = ['education', 'healthcare', 'environment', 'disaster-relief', 'poverty', 'animal-welfare', 'other'];
      
      for (let i = 0; i < categories.length; i++) {
        const cause = await Cause.create({
          ...validCauseData,
          name: `Cause ${i}`,
          category: categories[i],
          createdBy: testUser._id
        });
        expect(cause.category).toBe(categories[i]);
      }
    });

    it('should reject invalid category', async () => {
      const causeData = { 
        ...validCauseData, 
        category: 'invalid',
        createdBy: testUser._id 
      };
      const cause = new Cause(causeData);
      await expect(cause.save()).rejects.toThrow();
    });

    it('should enforce minimum target amount', async () => {
      const causeData = { 
        ...validCauseData, 
        targetAmount: -100,
        createdBy: testUser._id 
      };
      const cause = new Cause(causeData);
      await expect(cause.save()).rejects.toThrow();
    });
  });

  describe('Status Management', () => {
    it('should accept valid status values', async () => {
      const statuses = ['active', 'paused', 'completed', 'cancelled'];
      
      for (let i = 0; i < statuses.length; i++) {
        const cause = await Cause.create({
          ...validCauseData,
          name: `Status Test ${i}`,
          status: statuses[i],
          createdBy: testUser._id
        });
        expect(cause.status).toBe(statuses[i]);
      }
    });

    it('should reject invalid status', async () => {
      const causeData = { 
        ...validCauseData, 
        status: 'invalid',
        createdBy: testUser._id 
      };
      const cause = new Cause(causeData);
      await expect(cause.save()).rejects.toThrow();
    });

    it('should set default status as active', async () => {
      const causeData = { ...validCauseData, createdBy: testUser._id };
      delete causeData.status;
      const cause = await Cause.create(causeData);
      
      expect(cause.status).toBe('active');
    });
  });

  describe('Amount Tracking', () => {
    it('should initialize current amount to 0', async () => {
      const cause = await Cause.create({
        ...validCauseData,
        createdBy: testUser._id
      });
      
      expect(cause.currentAmount).toBe(0);
    });

    it('should update current amount', async () => {
      const cause = await Cause.create({
        ...validCauseData,
        createdBy: testUser._id
      });
      
      cause.currentAmount = 5000;
      await cause.save();
      
      expect(cause.currentAmount).toBe(5000);
    });

    it('should enforce non-negative current amount', async () => {
      const causeData = { 
        ...validCauseData, 
        currentAmount: -50,
        createdBy: testUser._id 
      };
      const cause = new Cause(causeData);
      await expect(cause.save()).rejects.toThrow();
    });
  });

  describe('Percentage Achieved Virtual', () => {
    it('should calculate percentage correctly', async () => {
      const cause = await Cause.create({
        ...validCauseData,
        targetAmount: 10000,
        currentAmount: 2500,
        createdBy: testUser._id
      });
      
      expect(cause.percentageAchieved).toBe(25);
    });

    it('should handle 0 target amount', async () => {
      const cause = await Cause.create({
        ...validCauseData,
        targetAmount: 0,
        currentAmount: 100,
        createdBy: testUser._id
      });
      
      expect(cause.percentageAchieved).toBe(0);
    });

    it('should handle 100% achievement', async () => {
      const cause = await Cause.create({
        ...validCauseData,
        targetAmount: 1000,
        currentAmount: 1000,
        createdBy: testUser._id
      });
      
      expect(cause.percentageAchieved).toBe(100);
    });

    it('should handle over-achievement', async () => {
      const cause = await Cause.create({
        ...validCauseData,
        targetAmount: 1000,
        currentAmount: 1500,
        createdBy: testUser._id
      });
      
      expect(cause.percentageAchieved).toBe(150);
    });

    it('should include virtual in JSON output', async () => {
      const cause = await Cause.create({
        ...validCauseData,
        targetAmount: 10000,
        currentAmount: 3000,
        createdBy: testUser._id
      });
      
      const json = cause.toJSON();
      expect(json.percentageAchieved).toBe(30);
    });
  });

  describe('Donor Count', () => {
    it('should initialize donor count to 0', async () => {
      const cause = await Cause.create({
        ...validCauseData,
        createdBy: testUser._id
      });
      
      expect(cause.donorCount).toBe(0);
    });

    it('should update donor count', async () => {
      const cause = await Cause.create({
        ...validCauseData,
        createdBy: testUser._id
      });
      
      cause.donorCount = 5;
      await cause.save();
      
      expect(cause.donorCount).toBe(5);
    });
  });

  describe('Dates', () => {
    it('should set startDate to current date by default', async () => {
      const before = new Date();
      const cause = await Cause.create({
        ...validCauseData,
        createdBy: testUser._id
      });
      const after = new Date();
      
      expect(cause.startDate).toBeDefined();
      expect(cause.startDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(cause.startDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should accept custom endDate', async () => {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      
      const cause = await Cause.create({
        ...validCauseData,
        endDate,
        createdBy: testUser._id
      });
      
      expect(cause.endDate).toEqual(endDate);
    });

    it('should have timestamps', async () => {
      const cause = await Cause.create({
        ...validCauseData,
        createdBy: testUser._id
      });
      
      expect(cause.createdAt).toBeDefined();
      expect(cause.updatedAt).toBeDefined();
    });
  });

  describe('Image URL', () => {
    it('should set default empty image URL', async () => {
      const cause = await Cause.create({
        ...validCauseData,
        createdBy: testUser._id
      });
      
      expect(cause.imageUrl).toBe('');
    });

    it('should accept custom image URL', async () => {
      const cause = await Cause.create({
        ...validCauseData,
        imageUrl: 'https://example.com/image.jpg',
        createdBy: testUser._id
      });
      
      expect(cause.imageUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('User Reference', () => {
    it('should require createdBy field', async () => {
      const causeData = { ...validCauseData };
      delete causeData.createdBy;
      const cause = new Cause(causeData);
      
      await expect(cause.save()).rejects.toThrow();
    });

    it('should reference User model', async () => {
      const cause = await Cause.create({
        ...validCauseData,
        createdBy: testUser._id
      });
      
      const populated = await Cause.findById(cause._id).populate('createdBy');
      expect(populated.createdBy.email).toBe(testUser.email);
    });
  });
});

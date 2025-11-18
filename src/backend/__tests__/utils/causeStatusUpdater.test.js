/**
 * Test Suite for Cause Status Updater Utility
 * Tests cron job scheduling and manual update functions
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Cause from '../../models/Cause.js';
import { 
  startCauseStatusUpdater, 
  updateExpiredCauses 
} from '../../utils/causeStatusUpdater.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Cause.deleteMany({});
});

describe('Cause Status Updater', () => {
  describe('updateExpiredCauses', () => {
    it('should update expired causes to completed', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Cause.create({
        name: 'Expired Cause',
        description: 'Test cause',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active',
        endDate: yesterday,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(1);

      const cause = await Cause.findOne({ name: 'Expired Cause' });
      expect(cause.status).toBe('completed');
    });

    it('should not update active causes with future end dates', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await Cause.create({
        name: 'Active Cause',
        description: 'Test cause',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active',
        endDate: tomorrow,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(0);

      const cause = await Cause.findOne({ name: 'Active Cause' });
      expect(cause.status).toBe('active');
    });

    it('should not update already completed causes', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Cause.create({
        name: 'Completed Cause',
        description: 'Test cause',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 1000,
        status: 'completed',
        endDate: yesterday,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(0);
    });

    it('should update multiple expired causes', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Cause.create({
        name: 'Expired Cause 1',
        description: 'Test cause 1',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active',
        endDate: yesterday,
        createdBy: new mongoose.Types.ObjectId()
      });

      await Cause.create({
        name: 'Expired Cause 2',
        description: 'Test cause 2',
        category: 'Health',
        targetAmount: 2000,
        currentAmount: 1000,
        status: 'active',
        endDate: yesterday,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(2);

      const causes = await Cause.find({ status: 'completed' });
      expect(causes.length).toBe(2);
    });

    it('should not update causes without end date', async () => {
      await Cause.create({
        name: 'No End Date Cause',
        description: 'Test cause',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active',
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(0);

      const cause = await Cause.findOne({ name: 'No End Date Cause' });
      expect(cause.status).toBe('active');
    });

    it('should not update archived causes', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Cause.create({
        name: 'Archived Cause',
        description: 'Test cause',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'archived',
        endDate: yesterday,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(0);

      const cause = await Cause.findOne({ name: 'Archived Cause' });
      expect(cause.status).toBe('archived');
    });

    it('should handle causes that expired exactly at midnight', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await Cause.create({
        name: 'Midnight Expired Cause',
        description: 'Test cause',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active',
        endDate: today,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(1);
    });

    it('should return correct result object', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Cause.create({
        name: 'Expired Cause',
        description: 'Test cause',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active',
        endDate: yesterday,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result).toHaveProperty('modifiedCount');
      expect(result).toHaveProperty('matchedCount');
      expect(result.modifiedCount).toBeGreaterThan(0);
    });

    it('should handle empty database', async () => {
      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(0);
      expect(result.matchedCount).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Cause.updateMany to throw error
      const originalUpdateMany = Cause.updateMany;
      Cause.updateMany = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(updateExpiredCauses()).rejects.toThrow('Database error');

      Cause.updateMany = originalUpdateMany;
    });

    it('should update causes with various expired dates', async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      await Cause.create({
        name: 'One Week Old',
        description: 'Test cause',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active',
        endDate: oneWeekAgo,
        createdBy: new mongoose.Types.ObjectId()
      });

      await Cause.create({
        name: 'One Month Old',
        description: 'Test cause',
        category: 'Health',
        targetAmount: 2000,
        currentAmount: 1000,
        status: 'active',
        endDate: oneMonthAgo,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(2);
    });

    it('should preserve other cause properties', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const causeData = {
        name: 'Expired Cause',
        description: 'Test description',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 750,
        status: 'active',
        endDate: yesterday,
        createdBy: new mongoose.Types.ObjectId(),
        images: ['image1.jpg']
      };

      await Cause.create(causeData);
      await updateExpiredCauses();

      const cause = await Cause.findOne({ name: 'Expired Cause' });
      expect(cause.name).toBe('Expired Cause');
      expect(cause.description).toBe('Test description');
      expect(cause.category).toBe('Education');
      expect(cause.targetAmount).toBe(1000);
      expect(cause.currentAmount).toBe(750);
      expect(cause.status).toBe('completed');
    });
  });

  describe('startCauseStatusUpdater', () => {
    it('should be a function', () => {
      expect(typeof startCauseStatusUpdater).toBe('function');
    });

    it('should not throw error when called', () => {
      expect(() => startCauseStatusUpdater()).not.toThrow();
    });

    // Note: Testing actual cron job execution is complex in unit tests
    // as it requires waiting for scheduled times. The function itself
    // is tested to ensure it doesn't throw errors when setting up the job.
  });

  describe('Edge Cases', () => {
    it('should handle causes with end date far in the past', async () => {
      const veryOld = new Date('2020-01-01');

      await Cause.create({
        name: 'Very Old Cause',
        description: 'Test cause',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active',
        endDate: veryOld,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(1);
    });

    it('should handle causes with end date at exact current time', async () => {
      const now = new Date();

      await Cause.create({
        name: 'Exact Time Cause',
        description: 'Test cause',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active',
        endDate: now,
        createdBy: new mongoose.Types.ObjectId()
      });

      // Wait a tiny bit to ensure the date is in the past
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(1);
    });

    it('should handle mixed active and inactive causes', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await Cause.create({
        name: 'Expired Active',
        description: 'Test',
        category: 'Education',
        targetAmount: 1000,
        status: 'active',
        endDate: yesterday,
        createdBy: new mongoose.Types.ObjectId()
      });

      await Cause.create({
        name: 'Future Active',
        description: 'Test',
        category: 'Health',
        targetAmount: 1000,
        status: 'active',
        endDate: tomorrow,
        createdBy: new mongoose.Types.ObjectId()
      });

      await Cause.create({
        name: 'Expired Completed',
        description: 'Test',
        category: 'Environment',
        targetAmount: 1000,
        status: 'completed',
        endDate: yesterday,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(1);

      const expiredActive = await Cause.findOne({ name: 'Expired Active' });
      expect(expiredActive.status).toBe('completed');

      const futureActive = await Cause.findOne({ name: 'Future Active' });
      expect(futureActive.status).toBe('active');

      const expiredCompleted = await Cause.findOne({ name: 'Expired Completed' });
      expect(expiredCompleted.status).toBe('completed');
    });

    it('should handle causes with different time zones', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999); // Last moment of yesterday

      await Cause.create({
        name: 'Timezone Cause',
        description: 'Test cause',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active',
        endDate: yesterday,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(1);
    });

    it('should handle causes with null endDate', async () => {
      await Cause.create({
        name: 'Null End Date',
        description: 'Test cause',
        category: 'Education',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active',
        endDate: null,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(0);
    });

    it('should handle large number of expired causes', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          Cause.create({
            name: `Expired Cause ${i}`,
            description: 'Test cause',
            category: 'Education',
            targetAmount: 1000,
            currentAmount: 500,
            status: 'active',
            endDate: yesterday,
            createdBy: new mongoose.Types.ObjectId()
          })
        );
      }

      await Promise.all(promises);

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(100);
    });
  });

  describe('Return Values', () => {
    it('should return 0 modifications when no expired causes exist', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await Cause.create({
        name: 'Future Cause',
        description: 'Test cause',
        category: 'Education',
        targetAmount: 1000,
        status: 'active',
        endDate: tomorrow,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(0);
      expect(result.matchedCount).toBe(0);
    });

    it('should return correct count for single update', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Cause.create({
        name: 'Single Expired',
        description: 'Test',
        category: 'Education',
        targetAmount: 1000,
        status: 'active',
        endDate: yesterday,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await updateExpiredCauses();

      expect(result.modifiedCount).toBe(1);
      expect(result.matchedCount).toBe(1);
    });
  });
});

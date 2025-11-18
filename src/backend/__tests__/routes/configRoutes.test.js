/**
 * Test Suite for Config Routes - IMPROVED
 * Tests platform configuration management with comprehensive branch coverage
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import configRoutes from '../../routes/configRoutes.js';
import PlatformConfig from '../../models/PlatformConfig.js';
import User from '../../models/User.js';

let mongoServer;
let app;
let adminUser;
let donorUser;
let adminToken;
let donorToken;

// Mock audit logger
const mockLogConfigUpdated = jest.fn();
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logConfigUpdated: mockLogConfigUpdated
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  app = express();
  app.use(express.json());
  app.use('/api/config', configRoutes);

  process.env.JWT_SECRET = 'test-secret-key';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  mockLogConfigUpdated.mockResolvedValue();

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
  await PlatformConfig.deleteMany({});
  await User.deleteMany({});
});

describe('Config Routes - Get Configuration', () => {
  describe('GET /api/config', () => {
    it('should return platform configuration', async () => {
      const response = await request(app).get('/api/config');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should handle database errors', async () => {
      jest.spyOn(PlatformConfig, 'getConfig').mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app).get('/api/config');

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Server error');
    });
  });

  describe('GET /api/config/currency-presets', () => {
    it('should return currency presets', async () => {
      const response = await request(app).get('/api/config/currency-presets');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(7);
    });

    it('should include standard currencies with details', async () => {
      const response = await request(app).get('/api/config/currency-presets');

      const currencyCodes = response.body.data.map(c => c.code);
      expect(currencyCodes).toContain('USD');
      expect(currencyCodes).toContain('EUR');
      expect(currencyCodes).toContain('INR');
      
      const usd = response.body.data.find(c => c.code === 'USD');
      expect(usd.symbol).toBe('$');
      expect(usd.name).toBe('US Dollar');
    });
  });
});

describe('Config Routes - Update Configuration', () => {
  describe('PUT /api/config - Minimum Donation Validation', () => {
    it('should update minimumDonation with amount', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { amount: 10, enabled: true }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.minimumDonation.amount).toBe(10);
    });

    it('should reject amount less than 0.01', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { amount: 0.001 }
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('at least 0.01');
    });

    it('should reject amount equal to 0', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { amount: 0 }
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('at least 0.01');
    });

    it('should reject negative amount', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { amount: -5 }
        });

      expect(response.status).toBe(400);
    });

    it('should reject non-boolean enabled', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { enabled: 'yes' }
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('boolean');
    });

    it('should accept enabled true', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { enabled: true }
        });

      expect(response.status).toBe(200);
    });

    it('should accept enabled false', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { enabled: false }
        });

      expect(response.status).toBe(200);
    });

    it('should accept amount without enabled', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { amount: 5 }
        });

      expect(response.status).toBe(200);
    });

    it('should accept decimal amount', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { amount: 2.50 }
        });

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/config - Currency Validation', () => {
    it('should update currency code', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { code: 'EUR' }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.currency.code).toBe('EUR');
    });

    it('should accept all valid currency codes', async () => {
      const validCodes = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'];
      
      for (const code of validCodes) {
        const response = await request(app)
          .put('/api/config')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            currency: { code }
          });

        expect(response.status).toBe(200);
      }
    });

    it('should reject invalid currency code', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { code: 'XYZ' }
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Currency code must be one of');
    });

    it('should reject invalid position', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { position: 'middle' }
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('before" or "after');
    });

    it('should accept position before', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { position: 'before' }
        });

      expect(response.status).toBe(200);
    });

    it('should accept position after', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { position: 'after' }
        });

      expect(response.status).toBe(200);
    });

    it('should reject negative decimal places', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { decimalPlaces: -1 }
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('between 0 and 4');
    });

    it('should reject decimal places greater than 4', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { decimalPlaces: 5 }
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('between 0 and 4');
    });

    it('should accept decimal places 0', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { decimalPlaces: 0 }
        });

      expect(response.status).toBe(200);
    });

    it('should accept decimal places 1', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { decimalPlaces: 1 }
        });

      expect(response.status).toBe(200);
    });

    it('should accept decimal places 2', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { decimalPlaces: 2 }
        });

      expect(response.status).toBe(200);
    });

    it('should accept decimal places 3', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { decimalPlaces: 3 }
        });

      expect(response.status).toBe(200);
    });

    it('should accept decimal places 4', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { decimalPlaces: 4 }
        });

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/config - Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/config')
        .send({
          minimumDonation: { amount: 5 }
        });

      expect(response.status).toBe(401);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          minimumDonation: { amount: 5 }
        });

      expect(response.status).toBe(403);
    });

    it('should allow admin to update', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { amount: 5 }
        });

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/config - Error Handling', () => {
    it('should handle database errors', async () => {
      jest.spyOn(PlatformConfig, 'updateConfig').mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { amount: 5 }
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Server error');
    });

    it('should handle audit logger errors gracefully', async () => {
      mockLogConfigUpdated.mockRejectedValueOnce(new Error('Logger error'));

      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { amount: 5 }
        });

      // Should still succeed even if logging fails
      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/config - Combined Updates', () => {
    it('should update both minimumDonation and currency', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { amount: 10, enabled: true },
          currency: { code: 'EUR', position: 'after', decimalPlaces: 2 }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.minimumDonation.amount).toBe(10);
      expect(response.body.data.currency.code).toBe('EUR');
    });

    it('should update only currency code provided', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { code: 'GBP' }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.currency.code).toBe('GBP');
    });

    it('should handle empty update object', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(200);
    });

    it('should handle update with only minimumDonation', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          minimumDonation: { amount: 7.5 }
        });

      expect(response.status).toBe(200);
    });

    it('should handle update with only currency', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currency: { code: 'CAD', decimalPlaces: 2 }
        });

      expect(response.status).toBe(200);
    });
  });
});

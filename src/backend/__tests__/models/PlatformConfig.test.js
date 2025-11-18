/**
 * Test Suite for PlatformConfig Model
 * Tests all model methods, validations, and static methods
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import PlatformConfig from '../../models/PlatformConfig.js';

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
  await PlatformConfig.deleteMany({});
});

describe('PlatformConfig Model', () => {
  describe('Schema Validation', () => {
    it('should create config with default values', async () => {
      const config = await PlatformConfig.create({
        configKey: 'platform_config'
      });

      expect(config.configKey).toBe('platform_config');
      expect(config.minimumDonation.amount).toBe(1);
      expect(config.minimumDonation.enabled).toBe(true);
      expect(config.currency.code).toBe('INR');
      expect(config.currency.symbol).toBe('$');
      expect(config.currency.position).toBe('before');
      expect(config.currency.decimalPlaces).toBe(2);
    });

    it('should create config with custom values', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      const config = await PlatformConfig.create({
        configKey: 'platform_config',
        minimumDonation: {
          amount: 10,
          enabled: false
        },
        currency: {
          code: 'EUR',
          symbol: '€',
          position: 'after',
          decimalPlaces: 2,
          thousandsSeparator: '.',
          decimalSeparator: ','
        },
        updatedBy: userId
      });

      expect(config.minimumDonation.amount).toBe(10);
      expect(config.minimumDonation.enabled).toBe(false);
      expect(config.currency.code).toBe('EUR');
      expect(config.currency.symbol).toBe('€');
      expect(config.currency.position).toBe('after');
      expect(config.currency.decimalPlaces).toBe(2);
      expect(config.updatedBy.toString()).toBe(userId.toString());
    });

    it('should enforce unique configKey', async () => {
      await PlatformConfig.create({ configKey: 'platform_config' });

      await expect(
        PlatformConfig.create({ configKey: 'platform_config' })
      ).rejects.toThrow();
    });

    it('should reject minimum donation amount below 0.01', async () => {
      await expect(
        PlatformConfig.create({
          configKey: 'test_config',
          minimumDonation: { amount: 0.005 }
        })
      ).rejects.toThrow();
    });

    it('should accept minimum donation amount of exactly 0.01', async () => {
      const config = await PlatformConfig.create({
        configKey: 'test_config',
        minimumDonation: { amount: 0.01 }
      });

      expect(config.minimumDonation.amount).toBe(0.01);
    });

    it('should reject invalid currency code', async () => {
      await expect(
        PlatformConfig.create({
          configKey: 'test_config',
          currency: { code: 'INVALID', symbol: '$' }
        })
      ).rejects.toThrow();
    });

    it('should accept all valid currency codes', async () => {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'];

      for (const code of validCurrencies) {
        const config = await PlatformConfig.create({
          configKey: `config_${code}`,
          currency: { code, symbol: '$' }
        });

        expect(config.currency.code).toBe(code);
        await PlatformConfig.deleteOne({ _id: config._id });
      }
    });

    it('should reject invalid currency position', async () => {
      await expect(
        PlatformConfig.create({
          configKey: 'test_config',
          currency: { code: 'USD', symbol: '$', position: 'middle' }
        })
      ).rejects.toThrow();
    });

    it('should accept currency position "before"', async () => {
      const config = await PlatformConfig.create({
        configKey: 'test_config',
        currency: { code: 'USD', symbol: '$', position: 'before' }
      });

      expect(config.currency.position).toBe('before');
    });

    it('should accept currency position "after"', async () => {
      const config = await PlatformConfig.create({
        configKey: 'test_config',
        currency: { code: 'EUR', symbol: '€', position: 'after' }
      });

      expect(config.currency.position).toBe('after');
    });

    it('should reject decimalPlaces below 0', async () => {
      await expect(
        PlatformConfig.create({
          configKey: 'test_config',
          currency: { code: 'USD', symbol: '$', decimalPlaces: -1 }
        })
      ).rejects.toThrow();
    });

    it('should reject decimalPlaces above 4', async () => {
      await expect(
        PlatformConfig.create({
          configKey: 'test_config',
          currency: { code: 'USD', symbol: '$', decimalPlaces: 5 }
        })
      ).rejects.toThrow();
    });

    it('should accept decimalPlaces from 0 to 4', async () => {
      for (let i = 0; i <= 4; i++) {
        const config = await PlatformConfig.create({
          configKey: `config_dp_${i}`,
          currency: { code: 'USD', symbol: '$', decimalPlaces: i }
        });

        expect(config.currency.decimalPlaces).toBe(i);
        await PlatformConfig.deleteOne({ _id: config._id });
      }
    });
  });

  describe('Static Method: getConfig', () => {
    it('should return existing config', async () => {
      const existingConfig = await PlatformConfig.create({
        configKey: 'platform_config',
        minimumDonation: { amount: 5 }
      });

      const config = await PlatformConfig.getConfig();

      expect(config._id.toString()).toBe(existingConfig._id.toString());
      expect(config.minimumDonation.amount).toBe(5);
    });

    it('should create default config if none exists', async () => {
      const config = await PlatformConfig.getConfig();

      expect(config).toBeDefined();
      expect(config.configKey).toBe('platform_config');
      expect(config.minimumDonation.amount).toBe(1);
      expect(config.minimumDonation.enabled).toBe(true);
      expect(config.currency.code).toBe('USD');
      expect(config.currency.symbol).toBe('$');
    });

    it('should not create duplicate configs', async () => {
      await PlatformConfig.getConfig();
      await PlatformConfig.getConfig();

      const count = await PlatformConfig.countDocuments({ configKey: 'platform_config' });
      expect(count).toBe(1);
    });

    it('should create config with all default currency settings', async () => {
      const config = await PlatformConfig.getConfig();

      expect(config.currency.position).toBe('before');
      expect(config.currency.decimalPlaces).toBe(2);
      expect(config.currency.thousandsSeparator).toBe(',');
      expect(config.currency.decimalSeparator).toBe('.');
    });
  });

  describe('Static Method: updateConfig', () => {
    it('should update minimum donation amount', async () => {
      await PlatformConfig.getConfig();
      const userId = new mongoose.Types.ObjectId();

      const updates = {
        minimumDonation: { amount: 20 }
      };

      const config = await PlatformConfig.updateConfig(updates, userId);

      expect(config.minimumDonation.amount).toBe(20);
      expect(config.minimumDonation.enabled).toBe(true); // should preserve existing
      expect(config.updatedBy.toString()).toBe(userId.toString());
    });

    it('should update minimum donation enabled status', async () => {
      await PlatformConfig.getConfig();
      const userId = new mongoose.Types.ObjectId();

      const updates = {
        minimumDonation: { enabled: false }
      };

      const config = await PlatformConfig.updateConfig(updates, userId);

      expect(config.minimumDonation.enabled).toBe(false);
      expect(config.updatedBy.toString()).toBe(userId.toString());
    });

    it('should update currency code', async () => {
      await PlatformConfig.getConfig();
      const userId = new mongoose.Types.ObjectId();

      const updates = {
        currency: { code: 'GBP' }
      };

      const config = await PlatformConfig.updateConfig(updates, userId);

      expect(config.currency.code).toBe('GBP');
      expect(config.updatedBy.toString()).toBe(userId.toString());
    });

    it('should update currency symbol', async () => {
      await PlatformConfig.getConfig();
      const userId = new mongoose.Types.ObjectId();

      const updates = {
        currency: { symbol: '£' }
      };

      const config = await PlatformConfig.updateConfig(updates, userId);

      expect(config.currency.symbol).toBe('£');
    });

    it('should update currency position', async () => {
      await PlatformConfig.getConfig();
      const userId = new mongoose.Types.ObjectId();

      const updates = {
        currency: { position: 'after' }
      };

      const config = await PlatformConfig.updateConfig(updates, userId);

      expect(config.currency.position).toBe('after');
    });

    it('should update multiple currency fields at once', async () => {
      await PlatformConfig.getConfig();
      const userId = new mongoose.Types.ObjectId();

      const updates = {
        currency: {
          code: 'EUR',
          symbol: '€',
          position: 'after',
          decimalPlaces: 2,
          thousandsSeparator: '.',
          decimalSeparator: ','
        }
      };

      const config = await PlatformConfig.updateConfig(updates, userId);

      expect(config.currency.code).toBe('EUR');
      expect(config.currency.symbol).toBe('€');
      expect(config.currency.position).toBe('after');
      expect(config.currency.decimalPlaces).toBe(2);
      expect(config.currency.thousandsSeparator).toBe('.');
      expect(config.currency.decimalSeparator).toBe(',');
    });

    it('should update both minimum donation and currency', async () => {
      await PlatformConfig.getConfig();
      const userId = new mongoose.Types.ObjectId();

      const updates = {
        minimumDonation: { amount: 15, enabled: false },
        currency: { code: 'CAD', symbol: 'C$' }
      };

      const config = await PlatformConfig.updateConfig(updates, userId);

      expect(config.minimumDonation.amount).toBe(15);
      expect(config.minimumDonation.enabled).toBe(false);
      expect(config.currency.code).toBe('CAD');
      expect(config.currency.symbol).toBe('C$');
    });

    it('should update updatedAt timestamp', async () => {
      await PlatformConfig.getConfig();
      const userId = new mongoose.Types.ObjectId();

      const beforeUpdate = new Date();
      await new Promise(resolve => setTimeout(resolve, 10));

      const updates = { minimumDonation: { amount: 25 } };
      const config = await PlatformConfig.updateConfig(updates, userId);

      expect(config.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('should preserve unmodified fields', async () => {
      const initialConfig = await PlatformConfig.getConfig();
      const userId = new mongoose.Types.ObjectId();

      const updates = {
        minimumDonation: { amount: 30 }
      };

      const config = await PlatformConfig.updateConfig(updates, userId);

      expect(config.currency.code).toBe(initialConfig.currency.code);
      expect(config.currency.symbol).toBe(initialConfig.currency.symbol);
      expect(config.currency.position).toBe(initialConfig.currency.position);
    });

    it('should create config if it does not exist before updating', async () => {
      const userId = new mongoose.Types.ObjectId();

      const updates = {
        minimumDonation: { amount: 50 }
      };

      const config = await PlatformConfig.updateConfig(updates, userId);

      expect(config.minimumDonation.amount).toBe(50);
      expect(config.configKey).toBe('platform_config');
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt', async () => {
      const config = await PlatformConfig.create({
        configKey: 'test_config'
      });

      expect(config.createdAt).toBeInstanceOf(Date);
    });

    it('should auto-generate updatedAt', async () => {
      const config = await PlatformConfig.create({
        configKey: 'test_config'
      });

      expect(config.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on save', async () => {
      const config = await PlatformConfig.create({
        configKey: 'test_config'
      });

      const originalUpdatedAt = config.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 10));

      config.minimumDonation.amount = 100;
      await config.save();

      expect(config.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large minimum donation amount', async () => {
      const config = await PlatformConfig.create({
        configKey: 'test_config',
        minimumDonation: { amount: 999999999 }
      });

      expect(config.minimumDonation.amount).toBe(999999999);
    });

    it('should handle decimal values for minimum donation', async () => {
      const config = await PlatformConfig.create({
        configKey: 'test_config',
        minimumDonation: { amount: 12.50 }
      });

      expect(config.minimumDonation.amount).toBe(12.50);
    });

    it('should handle special characters in currency symbol', async () => {
      const config = await PlatformConfig.create({
        configKey: 'test_config',
        currency: { code: 'USD', symbol: '₹' }
      });

      expect(config.currency.symbol).toBe('₹');
    });

    it('should handle empty thousandsSeparator', async () => {
      const config = await PlatformConfig.create({
        configKey: 'test_config',
        currency: { code: 'USD', symbol: '$', thousandsSeparator: '' }
      });

      expect(config.currency.thousandsSeparator).toBe('');
    });

    it('should handle different decimalSeparator', async () => {
      const config = await PlatformConfig.create({
        configKey: 'test_config',
        currency: { code: 'EUR', symbol: '€', decimalSeparator: ',' }
      });

      expect(config.currency.decimalSeparator).toBe(',');
    });

    it('should handle JPY with 0 decimal places', async () => {
      const config = await PlatformConfig.create({
        configKey: 'test_config',
        currency: { code: 'JPY', symbol: '¥', decimalPlaces: 0 }
      });

      expect(config.currency.code).toBe('JPY');
      expect(config.currency.decimalPlaces).toBe(0);
    });
  });

  describe('Required Fields', () => {
    it('should require configKey', async () => {
      await expect(
        PlatformConfig.create({
          minimumDonation: { amount: 1 }
        })
      ).rejects.toThrow();
    });

    it('should require currency code', async () => {
      await expect(
        PlatformConfig.create({
          configKey: 'test_config',
          currency: { symbol: '$' }
        })
      ).rejects.toThrow();
    });

    it('should require currency symbol', async () => {
      await expect(
        PlatformConfig.create({
          configKey: 'test_config',
          currency: { code: 'USD' }
        })
      ).rejects.toThrow();
    });

    it('should require minimum donation amount', async () => {
      await expect(
        PlatformConfig.create({
          configKey: 'test_config',
          minimumDonation: { enabled: true }
        })
      ).rejects.toThrow();
    });
  });
});

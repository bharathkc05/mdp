/**
 * Test Suite for AuditLog Model
 * Tests all model methods, validations, and static methods
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import AuditLog from '../../models/AuditLog.js';

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
  await AuditLog.deleteMany({});
});

describe('AuditLog Model', () => {
  describe('Schema Validation', () => {
    it('should create audit log with required fields', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'User logged in successfully'
      };

      const log = await AuditLog.create(logData);

      expect(log.eventType).toBe('USER_LOGIN_SUCCESS');
      expect(log.description).toBe('User logged in successfully');
      expect(log.severity).toBe('INFO'); // default value
      expect(log.metadata).toEqual({});
      expect(log.createdAt).toBeDefined();
      expect(log.updatedAt).toBeDefined();
    });

    it('should create audit log with all fields', async () => {
      const userId = new mongoose.Types.ObjectId();
      const resourceId = new mongoose.Types.ObjectId();
      
      const logData = {
        userId,
        userEmail: 'test@example.com',
        eventType: 'DONATION_CREATED',
        description: 'Donation created successfully',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        metadata: { amount: 100, causeId: '123' },
        severity: 'INFO',
        resourceType: 'DONATION',
        resourceId
      };

      const log = await AuditLog.create(logData);

      expect(log.userId.toString()).toBe(userId.toString());
      expect(log.userEmail).toBe('test@example.com');
      expect(log.eventType).toBe('DONATION_CREATED');
      expect(log.description).toBe('Donation created successfully');
      expect(log.ipAddress).toBe('127.0.0.1');
      expect(log.userAgent).toBe('Mozilla/5.0');
      expect(log.metadata.amount).toBe(100);
      expect(log.severity).toBe('INFO');
      expect(log.resourceType).toBe('DONATION');
      expect(log.resourceId.toString()).toBe(resourceId.toString());
    });

    it('should reject invalid eventType', async () => {
      const logData = {
        eventType: 'INVALID_EVENT',
        description: 'Test log'
      };

      await expect(AuditLog.create(logData)).rejects.toThrow();
    });

    it('should reject invalid severity', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test log',
        severity: 'INVALID'
      };

      await expect(AuditLog.create(logData)).rejects.toThrow();
    });

    it('should reject invalid resourceType', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test log',
        resourceType: 'INVALID'
      };

      await expect(AuditLog.create(logData)).rejects.toThrow();
    });

    it('should reject description exceeding maxlength', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'a'.repeat(501) // exceeds 500 character limit
      };

      await expect(AuditLog.create(logData)).rejects.toThrow();
    });

    it('should reject missing required eventType', async () => {
      const logData = {
        description: 'Test log'
      };

      await expect(AuditLog.create(logData)).rejects.toThrow();
    });

    it('should reject missing required description', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS'
      };

      await expect(AuditLog.create(logData)).rejects.toThrow();
    });

    it('should accept null userId', async () => {
      const logData = {
        eventType: 'SYSTEM_EVENT',
        description: 'System initiated event',
        userId: null
      };

      const log = await AuditLog.create(logData);
      expect(log.userId).toBeNull();
    });

    it('should accept null userEmail', async () => {
      const logData = {
        eventType: 'SYSTEM_EVENT',
        description: 'System initiated event',
        userEmail: null
      };

      const log = await AuditLog.create(logData);
      expect(log.userEmail).toBeNull();
    });
  });

  describe('Test All EventTypes', () => {
    const eventTypes = [
      'USER_REGISTRATION',
      'USER_LOGIN_SUCCESS',
      'USER_LOGIN_FAILED',
      'USER_LOGOUT',
      'USER_EMAIL_VERIFIED',
      'USER_PASSWORD_RESET',
      'DONATION_CREATED',
      'DONATION_FAILED',
      'CAUSE_CREATED',
      'CAUSE_UPDATED',
      'CAUSE_DELETED',
      'CAUSE_ARCHIVED',
      'USER_ROLE_CHANGED',
      'PLATFORM_CONFIG_UPDATED',
      'PLATFORM_CONFIG_VIEWED',
      'ADMIN_ACTION',
      'SYSTEM_EVENT'
    ];

    eventTypes.forEach(eventType => {
      it(`should accept eventType: ${eventType}`, async () => {
        const logData = {
          eventType,
          description: `Test ${eventType}`
        };

        const log = await AuditLog.create(logData);
        expect(log.eventType).toBe(eventType);
      });
    });
  });

  describe('Test All Severity Levels', () => {
    const severityLevels = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];

    severityLevels.forEach(severity => {
      it(`should accept severity: ${severity}`, async () => {
        const logData = {
          eventType: 'USER_LOGIN_SUCCESS',
          description: 'Test log',
          severity
        };

        const log = await AuditLog.create(logData);
        expect(log.severity).toBe(severity);
      });
    });
  });

  describe('Test All ResourceTypes', () => {
    const resourceTypes = ['USER', 'CAUSE', 'DONATION', 'CONFIG', 'SYSTEM'];

    resourceTypes.forEach(resourceType => {
      it(`should accept resourceType: ${resourceType}`, async () => {
        const logData = {
          eventType: 'ADMIN_ACTION',
          description: 'Test log',
          resourceType
        };

        const log = await AuditLog.create(logData);
        expect(log.resourceType).toBe(resourceType);
      });
    });
  });

  describe('Static Method: createLog', () => {
    it('should create log successfully', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'User logged in',
        userEmail: 'test@example.com'
      };

      const log = await AuditLog.createLog(logData);

      expect(log).toBeDefined();
      expect(log.eventType).toBe('USER_LOGIN_SUCCESS');
      expect(log.description).toBe('User logged in');
      expect(log.userEmail).toBe('test@example.com');
    });

    it('should handle errors gracefully and return null', async () => {
      const logData = {
        eventType: 'INVALID_EVENT', // invalid enum value
        description: 'Test'
      };

      const log = await AuditLog.createLog(logData);
      expect(log).toBeNull();
    });

    it('should not throw error on invalid data', async () => {
      const logData = {
        description: 'Missing eventType'
      };

      await expect(AuditLog.createLog(logData)).resolves.toBeNull();
    });
  });

  describe('Instance Method: sanitize', () => {
    it('should remove __v field', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test log',
        metadata: { testData: 'value' }
      };

      const log = await AuditLog.create(logData);
      const sanitized = log.sanitize();

      expect(sanitized.__v).toBeUndefined();
      expect(sanitized.eventType).toBe('USER_LOGIN_SUCCESS');
    });

    it('should remove sensitive password from metadata', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test log',
        metadata: { 
          username: 'testuser',
          password: 'secret123'
        }
      };

      const log = await AuditLog.create(logData);
      const sanitized = log.sanitize();

      expect(sanitized.metadata.password).toBeUndefined();
      expect(sanitized.metadata.username).toBe('testuser');
    });

    it('should remove sensitive token from metadata', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test log',
        metadata: { 
          userId: '123',
          token: 'secrettoken'
        }
      };

      const log = await AuditLog.create(logData);
      const sanitized = log.sanitize();

      expect(sanitized.metadata.token).toBeUndefined();
      expect(sanitized.metadata.userId).toBe('123');
    });

    it('should remove sensitive secret from metadata', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test log',
        metadata: { 
          data: 'value',
          secret: 'supersecret'
        }
      };

      const log = await AuditLog.create(logData);
      const sanitized = log.sanitize();

      expect(sanitized.metadata.secret).toBeUndefined();
      expect(sanitized.metadata.data).toBe('value');
    });

    it('should handle empty metadata', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test log',
        metadata: {}
      };

      const log = await AuditLog.create(logData);
      const sanitized = log.sanitize();

      expect(sanitized.metadata).toEqual({});
    });

    it('should handle undefined metadata', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test log'
      };

      const log = await AuditLog.create(logData);
      const sanitized = log.sanitize();

      expect(sanitized.metadata).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should create logs and query efficiently', async () => {
      const userId = new mongoose.Types.ObjectId();

      // Create multiple logs
      await AuditLog.create({
        userId,
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Login 1'
      });

      await AuditLog.create({
        userId,
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Login 2'
      });

      await AuditLog.create({
        eventType: 'SYSTEM_EVENT',
        description: 'System event'
      });

      // Query by userId (should use index)
      const userLogs = await AuditLog.find({ userId }).sort({ createdAt: -1 });
      expect(userLogs.length).toBe(2);

      // Query by eventType (should use index)
      const loginLogs = await AuditLog.find({ eventType: 'USER_LOGIN_SUCCESS' });
      expect(loginLogs.length).toBe(2);

      // Query by severity (should use index)
      const infoLogs = await AuditLog.find({ severity: 'INFO' });
      expect(infoLogs.length).toBe(3);
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt timestamp', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test log'
      };

      const log = await AuditLog.create(logData);

      expect(log.createdAt).toBeInstanceOf(Date);
      expect(log.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should auto-generate updatedAt timestamp', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test log'
      };

      const log = await AuditLog.create(logData);

      expect(log.updatedAt).toBeInstanceOf(Date);
      expect(log.updatedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should update updatedAt on modification', async () => {
      const log = await AuditLog.create({
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test log'
      });

      const originalUpdatedAt = log.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      log.description = 'Modified description';
      await log.save();

      expect(log.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Complex Metadata', () => {
    it('should store nested metadata objects', async () => {
      const logData = {
        eventType: 'DONATION_CREATED',
        description: 'Donation made',
        metadata: {
          donation: {
            amount: 100,
            currency: 'USD',
            causeName: 'Test Cause'
          },
          payment: {
            method: 'card',
            last4: '4242'
          }
        }
      };

      const log = await AuditLog.create(logData);

      expect(log.metadata.donation.amount).toBe(100);
      expect(log.metadata.payment.method).toBe('card');
    });

    it('should store array in metadata', async () => {
      const logData = {
        eventType: 'ADMIN_ACTION',
        description: 'Bulk update',
        metadata: {
          updatedIds: ['id1', 'id2', 'id3']
        }
      };

      const log = await AuditLog.create(logData);

      expect(Array.isArray(log.metadata.updatedIds)).toBe(true);
      expect(log.metadata.updatedIds.length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum description length', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'a'.repeat(500) // exactly 500 characters
      };

      const log = await AuditLog.create(logData);
      expect(log.description.length).toBe(500);
    });

    it('should handle special characters in description', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Special chars: !@#$%^&*()_+-={}[]|\\:";\'<>?,./'
      };

      const log = await AuditLog.create(logData);
      expect(log.description).toContain('!@#$%^&*()');
    });

    it('should handle unicode characters in description', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Unicode: 你好世界 🌍 émoji'
      };

      const log = await AuditLog.create(logData);
      expect(log.description).toContain('你好世界');
      expect(log.description).toContain('🌍');
    });

    it('should handle very long IP address', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test log',
        ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
      };

      const log = await AuditLog.create(logData);
      expect(log.ipAddress).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    it('should handle long user agent strings', async () => {
      const logData = {
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test log',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      };

      const log = await AuditLog.create(logData);
      expect(log.userAgent).toContain('Mozilla/5.0');
    });
  });

  describe('Collection Name', () => {
    it('should use correct collection name', () => {
      expect(AuditLog.collection.name).toBe('auditlogs');
    });
  });
});

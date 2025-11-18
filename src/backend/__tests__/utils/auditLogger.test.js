/**
 * Test Suite for Audit Logger Utility
 * Tests all audit logging functions
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import AuditLog from '../../models/AuditLog.js';
import {
  createAuditLog,
  logUserRegistration,
  logLoginSuccess,
  logLoginFailed,
  logUserLogout,
  logEmailVerified,
  logPasswordReset,
  logDonationCreated,
  logDonationFailed,
  logCauseCreated,
  logCauseUpdated,
  logCauseDeleted,
  logCauseArchived,
  logUserRoleChanged,
  logAdminAction,
  logConfigUpdated
} from '../../utils/auditLogger.js';

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

describe('Audit Logger Utility', () => {
  describe('createAuditLog', () => {
    it('should create basic audit log', async () => {
      await createAuditLog({
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'User logged in'
      });

      const logs = await AuditLog.find({});
      expect(logs.length).toBe(1);
      expect(logs[0].eventType).toBe('USER_LOGIN_SUCCESS');
      expect(logs[0].description).toBe('User logged in');
    });

    it('should extract IP address from request', async () => {
      const req = {
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' }
      };

      await createAuditLog({
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test',
        req
      });

      const log = await AuditLog.findOne({});
      expect(log.ipAddress).toBe('192.168.1.1');
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const req = {
        ip: undefined,
        headers: { 
          'x-forwarded-for': '203.0.113.1',
          'user-agent': 'Mozilla/5.0'
        }
      };

      await createAuditLog({
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test',
        req
      });

      const log = await AuditLog.findOne({});
      expect(log.ipAddress).toBe('203.0.113.1');
    });

    it('should extract IP from connection.remoteAddress', async () => {
      const req = {
        ip: undefined,
        headers: { 'user-agent': 'Mozilla/5.0' },
        connection: { remoteAddress: '10.0.0.1' }
      };

      await createAuditLog({
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test',
        req
      });

      const log = await AuditLog.findOne({});
      expect(log.ipAddress).toBe('10.0.0.1');
    });

    it('should extract IP from socket.remoteAddress', async () => {
      const req = {
        ip: undefined,
        headers: { 'user-agent': 'Mozilla/5.0' },
        socket: { remoteAddress: '172.16.0.1' }
      };

      await createAuditLog({
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test',
        req
      });

      const log = await AuditLog.findOne({});
      expect(log.ipAddress).toBe('172.16.0.1');
    });

    it('should extract user-agent from request', async () => {
      const req = {
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      };

      await createAuditLog({
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test',
        req
      });

      const log = await AuditLog.findOne({});
      expect(log.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    it('should sanitize password from metadata', async () => {
      await createAuditLog({
        eventType: 'USER_REGISTRATION',
        description: 'Test',
        metadata: { email: 'test@example.com', password: 'secret123' }
      });

      const log = await AuditLog.findOne({});
      expect(log.metadata.password).toBeUndefined();
      expect(log.metadata.email).toBe('test@example.com');
    });

    it('should sanitize token from metadata', async () => {
      await createAuditLog({
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test',
        metadata: { userId: '123', token: 'secret-token' }
      });

      const log = await AuditLog.findOne({});
      expect(log.metadata.token).toBeUndefined();
      expect(log.metadata.userId).toBe('123');
    });

    it('should sanitize secret from metadata', async () => {
      await createAuditLog({
        eventType: 'ADMIN_ACTION',
        description: 'Test',
        metadata: { action: 'update', secret: 'secret-key' }
      });

      const log = await AuditLog.findOne({});
      expect(log.metadata.secret).toBeUndefined();
    });

    it('should sanitize twoFactorSecret from metadata', async () => {
      await createAuditLog({
        eventType: 'ADMIN_ACTION',
        description: 'Test',
        metadata: { userId: '123', twoFactorSecret: 'secret' }
      });

      const log = await AuditLog.findOne({});
      expect(log.metadata.twoFactorSecret).toBeUndefined();
    });

    it('should sanitize accessToken and refreshToken from metadata', async () => {
      await createAuditLog({
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test',
        metadata: { 
          userId: '123', 
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        }
      });

      const log = await AuditLog.findOne({});
      expect(log.metadata.accessToken).toBeUndefined();
      expect(log.metadata.refreshToken).toBeUndefined();
    });

    it('should extract userId from request user', async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId(), email: 'test@example.com' },
        headers: {}
      };

      await createAuditLog({
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test',
        req
      });

      const log = await AuditLog.findOne({});
      expect(log.userId).toBeDefined();
      expect(log.userEmail).toBe('test@example.com');
    });

    it('should extract userId using id property', async () => {
      const req = {
        user: { id: 'user123', email: 'test@example.com' },
        headers: {}
      };

      await createAuditLog({
        eventType: 'USER_LOGIN_SUCCESS',
        description: 'Test',
        req
      });

      const log = await AuditLog.findOne({});
      expect(log.userId).toBe('user123');
    });

    it('should handle errors gracefully', async () => {
      // Mock AuditLog.createLog to throw error
      const originalCreateLog = AuditLog.createLog;
      AuditLog.createLog = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        createAuditLog({
          eventType: 'INVALID_EVENT',
          description: 'Test'
        })
      ).resolves.not.toThrow();

      AuditLog.createLog = originalCreateLog;
    });

    it('should set severity level', async () => {
      await createAuditLog({
        eventType: 'USER_LOGIN_FAILED',
        description: 'Test',
        severity: 'WARNING'
      });

      const log = await AuditLog.findOne({});
      expect(log.severity).toBe('WARNING');
    });

    it('should set resource type and ID', async () => {
      const resourceId = new mongoose.Types.ObjectId();

      await createAuditLog({
        eventType: 'CAUSE_CREATED',
        description: 'Test',
        resourceType: 'CAUSE',
        resourceId
      });

      const log = await AuditLog.findOne({});
      expect(log.resourceType).toBe('CAUSE');
      expect(log.resourceId.toString()).toBe(resourceId.toString());
    });
  });

  describe('logUserRegistration', () => {
    it('should log user registration', async () => {
      const req = { headers: {}, ip: '127.0.0.1' };
      const user = { _id: new mongoose.Types.ObjectId(), email: 'newuser@example.com' };

      await logUserRegistration(req, user);

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('USER_REGISTRATION');
      expect(log.userEmail).toBe('newuser@example.com');
      expect(log.severity).toBe('INFO');
      expect(log.resourceType).toBe('USER');
    });

    it('should handle user with id property', async () => {
      const req = { headers: {} };
      const user = { id: 'user123', email: 'newuser@example.com' };

      await logUserRegistration(req, user);

      const log = await AuditLog.findOne({});
      expect(log.userId).toBe('user123');
    });

    it('should handle user with userEmail property', async () => {
      const req = { headers: {} };
      const user = { id: 'user123', userEmail: 'newuser@example.com' };

      await logUserRegistration(req, user);

      const log = await AuditLog.findOne({});
      expect(log.userEmail).toBe('newuser@example.com');
    });
  });

  describe('logLoginSuccess', () => {
    it('should log successful login', async () => {
      const req = { headers: {}, ip: '127.0.0.1' };
      const user = { _id: new mongoose.Types.ObjectId(), email: 'user@example.com' };

      await logLoginSuccess(req, user);

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('USER_LOGIN_SUCCESS');
      expect(log.userEmail).toBe('user@example.com');
      expect(log.severity).toBe('INFO');
    });
  });

  describe('logLoginFailed', () => {
    it('should log failed login', async () => {
      const req = { headers: {}, ip: '127.0.0.1' };

      await logLoginFailed(req, 'user@example.com', 'Invalid password');

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('USER_LOGIN_FAILED');
      expect(log.userEmail).toBe('user@example.com');
      expect(log.severity).toBe('WARNING');
      expect(log.metadata.reason).toBe('Invalid password');
    });
  });

  describe('logUserLogout', () => {
    it('should log user logout', async () => {
      const req = { headers: {} };
      const user = { _id: new mongoose.Types.ObjectId(), email: 'user@example.com' };

      await logUserLogout(req, user);

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('USER_LOGOUT');
      expect(log.userEmail).toBe('user@example.com');
      expect(log.severity).toBe('INFO');
    });
  });

  describe('logEmailVerified', () => {
    it('should log email verification', async () => {
      const req = { headers: {} };
      const user = { _id: new mongoose.Types.ObjectId(), email: 'user@example.com' };

      await logEmailVerified(req, user);

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('USER_EMAIL_VERIFIED');
      expect(log.userEmail).toBe('user@example.com');
      expect(log.severity).toBe('INFO');
    });
  });

  describe('logPasswordReset', () => {
    it('should log password reset', async () => {
      const req = { headers: {} };
      const user = { _id: new mongoose.Types.ObjectId(), email: 'user@example.com' };

      await logPasswordReset(req, user);

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('USER_PASSWORD_RESET');
      expect(log.userEmail).toBe('user@example.com');
      expect(log.severity).toBe('WARNING');
    });
  });

  describe('logDonationCreated', () => {
    it('should log donation creation', async () => {
      const req = { 
        headers: {},
        user: { _id: new mongoose.Types.ObjectId(), email: 'donor@example.com' }
      };
      const donationData = {
        amount: 100,
        causeId: 'cause123',
        causeName: 'Test Cause',
        donationId: new mongoose.Types.ObjectId()
      };

      await logDonationCreated(req, donationData);

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('DONATION_CREATED');
      expect(log.severity).toBe('INFO');
      expect(log.metadata.amount).toBe(100);
      expect(log.metadata.causeName).toBe('Test Cause');
      expect(log.resourceType).toBe('DONATION');
    });

    it('should handle missing causeName', async () => {
      const req = { 
        headers: {},
        user: { _id: new mongoose.Types.ObjectId(), email: 'donor@example.com' }
      };
      const donationData = {
        amount: 50,
        causeId: 'cause123',
        donationId: new mongoose.Types.ObjectId()
      };

      await logDonationCreated(req, donationData);

      const log = await AuditLog.findOne({});
      expect(log.description).toContain('cause');
    });
  });

  describe('logDonationFailed', () => {
    it('should log failed donation', async () => {
      const req = { 
        headers: {},
        user: { _id: new mongoose.Types.ObjectId(), email: 'donor@example.com' }
      };
      const donationData = {
        amount: 100,
        causeName: 'Test Cause',
        reason: 'Insufficient funds'
      };

      await logDonationFailed(req, donationData);

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('DONATION_FAILED');
      expect(log.severity).toBe('ERROR');
      expect(log.metadata.reason).toBe('Insufficient funds');
    });

    it('should handle missing reason', async () => {
      const req = { 
        headers: {},
        user: { _id: new mongoose.Types.ObjectId(), email: 'donor@example.com' }
      };
      const donationData = { amount: 100 };

      await logDonationFailed(req, donationData);

      const log = await AuditLog.findOne({});
      expect(log.description).toContain('Unknown error');
    });
  });

  describe('logCauseCreated', () => {
    it('should log cause creation', async () => {
      const req = { headers: {} };
      const cause = {
        _id: new mongoose.Types.ObjectId(),
        name: 'New Cause',
        targetAmount: 1000,
        category: 'Education'
      };

      await logCauseCreated(req, cause);

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('CAUSE_CREATED');
      expect(log.metadata.causeName).toBe('New Cause');
      expect(log.metadata.targetAmount).toBe(1000);
      expect(log.resourceType).toBe('CAUSE');
    });
  });

  describe('logCauseUpdated', () => {
    it('should log cause update', async () => {
      const req = { headers: {} };
      const cause = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Updated Cause'
      };
      const changes = { status: 'active' };

      await logCauseUpdated(req, cause, changes);

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('CAUSE_UPDATED');
      expect(log.metadata.changes).toEqual({ status: 'active' });
    });
  });

  describe('logCauseDeleted', () => {
    it('should log cause deletion', async () => {
      const req = { headers: {} };
      const cause = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Deleted Cause'
      };

      await logCauseDeleted(req, cause);

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('CAUSE_DELETED');
      expect(log.severity).toBe('WARNING');
    });
  });

  describe('logCauseArchived', () => {
    it('should log cause archival', async () => {
      const req = { headers: {} };
      const cause = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Archived Cause',
        status: 'archived'
      };

      await logCauseArchived(req, cause);

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('CAUSE_ARCHIVED');
      expect(log.metadata.status).toBe('archived');
    });
  });

  describe('logUserRoleChanged', () => {
    it('should log role change', async () => {
      const req = { headers: {} };
      const user = {
        _id: new mongoose.Types.ObjectId(),
        email: 'user@example.com'
      };

      await logUserRoleChanged(req, user, 'user', 'admin');

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('USER_ROLE_CHANGED');
      expect(log.severity).toBe('WARNING');
      expect(log.metadata.oldRole).toBe('user');
      expect(log.metadata.newRole).toBe('admin');
    });
  });

  describe('logAdminAction', () => {
    it('should log admin action', async () => {
      const req = { headers: {} };

      await logAdminAction(req, 'delete_user', { targetUserId: '123' });

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('ADMIN_ACTION');
      expect(log.metadata.action).toBe('delete_user');
      expect(log.metadata.details.targetUserId).toBe('123');
    });
  });

  describe('logConfigUpdated', () => {
    it('should log config update', async () => {
      const userId = new mongoose.Types.ObjectId();
      const updates = { minimumDonation: 10 };

      await logConfigUpdated(userId, updates);

      const log = await AuditLog.findOne({});
      expect(log.eventType).toBe('PLATFORM_CONFIG_UPDATED');
      expect(log.resourceType).toBe('CONFIG');
      expect(log.metadata.updates).toEqual({ minimumDonation: 10 });
    });
  });
});

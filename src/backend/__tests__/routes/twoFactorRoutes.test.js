/**
 * Test Suite for Two-Factor Authentication Routes
 * Tests 2FA setup, verification, and management
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import twoFactorRoutes from '../../routes/twoFactorRoutes.js';
import User from '../../models/User.js';

let mongoServer;
let app;
let adminUser;
let donorUser;
let adminToken;
let donorToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  app = express();
  app.use(express.json());
  app.use('/api/2fa', twoFactorRoutes);

  process.env.JWT_SECRET = 'test-secret-key';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
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
  await User.deleteMany({});
});

describe('Two-Factor Routes - Setup', () => {
  describe('POST /api/2fa/setup', () => {
    it('should generate 2FA secret and QR code', async () => {
      const response = await request(app)
        .post('/api/2fa/setup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.qrCode).toBeDefined();
      expect(response.body.data.secret).toBeDefined();
      expect(response.body.data.otpauthUrl).toBeDefined();

      // Verify secret was stored in database
      const updatedUser = await User.findById(adminUser._id);
      expect(updatedUser.twoFactorSecret).toBeDefined();
    });

    it('should return 400 if 2FA already enabled', async () => {
      adminUser.twoFactorEnabled = true;
      adminUser.twoFactorSecret = 'existing-secret';
      await adminUser.save();

      const response = await request(app)
        .post('/api/2fa/setup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already enabled');
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .post('/api/2fa/setup')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).post('/api/2fa/setup');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/2fa/verify-setup', () => {
    it('should verify TOTP code and enable 2FA', async () => {
      // Generate a secret and save to user
      const secret = speakeasy.generateSecret({ length: 32 });
      adminUser.twoFactorSecret = secret.base32;
      await adminUser.save();

      // Generate valid TOTP token
      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/api/2fa/verify-setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.backupCodes).toBeDefined();
      expect(response.body.data.backupCodes).toHaveLength(10);

      // Verify 2FA was enabled
      const updatedUser = await User.findById(adminUser._id);
      expect(updatedUser.twoFactorEnabled).toBe(true);
      expect(updatedUser.backupCodes).toHaveLength(10);
    });

    it('should return 400 if token is missing', async () => {
      const response = await request(app)
        .post('/api/2fa/verify-setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Verification code is required');
    });

    it('should return 400 if no secret generated yet', async () => {
      const response = await request(app)
        .post('/api/2fa/verify-setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('generate a 2FA secret first');
    });

    it('should return 400 if token is invalid', async () => {
      const secret = speakeasy.generateSecret({ length: 32 });
      adminUser.twoFactorSecret = secret.base32;
      await adminUser.save();

      const response = await request(app)
        .post('/api/2fa/verify-setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token: '000000' }); // Invalid token

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid verification code');
    });

    it('should generate 10 unique backup codes', async () => {
      const secret = speakeasy.generateSecret({ length: 32 });
      adminUser.twoFactorSecret = secret.base32;
      await adminUser.save();

      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/api/2fa/verify-setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token });

      expect(response.status).toBe(200);
      const backupCodes = response.body.data.backupCodes;
      const uniqueCodes = new Set(backupCodes);
      expect(uniqueCodes.size).toBe(10);
    });
  });
});

describe('Two-Factor Routes - Disable', () => {
  describe('POST /api/2fa/disable', () => {
    it('should disable 2FA with valid password', async () => {
      adminUser.twoFactorEnabled = true;
      adminUser.twoFactorSecret = 'test-secret';
      adminUser.backupCodes = [{ code: 'TESTCODE', used: false }];
      await adminUser.save();

      const response = await request(app)
        .post('/api/2fa/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('disabled');

      // Verify 2FA was disabled
      const updatedUser = await User.findById(adminUser._id);
      expect(updatedUser.twoFactorEnabled).toBe(false);
      expect(updatedUser.twoFactorSecret).toBeUndefined();
      expect(updatedUser.backupCodes).toHaveLength(0);
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/2fa/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Password is required');
    });

    it('should return 401 if password is invalid', async () => {
      adminUser.twoFactorEnabled = true;
      await adminUser.save();

      const response = await request(app)
        .post('/api/2fa/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid password');
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .post('/api/2fa/disable')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ password: 'password123' });

      expect(response.status).toBe(403);
    });
  });
});

describe('Two-Factor Routes - Status', () => {
  describe('GET /api/2fa/status', () => {
    it('should return 2FA status as enabled', async () => {
      adminUser.twoFactorEnabled = true;
      await adminUser.save();

      const response = await request(app)
        .get('/api/2fa/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.twoFactorEnabled).toBe(true);
    });

    it('should return 2FA status as disabled', async () => {
      const response = await request(app)
        .get('/api/2fa/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.twoFactorEnabled).toBe(false);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/2fa/status')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/2fa/status');
      expect(response.status).toBe(401);
    });
  });
});

describe('Two-Factor Routes - Backup Code Verification', () => {
  it('should verify valid unused backup code', async () => {
    const { verifyBackupCode } = await import('../../routes/twoFactorRoutes.js');

    adminUser.twoFactorEnabled = true;
    adminUser.backupCodes = [
      { code: 'VALIDCODE1', used: false },
      { code: 'VALIDCODE2', used: false }
    ];
    await adminUser.save();

    const result = await verifyBackupCode(adminUser._id, 'validcode1');
    expect(result).toBe(true);

    // Verify backup code was marked as used
    const updatedUser = await User.findById(adminUser._id);
    const usedCode = updatedUser.backupCodes.find(bc => bc.code === 'VALIDCODE1');
    expect(usedCode.used).toBe(true);
  });

  it('should reject invalid backup code', async () => {
    const { verifyBackupCode } = await import('../../routes/twoFactorRoutes.js');

    adminUser.twoFactorEnabled = true;
    adminUser.backupCodes = [
      { code: 'VALIDCODE', used: false }
    ];
    await adminUser.save();

    const result = await verifyBackupCode(adminUser._id, 'INVALIDCODE');
    expect(result).toBe(false);
  });

  it('should reject already used backup code', async () => {
    const { verifyBackupCode } = await import('../../routes/twoFactorRoutes.js');

    adminUser.twoFactorEnabled = true;
    adminUser.backupCodes = [
      { code: 'USEDCODE', used: true }
    ];
    await adminUser.save();

    const result = await verifyBackupCode(adminUser._id, 'USEDCODE');
    expect(result).toBe(false);
  });

  it('should return false if user not found', async () => {
    const { verifyBackupCode } = await import('../../routes/twoFactorRoutes.js');

    const fakeId = new mongoose.Types.ObjectId();
    const result = await verifyBackupCode(fakeId, 'ANYCODE');
    expect(result).toBe(false);
  });

  it('should return false if 2FA not enabled', async () => {
    const { verifyBackupCode } = await import('../../routes/twoFactorRoutes.js');

    adminUser.twoFactorEnabled = false;
    await adminUser.save();

    const result = await verifyBackupCode(adminUser._id, 'ANYCODE');
    expect(result).toBe(false);
  });

  it('should be case insensitive', async () => {
    const { verifyBackupCode } = await import('../../routes/twoFactorRoutes.js');

    adminUser.twoFactorEnabled = true;
    adminUser.backupCodes = [
      { code: 'TESTCODE', used: false }
    ];
    await adminUser.save();

    const result = await verifyBackupCode(adminUser._id, 'testcode');
    expect(result).toBe(true);
  });
});

describe('Two-Factor Routes - Integration Scenarios', () => {
  it('should complete full 2FA setup workflow', async () => {
    // Step 1: Setup (generate secret)
    const setupResponse = await request(app)
      .post('/api/2fa/setup')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(setupResponse.status).toBe(200);
    const secret = setupResponse.body.data.secret;

    // Step 2: Verify setup with valid token
    const token = speakeasy.totp({
      secret: secret,
      encoding: 'base32'
    });

    const verifyResponse = await request(app)
      .post('/api/2fa/verify-setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ token });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.data.backupCodes).toHaveLength(10);

    // Step 3: Check status
    const statusResponse = await request(app)
      .get('/api/2fa/status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.data.twoFactorEnabled).toBe(true);

    // Step 4: Disable 2FA
    const disableResponse = await request(app)
      .post('/api/2fa/disable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'password123' });

    expect(disableResponse.status).toBe(200);

    // Step 5: Verify disabled
    const finalStatusResponse = await request(app)
      .get('/api/2fa/status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(finalStatusResponse.status).toBe(200);
    expect(finalStatusResponse.body.data.twoFactorEnabled).toBe(false);
  });

  it('should handle multiple failed verification attempts', async () => {
    const secret = speakeasy.generateSecret({ length: 32 });
    adminUser.twoFactorSecret = secret.base32;
    await adminUser.save();

    // Attempt 1
    let response = await request(app)
      .post('/api/2fa/verify-setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ token: '000000' });
    expect(response.status).toBe(400);

    // Attempt 2
    response = await request(app)
      .post('/api/2fa/verify-setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ token: '111111' });
    expect(response.status).toBe(400);

    // Attempt 3 with valid token should still work
    const validToken = speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32'
    });

    response = await request(app)
      .post('/api/2fa/verify-setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ token: validToken });
    expect(response.status).toBe(200);
  });

  it('should not allow re-enabling without disabling first', async () => {
    adminUser.twoFactorEnabled = true;
    adminUser.twoFactorSecret = 'existing-secret';
    await adminUser.save();

    const response = await request(app)
      .post('/api/2fa/setup')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('already enabled');
  });
});

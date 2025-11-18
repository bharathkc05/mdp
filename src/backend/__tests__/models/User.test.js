import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../../models/User.js';

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
  await User.deleteMany({});
});

describe('User Model', () => {
  const validUserData = {
    firstName: 'John',
    lastName: 'Doe',
    age: 25,
    gender: 'male',
    email: 'john@example.com',
    password: 'Password123!',
    role: 'donor'
  };

  describe('User Creation', () => {
    it('should create a new user successfully', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      expect(savedUser._id).toBeDefined();
      expect(savedUser.firstName).toBe(validUserData.firstName);
      expect(savedUser.email).toBe(validUserData.email);
      expect(savedUser.password).not.toBe(validUserData.password); // Should be hashed
      expect(savedUser.verified).toBe(false);
      expect(savedUser.twoFactorEnabled).toBe(false);
    });

    it('should reject user without required fields', async () => {
      const user = new User({ email: 'test@test.com' });
      await expect(user.save()).rejects.toThrow();
    });

    it('should reject duplicate email', async () => {
      const user1 = new User(validUserData);
      await user1.save();
      
      const user2 = new User(validUserData);
      await expect(user2.save()).rejects.toThrow(/duplicate key/);
    });

    it('should set default role as donor', async () => {
      const userData = { ...validUserData };
      delete userData.role;
      const user = new User(userData);
      const savedUser = await user.save();
      
      expect(savedUser.role).toBe('donor');
    });

    it('should accept valid gender values', async () => {
      const genders = ['male', 'female', 'other'];
      
      for (const gender of genders) {
        const user = new User({ ...validUserData, email: `test${gender}@test.com`, gender });
        const saved = await user.save();
        expect(saved.gender).toBe(gender);
      }
    });

    it('should reject invalid role', async () => {
      const user = new User({ ...validUserData, role: 'superuser' });
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      expect(savedUser.password).not.toBe(validUserData.password);
      expect(savedUser.password).toMatch(/^\$2[aby]\$\d{1,2}\$/); // bcrypt hash format
    });

    it('should not rehash password if not modified', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      const originalHash = savedUser.password;
      
      savedUser.firstName = 'Jane';
      await savedUser.save();
      
      expect(savedUser.password).toBe(originalHash);
    });

    it('should rehash password when modified', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      const originalHash = savedUser.password;
      
      savedUser.password = 'NewPassword123!';
      await savedUser.save();
      
      expect(savedUser.password).not.toBe(originalHash);
    });
  });

  describe('Password Comparison', () => {
    it('should correctly compare valid password', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      const isMatch = await savedUser.comparePassword(validUserData.password);
      expect(isMatch).toBe(true);
    });

    it('should reject invalid password', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      const isMatch = await savedUser.comparePassword('WrongPassword');
      expect(isMatch).toBe(false);
    });

    it('should handle empty password comparison', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      const isMatch = await savedUser.comparePassword('');
      expect(isMatch).toBe(false);
    });
  });

  describe('Donations', () => {
    it('should add donation to user', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      savedUser.donations.push({
        amount: 100,
        cause: 'Education',
        paymentId: 'pay_123',
        paymentMethod: 'credit_card',
        status: 'completed'
      });
      
      await savedUser.save();
      expect(savedUser.donations).toHaveLength(1);
      expect(savedUser.donations[0].amount).toBe(100);
      expect(savedUser.donations[0].status).toBe('completed');
    });

    it('should set default donation status', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      savedUser.donations.push({
        amount: 50,
        cause: 'Healthcare'
      });
      
      await savedUser.save();
      expect(savedUser.donations[0].status).toBe('completed');
    });

    it('should accept valid donation statuses', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      const statuses = ['pending', 'completed', 'failed'];
      for (const status of statuses) {
        savedUser.donations.push({
          amount: 10,
          cause: 'Test',
          status
        });
      }
      
      await savedUser.save();
      expect(savedUser.donations).toHaveLength(3);
    });
  });

  describe('Two-Factor Authentication', () => {
    it('should store 2FA secret', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      savedUser.twoFactorSecret = 'SECRET123';
      savedUser.twoFactorEnabled = true;
      await savedUser.save();
      
      expect(savedUser.twoFactorSecret).toBe('SECRET123');
      expect(savedUser.twoFactorEnabled).toBe(true);
    });

    it('should store backup codes', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      savedUser.backupCodes = [
        { code: 'CODE1', used: false },
        { code: 'CODE2', used: true }
      ];
      await savedUser.save();
      
      expect(savedUser.backupCodes).toHaveLength(2);
      expect(savedUser.backupCodes[0].used).toBe(false);
      expect(savedUser.backupCodes[1].used).toBe(true);
    });
  });

  describe('Token Blacklist', () => {
    it('should add tokens to blacklist', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1);
      
      savedUser.tokenBlacklist.push({
        token: 'token123',
        expiresAt: expiryDate
      });
      await savedUser.save();
      
      expect(savedUser.tokenBlacklist).toHaveLength(1);
      expect(savedUser.tokenBlacklist[0].token).toBe('token123');
    });
  });

  describe('Profile', () => {
    it('should store optional profile data', async () => {
      const user = new User({
        ...validUserData,
        profile: {
          phoneNumber: '1234567890',
          address: '123 Main St',
          preferredCauses: ['Education', 'Healthcare']
        }
      });
      const savedUser = await user.save();
      
      expect(savedUser.profile.phoneNumber).toBe('1234567890');
      expect(savedUser.profile.preferredCauses).toHaveLength(2);
    });
  });

  describe('Reset Token', () => {
    it('should store reset token and expiry', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      const resetToken = 'reset_token_123';
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1);
      
      savedUser.resetToken = resetToken;
      savedUser.resetTokenExpiry = expiryDate;
      await savedUser.save();
      
      expect(savedUser.resetToken).toBe(resetToken);
      expect(savedUser.resetTokenExpiry).toEqual(expiryDate);
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt timestamps', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should update updatedAt on modification', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      const originalUpdatedAt = savedUser.updatedAt;
      
      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      savedUser.firstName = 'Jane';
      await savedUser.save();
      
      expect(savedUser.updatedAt).not.toEqual(originalUpdatedAt);
    });
  });

  describe('Last Activity', () => {
    it('should have default lastActivity', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      expect(savedUser.lastActivity).toBeDefined();
      expect(savedUser.lastActivity).toBeInstanceOf(Date);
    });
  });
});

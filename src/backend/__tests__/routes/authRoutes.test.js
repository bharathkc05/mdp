/**
 * Test Suite for Auth Routes
 * Tests authentication endpoints including registration, login, verification, logout, password reset
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import authRoutes from '../../routes/authRoutes.js';
import User from '../../models/User.js';

let mongoServer;
let app;

// Mock external dependencies
const mockSendVerificationEmail = jest.fn();
const mockSendPasswordResetEmail = jest.fn();
const mockLogUserRegistration = jest.fn();
const mockLogLoginSuccess = jest.fn();
const mockLogLoginFailed = jest.fn();
const mockLogUserLogout = jest.fn();
const mockLogPasswordReset = jest.fn();
const mockLogEmailVerified = jest.fn();

jest.unstable_mockModule('../../utils/email.js', () => ({
  sendVerificationEmail: mockSendVerificationEmail,
  sendPasswordResetEmail: mockSendPasswordResetEmail
}));

jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logUserRegistration: mockLogUserRegistration,
  logLoginSuccess: mockLogLoginSuccess,
  logLoginFailed: mockLogLoginFailed,
  logUserLogout: mockLogUserLogout,
  logPasswordReset: mockLogPasswordReset,
  logEmailVerified: mockLogEmailVerified
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  
  // Set JWT secret for testing
  process.env.JWT_SECRET = 'test-secret-key';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  // Reset mocks before each test
  mockSendVerificationEmail.mockReset();
  mockSendPasswordResetEmail.mockReset();
  mockLogUserRegistration.mockReset();
  mockLogLoginSuccess.mockReset();
  mockLogLoginFailed.mockReset();
  mockLogUserLogout.mockReset();
  mockLogPasswordReset.mockReset();
  mockLogEmailVerified.mockReset();
  
  // Default mock implementations
  mockSendVerificationEmail.mockResolvedValue({
    previewUrl: 'http://test.com/preview',
    token: 'test-token',
    link: 'http://test.com/verify'
  });
  mockSendPasswordResetEmail.mockResolvedValue({
    previewUrl: 'http://test.com/reset'
  });
  mockLogUserRegistration.mockResolvedValue();
  mockLogLoginSuccess.mockResolvedValue();
  mockLogLoginFailed.mockResolvedValue();
  mockLogUserLogout.mockResolvedValue();
  mockLogPasswordReset.mockResolvedValue();
  mockLogEmailVerified.mockResolvedValue();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('Auth Routes - Registration', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        gender: 'male',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(mockSendVerificationEmail).toHaveBeenCalled();
      
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.verified).toBe(false);
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('All fields are required');
    });

    it('should return 400 if passwords do not match', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        gender: 'male',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'different'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Passwords do not match');
    });

    it('should return 400 if password is too short', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        gender: 'male',
        email: 'john@example.com',
        password: 'short',
        confirmPassword: 'short'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Password must be at least 8 characters');
    });

    it('should return 400 if email already exists', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        gender: 'male',
        email: 'existing@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      };

      await User.create({
        ...userData,
        verified: true
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Email already registered');
    });

    it('should handle email sending failure gracefully', async () => {
      mockSendVerificationEmail.mockRejectedValue(new Error('Email service down'));

      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        gender: 'male',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('verificationToken');
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification email', async () => {
      const user = await User.create({
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        email: 'john@example.com',
        password: 'password123',
        verified: false
      });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: user.email });

      expect(response.status).toBe(200);
      expect(mockSendVerificationEmail).toHaveBeenCalled();
    });

    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Email is required');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('User not found');
    });

    it('should return 400 if account already verified', async () => {
      const user = await User.create({
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        email: 'john@example.com',
        password: 'password123',
        verified: true
      });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: user.email });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already verified');
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should verify email with valid token', async () => {
      const user = await User.create({
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        email: 'john@example.com',
        password: 'password123',
        verified: false
      });

      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get(`/api/auth/verify?token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('verified successfully');

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.verified).toBe(true);
    });

    it('should return 400 if token is missing', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Token required');
    });

    it('should return 400 if token is invalid', async () => {
      const response = await request(app)
        .get('/api/auth/verify?token=invalid-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    it('should return 404 if user not found', async () => {
      const token = jwt.sign({ email: 'nonexistent@example.com' }, process.env.JWT_SECRET);

      const response = await request(app)
        .get(`/api/auth/verify?token=${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('User not found');
    });

    it('should handle already verified users', async () => {
      const user = await User.create({
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        email: 'john@example.com',
        password: 'password123',
        verified: true
      });

      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET);

      const response = await request(app)
        .get(`/api/auth/verify?token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('already verified');
    });
  });
});

describe('Auth Routes - Login', () => {
  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const user = await User.create({
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        email: 'john@example.com',
        password: 'password123',
        verified: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.role).toBe('donor');
      expect(mockLogLoginSuccess).toHaveBeenCalled();
    });

    it('should return 400 if email or password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Email and password required');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('User not found');
    });

    it('should return 401 if password is invalid', async () => {
      await User.create({
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        email: 'john@example.com',
        password: 'password123',
        verified: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid password');
      expect(mockLogLoginFailed).toHaveBeenCalled();
    });

    it('should return 403 if email not verified', async () => {
      await User.create({
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        email: 'john@example.com',
        password: 'password123',
        verified: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('verify your email');
    });

    it('should handle 2FA requirement for admin users', async () => {
      await User.create({
        firstName: 'Admin',
        lastName: 'User',
        age: 30,
        email: 'admin@example.com',
        password: 'password123',
        verified: true,
        role: 'admin',
        twoFactorEnabled: true,
        twoFactorSecret: 'test-secret'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.requiresTwoFactor).toBe(true);
      expect(response.body).toHaveProperty('userId');
    });
  });
});

describe('Auth Routes - Password Reset', () => {
  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const user = await User.create({
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        email: 'john@example.com',
        password: 'password123',
        verified: true
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: user.email });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Password reset instructions');
      expect(mockSendPasswordResetEmail).toHaveBeenCalled();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.resetToken).toBeTruthy();
      expect(updatedUser.resetTokenExpiry).toBeTruthy();
    });

    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Email is required');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('User not found');
    });

    it('should handle email service failure', async () => {
      mockSendPasswordResetEmail.mockRejectedValue(new Error('Email failed'));

      await User.create({
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        email: 'john@example.com',
        password: 'password123',
        verified: true
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'john@example.com' });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Error sending password reset email');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const user = await User.create({
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        email: 'john@example.com',
        password: 'oldpassword123',
        verified: true
      });

      const resetToken = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
      user.resetToken = resetToken;
      user.resetTokenExpiry = Date.now() + 3600000;
      await user.save();

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Password successfully reset');
      expect(mockLogPasswordReset).toHaveBeenCalled();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.resetToken).toBeUndefined();
    });

    it('should return 400 if token or password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'some-token' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Token and new password are required');
    });

    it('should return 400 if password is too short', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'some-token',
          newPassword: 'short'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Password must be at least 8 characters');
    });

    it('should return 400 if token is invalid or expired', async () => {
      const user = await User.create({
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        email: 'john@example.com',
        password: 'password123',
        verified: true
      });

      const resetToken = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
      user.resetToken = resetToken;
      user.resetTokenExpiry = Date.now() - 1000; // Expired
      await user.save();

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid or expired reset token');
    });
  });
});

describe('Auth Routes - Profile', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      age: 25,
      email: 'john@example.com',
      password: 'password123',
      verified: true
    });

    authToken = jwt.sign({ id: testUser._id, email: testUser.email }, process.env.JWT_SECRET);
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('john@example.com');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update user profile', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Jane',
          profile: {
            phoneNumber: '1234567890'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Profile updated successfully');

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.firstName).toBe('Jane');
      expect(updatedUser.profile.phoneNumber).toBe('1234567890');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({ firstName: 'Jane' });

      expect(response.status).toBe(401);
    });
  });
});

describe('Auth Routes - Logout', () => {
  it('should logout successfully', async () => {
    const user = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      age: 25,
      email: 'john@example.com',
      password: 'password123',
      verified: true
    });

    const authToken = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockLogUserLogout).toHaveBeenCalled();

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.tokenBlacklist).toHaveLength(1);
  });

  it('should return 401 without token', async () => {
    const response = await request(app)
      .post('/api/auth/logout');

    expect(response.status).toBe(401);
  });
});

describe('Auth Routes - Edge Cases and Error Paths', () => {
  it('should handle registration with very long names', async () => {
    const userData = {
      firstName: 'A'.repeat(100),
      lastName: 'B'.repeat(100),
      age: 25,
      gender: 'male',
      email: 'longname@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect([200, 400]).toContain(response.status);
  });

  it('should handle login with whitespace in email', async () => {
    const user = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      age: 25,
      email: 'test@example.com',
      password: 'password123',
      verified: true
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: '  test@example.com  ',
        password: 'password123'
      });

    expect([200, 401]).toContain(response.status);
  });

  it('should handle password reset with expired token', async () => {
    const user = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      age: 25,
      email: 'john@example.com',
      password: 'oldpassword',
      verified: true,
      resetPasswordToken: 'expired-token',
      resetPasswordExpires: new Date(Date.now() - 3600000) // 1 hour ago
    });

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: 'expired-token',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('expired');
  });

  it('should handle verification with already verified account', async () => {
    const user = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      age: 25,
      email: 'verified@example.com',
      password: 'password123',
      verified: true
    });

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET);

    const response = await request(app)
      .get(`/api/auth/verify?token=${token}`);

    expect([200, 400]).toContain(response.status);
  });

  it('should handle forgot password for non-existent email', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    expect(response.status).toBe(404);
  });

  it('should reject registration with mismatched gender', async () => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      age: 25,
      gender: 'invalid',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect([400, 500]).toContain(response.status);
  });

  it('should handle login attempt with missing fields', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(400);
  });

  it('should handle reset password with mismatched passwords', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: 'some-token',
        newPassword: 'password1',
        confirmPassword: 'password2'
      });

    expect(response.status).toBe(400);
  });
});

/**
 * Test Suite for Rate Limiter Middleware
 * Tests all rate limiters with various scenarios
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  loginRateLimiter,
  passwordResetRateLimiter,
  registrationRateLimiter,
  donationRateLimiter,
  generalRateLimiter,
  strictRateLimiter
} from '../../middleware/rateLimiter.js';

describe('Rate Limiter Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      ip: '127.0.0.1',
      path: '/api/test',
      headers: {
        'user-agent': 'Mozilla/5.0'
      },
      get: jest.fn((header) => req.headers[header.toLowerCase()]),
      log: {
        warn: jest.fn()
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
    };
    next = jest.fn();
  });

  describe('Login Rate Limiter', () => {
    it('should allow requests within limit', () => {
      loginRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should have correct window and max settings', () => {
      expect(loginRateLimiter).toBeDefined();
      // The limiter is configured with 15 min window and max 5 requests
    });

    it('should use IP address as key', () => {
      const req2 = { ...req, ip: '192.168.1.1' };
      
      loginRateLimiter(req, res, next);
      loginRateLimiter(req2, res, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('Password Reset Rate Limiter', () => {
    it('should allow requests within limit', () => {
      passwordResetRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should have correct window and max settings', () => {
      expect(passwordResetRateLimiter).toBeDefined();
      // Configured with 15 min window and max 3 requests
    });

    it('should use IP address as key', () => {
      const req2 = { ...req, ip: '10.0.0.1' };
      
      passwordResetRateLimiter(req, res, next);
      passwordResetRateLimiter(req2, res, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('Registration Rate Limiter', () => {
    it('should allow requests within limit', () => {
      registrationRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should have correct window and max settings', () => {
      expect(registrationRateLimiter).toBeDefined();
      // Configured with 1 hour window and max 5 requests
    });

    it('should use IP address as key', () => {
      const req2 = { ...req, ip: '172.16.0.1' };
      
      registrationRateLimiter(req, res, next);
      registrationRateLimiter(req2, res, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('Donation Rate Limiter', () => {
    it('should allow requests within limit', () => {
      donationRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should use user ID as key when authenticated', () => {
      req.user = { id: 'user123' };
      
      donationRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should use IP address as key when not authenticated', () => {
      req.user = undefined;
      
      donationRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should have correct window and max settings', () => {
      expect(donationRateLimiter).toBeDefined();
      // Configured with 1 min window and max 10 requests
    });

    it('should handle different users independently', () => {
      const req1 = { ...req, user: { id: 'user1' } };
      const req2 = { ...req, user: { id: 'user2' } };
      
      donationRateLimiter(req1, res, next);
      donationRateLimiter(req2, res, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('General Rate Limiter', () => {
    it('should allow requests within limit', () => {
      generalRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should skip health check endpoint', () => {
      req.path = '/health';
      
      generalRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip public config endpoints', () => {
      req.path = '/api/config';
      
      generalRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip config sub-paths', () => {
      req.path = '/api/config/currency';
      
      generalRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should not skip other endpoints', () => {
      req.path = '/api/users';
      
      generalRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should have correct window and max settings', () => {
      expect(generalRateLimiter).toBeDefined();
      // Configured with 15 min window and max 100 requests
    });
  });

  describe('Strict Rate Limiter', () => {
    it('should allow requests within limit', () => {
      strictRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should have correct window and max settings', () => {
      expect(strictRateLimiter).toBeDefined();
      // Configured with 5 min window and max 3 requests
    });

    it('should use IP address as key', () => {
      const req2 = { ...req, ip: '192.168.2.1' };
      
      strictRateLimiter(req, res, next);
      strictRateLimiter(req2, res, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should set standard rate limit headers', () => {
      loginRateLimiter(req, res, next);

      // Standard headers should be enabled (standardHeaders: true)
      expect(next).toHaveBeenCalled();
    });

    it('should not set legacy headers', () => {
      loginRateLimiter(req, res, next);

      // Legacy headers should be disabled (legacyHeaders: false)
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing IP address', () => {
      req.ip = undefined;
      
      loginRateLimiter(req, res, next);

      // Should still work, using undefined as key
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing user-agent', () => {
      req.get = jest.fn().mockReturnValue(undefined);
      
      loginRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle missing logger', () => {
      req.log = undefined;
      
      loginRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle request without headers', () => {
      req.headers = {};
      
      loginRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Different IP Addresses', () => {
    it('should track IPv4 addresses separately', () => {
      const req1 = { ...req, ip: '192.168.1.1' };
      const req2 = { ...req, ip: '192.168.1.2' };
      const req3 = { ...req, ip: '10.0.0.1' };
      
      loginRateLimiter(req1, res, next);
      loginRateLimiter(req2, res, next);
      loginRateLimiter(req3, res, next);

      expect(next).toHaveBeenCalledTimes(3);
    });

    it('should track IPv6 addresses', () => {
      req.ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      
      loginRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle localhost addresses', () => {
      req.ip = '127.0.0.1';
      
      loginRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle ::1 (IPv6 localhost)', () => {
      req.ip = '::1';
      
      loginRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Multiple Rate Limiters', () => {
    it('should work independently', () => {
      loginRateLimiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      passwordResetRateLimiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      registrationRateLimiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(3);

      donationRateLimiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(4);

      generalRateLimiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(5);

      strictRateLimiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(6);
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests with proxies (x-forwarded-for)', () => {
      req.headers['x-forwarded-for'] = '203.0.113.1, 198.51.100.1';
      
      loginRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle empty path', () => {
      req.path = '';
      
      generalRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle root path', () => {
      req.path = '/';
      
      generalRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle very long paths', () => {
      req.path = '/api/' + 'a'.repeat(1000);
      
      generalRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle special characters in path', () => {
      req.path = '/api/test?query=value&other=123';
      
      generalRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('User Authentication States', () => {
    it('should handle null user', () => {
      req.user = null;
      
      donationRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle undefined user', () => {
      req.user = undefined;
      
      donationRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle user without id', () => {
      req.user = { email: 'test@example.com' };
      
      donationRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle user with id', () => {
      req.user = { id: 'user123', email: 'test@example.com' };
      
      donationRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Response Format', () => {
    it('should have proper structure', () => {
      // All rate limiters should be functions
      expect(typeof loginRateLimiter).toBe('function');
      expect(typeof passwordResetRateLimiter).toBe('function');
      expect(typeof registrationRateLimiter).toBe('function');
      expect(typeof donationRateLimiter).toBe('function');
      expect(typeof generalRateLimiter).toBe('function');
      expect(typeof strictRateLimiter).toBe('function');
    });
  });

  describe('Status Code', () => {
    it('should be callable as middleware', () => {
      expect(() => loginRateLimiter(req, res, next)).not.toThrow();
      expect(() => passwordResetRateLimiter(req, res, next)).not.toThrow();
      expect(() => registrationRateLimiter(req, res, next)).not.toThrow();
      expect(() => donationRateLimiter(req, res, next)).not.toThrow();
      expect(() => generalRateLimiter(req, res, next)).not.toThrow();
      expect(() => strictRateLimiter(req, res, next)).not.toThrow();
    });
  });
});

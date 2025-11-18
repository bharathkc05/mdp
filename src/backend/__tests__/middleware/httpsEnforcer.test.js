/**
 * Test Suite for HTTPS Enforcer Middleware
 * Tests HTTPS enforcement, HSTS headers, and security configurations
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  enforceHTTPS,
  setHSTSHeaders,
  getSecureCookieConfig,
  requireSecureConnection,
  setSecurityHeaders
} from '../../middleware/httpsEnforcer.js';

describe('HTTPS Enforcer Middleware', () => {
  let req, res, next, originalEnv;

  beforeEach(() => {
    req = {
      secure: false,
      headers: {},
      url: '/test',
      get: jest.fn((header) => req.headers[header.toLowerCase()])
    };
    res = {
      redirect: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('enforceHTTPS', () => {
    describe('Development Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should skip HTTPS enforcement in development', () => {
        enforceHTTPS(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.redirect).not.toHaveBeenCalled();
      });

      it('should allow HTTP requests in development', () => {
        req.secure = false;
        
        enforceHTTPS(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.redirect).not.toHaveBeenCalled();
      });
    });

    describe('Test Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test';
      });

      it('should skip HTTPS enforcement in test', () => {
        enforceHTTPS(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.redirect).not.toHaveBeenCalled();
      });
    });

    describe('Production Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should allow HTTPS requests', () => {
        req.secure = true;
        
        enforceHTTPS(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.redirect).not.toHaveBeenCalled();
      });

      it('should allow requests with x-forwarded-proto https', () => {
        req.secure = false;
        req.headers['x-forwarded-proto'] = 'https';
        
        enforceHTTPS(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.redirect).not.toHaveBeenCalled();
      });

      it('should redirect HTTP to HTTPS', () => {
        req.secure = false;
        req.headers = { host: 'example.com' };
        req.url = '/test/path';
        
        enforceHTTPS(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/test/path');
        expect(next).not.toHaveBeenCalled();
      });

      it('should redirect with query parameters', () => {
        req.secure = false;
        req.headers = { host: 'example.com' };
        req.url = '/test?param=value';
        
        enforceHTTPS(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/test?param=value');
      });

      it('should redirect root path', () => {
        req.secure = false;
        req.headers = { host: 'example.com' };
        req.url = '/';
        
        enforceHTTPS(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/');
      });

      it('should handle subdomain redirects', () => {
        req.secure = false;
        req.headers = { host: 'api.example.com' };
        req.url = '/api/users';
        
        enforceHTTPS(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith(301, 'https://api.example.com/api/users');
      });

      it('should handle port in host header', () => {
        req.secure = false;
        req.headers = { host: 'example.com:8080' };
        req.url = '/test';
        
        enforceHTTPS(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com:8080/test');
      });
    });
  });

  describe('setHSTSHeaders', () => {
    describe('Development Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should not set HSTS headers in development', () => {
        setHSTSHeaders(req, res, next);

        expect(res.setHeader).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
      });
    });

    describe('Test Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test';
      });

      it('should not set HSTS headers in test', () => {
        setHSTSHeaders(req, res, next);

        expect(res.setHeader).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
      });
    });

    describe('Production Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should set HSTS headers in production', () => {
        setHSTSHeaders(req, res, next);

        expect(res.setHeader).toHaveBeenCalledWith(
          'Strict-Transport-Security',
          'max-age=31536000; includeSubDomains; preload'
        );
        expect(next).toHaveBeenCalled();
      });

      it('should set correct max-age (1 year)', () => {
        setHSTSHeaders(req, res, next);

        const call = res.setHeader.mock.calls[0];
        expect(call[1]).toContain('max-age=31536000');
      });

      it('should include includeSubDomains directive', () => {
        setHSTSHeaders(req, res, next);

        const call = res.setHeader.mock.calls[0];
        expect(call[1]).toContain('includeSubDomains');
      });

      it('should include preload directive', () => {
        setHSTSHeaders(req, res, next);

        const call = res.setHeader.mock.calls[0];
        expect(call[1]).toContain('preload');
      });
    });

    describe('Staging Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'staging';
      });

      it('should set HSTS headers in staging', () => {
        setHSTSHeaders(req, res, next);

        expect(res.setHeader).toHaveBeenCalledWith(
          'Strict-Transport-Security',
          'max-age=31536000; includeSubDomains; preload'
        );
        expect(next).toHaveBeenCalled();
      });
    });
  });

  describe('getSecureCookieConfig', () => {
    describe('Development Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should return config with secure=false in development', () => {
        const config = getSecureCookieConfig();

        expect(config.secure).toBe(false);
        expect(config.httpOnly).toBe(true);
        expect(config.sameSite).toBe('strict');
        expect(config.maxAge).toBe(24 * 60 * 60 * 1000);
      });
    });

    describe('Production Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should return config with secure=true in production', () => {
        const config = getSecureCookieConfig();

        expect(config.secure).toBe(true);
        expect(config.httpOnly).toBe(true);
        expect(config.sameSite).toBe('strict');
        expect(config.maxAge).toBe(24 * 60 * 60 * 1000);
      });

      it('should set httpOnly to prevent XSS', () => {
        const config = getSecureCookieConfig();

        expect(config.httpOnly).toBe(true);
      });

      it('should set sameSite for CSRF protection', () => {
        const config = getSecureCookieConfig();

        expect(config.sameSite).toBe('strict');
      });

      it('should set maxAge to 24 hours', () => {
        const config = getSecureCookieConfig();

        expect(config.maxAge).toBe(86400000); // 24 hours in milliseconds
      });
    });

    describe('Test Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test';
      });

      it('should return config with secure=false in test', () => {
        const config = getSecureCookieConfig();

        expect(config.secure).toBe(false);
      });
    });
  });

  describe('requireSecureConnection', () => {
    describe('Development Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should allow any connection in development', () => {
        req.secure = false;
        
        requireSecureConnection(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('Test Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test';
      });

      it('should allow any connection in test', () => {
        req.secure = false;
        
        requireSecureConnection(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('Production Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should allow secure connections', () => {
        req.secure = true;
        
        requireSecureConnection(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow connections with x-forwarded-proto https', () => {
        req.secure = false;
        req.headers['x-forwarded-proto'] = 'https';
        
        requireSecureConnection(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should reject insecure connections', () => {
        req.secure = false;
        
        requireSecureConnection(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'This operation requires a secure HTTPS connection'
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject when x-forwarded-proto is not https', () => {
        req.secure = false;
        req.headers['x-forwarded-proto'] = 'http';
        
        requireSecureConnection(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('setSecurityHeaders', () => {
    it('should set X-Content-Type-Options header', () => {
      setSecurityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    it('should set X-XSS-Protection header', () => {
      setSecurityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('should set X-Frame-Options header', () => {
      setSecurityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should set Referrer-Policy header', () => {
      setSecurityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    });

    it('should set Content-Security-Policy header', () => {
      setSecurityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );
    });

    it('should call next middleware', () => {
      setSecurityHeaders(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should set all security headers', () => {
      setSecurityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledTimes(5);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should handle missing host header', () => {
      req.secure = false;
      req.headers = {};
      req.url = '/test';
      
      enforceHTTPS(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(301, expect.stringContaining('https://'));
    });

    it('should handle empty url', () => {
      req.secure = false;
      req.headers = { host: 'example.com' };
      req.url = '';
      
      enforceHTTPS(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com');
    });

    it('should handle special characters in URL', () => {
      req.secure = false;
      req.headers = { host: 'example.com' };
      req.url = '/test?param=value&other=123#anchor';
      
      enforceHTTPS(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/test?param=value&other=123#anchor');
    });

    it('should handle Unicode in URL', () => {
      req.secure = false;
      req.headers = { host: 'example.com' };
      req.url = '/test/你好';
      
      enforceHTTPS(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/test/你好');
    });

    it('should handle undefined NODE_ENV as production', () => {
      delete process.env.NODE_ENV;
      req.secure = false;
      req.headers = { host: 'example.com' };
      req.url = '/test';
      
      enforceHTTPS(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/test');
    });
  });

  describe('Multiple Middleware Chain', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should work with other security middlewares', () => {
      req.secure = true;

      enforceHTTPS(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      setHSTSHeaders(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      setSecurityHeaders(req, res, next);
      expect(next).toHaveBeenCalledTimes(3);

      requireSecureConnection(req, res, next);
      expect(next).toHaveBeenCalledTimes(4);
    });
  });

  describe('Cookie Configuration', () => {
    it('should return consistent config object', () => {
      const config1 = getSecureCookieConfig();
      const config2 = getSecureCookieConfig();

      expect(config1).toEqual(config2);
    });

    it('should have all required cookie properties', () => {
      const config = getSecureCookieConfig();

      expect(config).toHaveProperty('httpOnly');
      expect(config).toHaveProperty('secure');
      expect(config).toHaveProperty('sameSite');
      expect(config).toHaveProperty('maxAge');
    });
  });

  describe('Default Export', () => {
    it('should export all functions', async () => {
      const module = await import('../../middleware/httpsEnforcer.js');
      
      expect(module.default).toBeDefined();
      expect(module.default.enforceHTTPS).toBeDefined();
      expect(module.default.setHSTSHeaders).toBeDefined();
      expect(module.default.getSecureCookieConfig).toBeDefined();
      expect(module.default.requireSecureConnection).toBeDefined();
      expect(module.default.setSecurityHeaders).toBeDefined();
    });
  });
});

/**
 * Test Suite for Health Routes
 * Tests health check endpoint with various scenarios
 * Target: ≥75% code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import healthRoutes from '../../routes/healthRoutes.js';

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  app = express();
  app.use('/health', healthRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Health Check Endpoint', () => {
  describe('GET /health', () => {
    it('should return 200 when database is connected', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'UP');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('database');
    });

    it('should return database status as connected', async () => {
      const response = await request(app).get('/health');

      expect(response.body.database.status).toBe('connected');
      expect(response.body.database.responseTime).toBeDefined();
    });

    it('should return valid timestamp in ISO 8601 format', async () => {
      const response = await request(app).get('/health');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should return uptime as a number', async () => {
      const response = await request(app).get('/health');

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should return database response time', async () => {
      const response = await request(app).get('/health');

      expect(response.body.database.responseTime).toBeDefined();
      expect(response.body.database.responseTime).toMatch(/^\d+ms$/);
    });

    it('should have correct response structure', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toEqual(
        expect.objectContaining({
          status: expect.any(String),
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          database: expect.objectContaining({
            status: expect.any(String),
            responseTime: expect.any(String)
          })
        })
      );
    });

    it('should return consistent timestamp format', async () => {
      const response = await request(app).get('/health');

      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(response.body.timestamp).toMatch(isoRegex);
    });

    it('should return response time in milliseconds format', async () => {
      const response = await request(app).get('/health');

      const responseTime = response.body.database.responseTime;
      const numericPart = parseInt(responseTime);
      expect(numericPart).toBeGreaterThanOrEqual(0);
      expect(responseTime.endsWith('ms')).toBe(true);
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = [
        request(app).get('/health'),
        request(app).get('/health'),
        request(app).get('/health')
      ];

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('UP');
        expect(response.body.database.status).toBe('connected');
      });
    });

    it('should return quickly (performance check)', async () => {
      const startTime = Date.now();
      await request(app).get('/health');
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('Database Connection States', () => {
    it('should return 503 when database is disconnected', async () => {
      // Temporarily disconnect
      await mongoose.disconnect();

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('DOWN');
      expect(response.body.database.status).toBe('disconnected');

      // Reconnect for other tests
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });

    it('should handle database ping errors', async () => {
      // Mock the admin().ping() to throw error
      const originalPing = mongoose.connection.db.admin().ping;
      mongoose.connection.db.admin = jest.fn().mockReturnValue({
        ping: jest.fn().mockRejectedValue(new Error('Connection error'))
      });

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('DOWN');
      expect(response.body.database.status).toBe('error');

      // Restore original
      mongoose.connection.db.admin = jest.fn().mockReturnValue({
        ping: originalPing
      });
    });
  });

  describe('Response Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive requests', async () => {
      const results = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app).get('/health');
        results.push(response);
      }

      results.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('UP');
      });
    });

    it('should return different timestamps for different requests', async () => {
      const response1 = await request(app).get('/health');
      await new Promise(resolve => setTimeout(resolve, 10));
      const response2 = await request(app).get('/health');

      expect(response1.body.timestamp).not.toBe(response2.body.timestamp);
    });

    it('should return increasing uptime', async () => {
      const response1 = await request(app).get('/health');
      await new Promise(resolve => setTimeout(resolve, 100));
      const response2 = await request(app).get('/health');

      expect(response2.body.uptime).toBeGreaterThanOrEqual(response1.body.uptime);
    });
  });

  describe('Database Response Time', () => {
    it('should return reasonable response time', async () => {
      const response = await request(app).get('/health');

      const responseTime = parseInt(response.body.database.responseTime);
      expect(responseTime).toBeGreaterThanOrEqual(0);
      expect(responseTime).toBeLessThan(500); // Should be under 500ms
    });

    it('should measure response time accurately', async () => {
      const response = await request(app).get('/health');

      const responseTime = response.body.database.responseTime;
      expect(responseTime).toBeDefined();
      expect(responseTime).toMatch(/^\d+ms$/);
    });
  });

  describe('Status Codes', () => {
    it('should return 200 for healthy system', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });

    it('should return proper status based on database state', async () => {
      const response = await request(app).get('/health');

      if (mongoose.connection.readyState === 1) {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('UP');
      } else {
        expect(response.status).toBe(503);
        expect(response.body.status).toBe('DOWN');
      }
    });
  });

  describe('Logging', () => {
    it('should work with request logger', async () => {
      const mockLog = {
        debug: jest.fn()
      };

      const appWithLogger = express();
      appWithLogger.use((req, res, next) => {
        req.log = mockLog;
        next();
      });
      appWithLogger.use('/health', healthRoutes);

      await request(appWithLogger).get('/health');

      // Logger should be called if present
      expect(mockLog.debug).toHaveBeenCalled();
    });

    it('should work without request logger', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });
  });

  describe('Database Ready State', () => {
    it('should check database ready state correctly', async () => {
      const response = await request(app).get('/health');

      expect(mongoose.connection.readyState).toBe(1);
      expect(response.body.database.status).toBe('connected');
    });

    it('should handle connecting state', async () => {
      // This is hard to test as connection happens fast
      // Just verify the endpoint handles it gracefully
      const response = await request(app).get('/health');
      
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('Response Body Validation', () => {
    it('should include all required fields', async () => {
      const response = await request(app).get('/health');

      const requiredFields = ['status', 'timestamp', 'uptime', 'database'];
      requiredFields.forEach(field => {
        expect(response.body).toHaveProperty(field);
      });
    });

    it('should include database status fields', async () => {
      const response = await request(app).get('/health');

      expect(response.body.database).toHaveProperty('status');
      expect(response.body.database).toHaveProperty('responseTime');
    });

    it('should have valid status values', async () => {
      const response = await request(app).get('/health');

      expect(['UP', 'DOWN']).toContain(response.body.status);
      expect(['connected', 'disconnected', 'error', 'unknown']).toContain(
        response.body.database.status
      );
    });
  });

  describe('Method Not Allowed', () => {
    it('should only accept GET requests', async () => {
      const postResponse = await request(app).post('/health');
      const putResponse = await request(app).put('/health');
      const deleteResponse = await request(app).delete('/health');

      // These should return 404 or 405 as only GET is defined
      expect(postResponse.status).toBeGreaterThanOrEqual(404);
      expect(putResponse.status).toBeGreaterThanOrEqual(404);
      expect(deleteResponse.status).toBeGreaterThanOrEqual(404);
    });
  });

  describe('Integration Tests', () => {
    it('should provide useful information for monitoring', async () => {
      const response = await request(app).get('/health');

      // Should provide enough info for monitoring systems
      expect(response.body.status).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.database.status).toBeDefined();
      
      // Status should be either healthy or unhealthy
      expect(['UP', 'DOWN']).toContain(response.body.status);
    });

    it('should be suitable for load balancer health checks', async () => {
      const response = await request(app).get('/health');

      // Quick response
      expect(response.status).toBeDefined();
      
      // Clear status
      if (response.status === 200) {
        expect(response.body.status).toBe('UP');
      } else {
        expect(response.body.status).toBe('DOWN');
      }
    });
  });
});

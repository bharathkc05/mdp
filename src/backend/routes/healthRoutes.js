import express from "express";
import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * Story 5.5: System Health Check Endpoint
 * 
 * GET /health
 * Returns the health status of the application and its database connection
 * 
 * Response format:
 * {
 *   "status": "UP" | "DOWN",
 *   "timestamp": "ISO 8601 timestamp",
 *   "uptime": "process uptime in seconds",
 *   "database": {
 *     "status": "connected" | "disconnected" | "error",
 *     "responseTime": "response time in ms"
 *   }
 * }
 */
router.get("/", async (req, res) => {
  const healthCheck = {
    status: "UP",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: "unknown",
      responseTime: null
    }
  };

  try {
    // Check database connection
    const startTime = Date.now();
    
    if (mongoose.connection.readyState === 1) {
      // readyState 1 means connected
      // Perform a simple ping to verify the connection is actually working
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;
      
      healthCheck.database.status = "connected";
      healthCheck.database.responseTime = `${responseTime}ms`;
      
      // Log successful health check
      if (req.log) {
        req.log.debug({ 
          dbResponseTime: responseTime,
          uptime: healthCheck.uptime 
        }, "Health check passed");
      }
      
      return res.status(200).json(healthCheck);
    } else {
      // Database is not connected
      healthCheck.status = "DOWN";
      healthCheck.database.status = "disconnected";
      
      logger.warn({ 
        readyState: mongoose.connection.readyState 
      }, "Health check failed: Database disconnected");
      
      return res.status(503).json(healthCheck);
    }
  } catch (error) {
    // Error occurred while checking database
    healthCheck.status = "DOWN";
    healthCheck.database.status = "error";
    
    logger.error({ 
      error: error.message,
      stack: error.stack 
    }, "Health check failed: Database error");
    
    return res.status(503).json(healthCheck);
  }
});

export default router;

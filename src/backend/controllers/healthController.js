import { sendResponse } from "../utils/response.js";
import * as healthService from "../services/healthService.js";
import { logger } from "../utils/logger.js";

export const getHealth = async (req, res) => {
  try {
    const healthCheck = await healthService.getHealthStatus();
    
    if (req.log) {
      req.log.debug({ database: healthCheck.database.status }, 'Health check passed');
    }
    
    res.status(200).json(healthCheck);
  } catch (error) {
    if (req.log) {
      req.log.error({ err: error }, 'Health check failed');
    } else {
      logger.error({ err: error }, 'Health check failed');
    }
    
    res.status(503).json({
      status: "DOWN",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: "disconnected",
        error: error.message
      }
    });
  }
};

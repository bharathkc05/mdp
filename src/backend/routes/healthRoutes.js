import express from "express";
import * as healthController from "../controllers/healthController.js";

const router = express.Router();

/**
 * Story 5.5: System Health Check Endpoint
 * 
 * GET /health
 * Returns the health status of the application and its database connection
 */
router.get("/", healthController.getHealth);

export default router;

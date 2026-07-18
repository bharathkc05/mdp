import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import { httpLogger, logger } from "./utils/logger.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

import userRoutes from "./routes/userRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import causeRoutes from "./routes/causeRoutes.js";
import twoFactorRoutes from "./routes/twoFactorRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import { 
  errorHandler, 
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException 
} from "./middleware/errorHandler.js";
import { 
  enforceHTTPS, 
  setHSTSHeaders, 
  setSecurityHeaders 
} from "./middleware/httpsEnforcer.js";
import { generalRateLimiter } from "./middleware/rateLimiter.js";
import { startCauseStatusUpdater, updateExpiredCauses } from "./jobs/causeStatusUpdater.js";

dotenv.config();

// Story 5.4: Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

const app = express();

// Trust proxy - required for Vercel and rate limiting
app.set('trust proxy', 1);

// Story 5.1: Enforce HTTPS and Secure Transport
// Apply HTTPS enforcement first (before other middleware)
app.use(enforceHTTPS);
app.use(setHSTSHeaders);
app.use(setSecurityHeaders);

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true
  })
);

// Rate limiting - Story 5.3: General API rate limiting
app.use(generalRateLimiter);

// Parsing middleware
app.use(cookieParser());
app.use(express.json({ limit: '10kb' })); // Body parser with size limit

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Structured HTTP request logging (pino)
app.use(httpLogger);
// Keep morgan for any simple dev output if desired (optional)
// app.use(morgan('dev'));

// Database connection
connectDB();

// Start the scheduled job to auto-complete expired causes
startCauseStatusUpdater();

// Run initial check for expired causes on startup
updateExpiredCauses().catch(err => 
  logger.error({ err }, 'Failed to run initial expired causes check')
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes); // Extracted Users Module

app.use("/api/causes", causeRoutes); // Story 2.1: Browse, Search, and Filter Causes
app.use("/api/donate", donationRoutes);
app.use("/api/dashboard", dashboardRoutes); // Story 4.1: Backend Aggregation Dashboard
app.use("/api/2fa", twoFactorRoutes); // Story 1.5: Two-Factor Authentication for Admins
app.use("/api/admin/audit-logs", auditLogRoutes); // Story 3.4: View System Audit Logs
app.use("/api/config", configRoutes); // Story 2.6: Platform Configuration

// Story 5.5: System Health Check Endpoint (public endpoint, no authentication required)
app.use("/api/health", healthRoutes);

// Story 5.4: 404 handler for undefined routes
app.use(notFoundHandler);

// Story 5.4: Global error handling middleware (must be last)
app.use(errorHandler);

// Export app for Vercel serverless function
export default app;

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => logger.info({ port: PORT }, '🚀 Backend running'));
}

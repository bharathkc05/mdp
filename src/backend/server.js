import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { httpLogger, logger } from "./utils/logger.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import causeRoutes from "./routes/causeRoutes.js";
import twoFactorRoutes from "./routes/twoFactorRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";
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
import { startCauseStatusUpdater, updateExpiredCauses } from "./utils/causeStatusUpdater.js";

dotenv.config();

// Story 5.4: Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

const app = express();

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
app.use(express.json({ limit: '10kb' })); // Body parser with size limit

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

// Normalize accidentally duplicated API prefixes (e.g. /api/auth/api/auth/verify)
app.use((req, res, next) => {
  if (req.url.includes('/api/auth/api/auth')) {
    req.url = req.url.replace('/api/auth/api/auth', '/api/auth');
    // use request-scoped logger when available
    if (req.log) req.log.info({ normalizedUrl: req.url }, 'Normalized URL');
    else logger.info({ normalizedUrl: req.url }, 'Normalized URL');
  }
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/causes", causeRoutes); // Story 2.1: Browse, Search, and Filter Causes
app.use("/api/donate", donationRoutes);
app.use("/api/dashboard", dashboardRoutes); // Story 4.1: Backend Aggregation Dashboard
app.use("/api/2fa", twoFactorRoutes); // Story 1.5: Two-Factor Authentication for Admins
app.use("/api/admin/audit-logs", auditLogRoutes); // Story 3.4: View System Audit Logs

// Story 5.5: System Health Check Endpoint (public endpoint, no authentication required)
app.use("/health", healthRoutes);

// Story 5.4: 404 handler for undefined routes
app.use(notFoundHandler);

// Story 5.4: Global error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => logger.info({ port: PORT }, '🚀 Backend running'));

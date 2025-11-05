/**
 * HTTPS Server Configuration
 * Story 5.1: Enforce HTTPS and Secure Transport
 * 
 * Alternative server startup with HTTPS support for production
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { 
  setHSTSHeaders, 
  setSecurityHeaders 
} from "./middleware/httpsEnforcer.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Story 5.1: Apply security headers
app.use(setHSTSHeaders);
app.use(setSecurityHeaders);

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      "https://localhost:5173",
      "https://localhost:5174",
      "https://localhost:5175",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Parsing middleware
app.use(express.json({ limit: '10kb' })); // Body parser with size limit
app.use(morgan('dev')); // Logging

// Database connection
connectDB();

// Normalize accidentally duplicated API prefixes
app.use((req, res, next) => {
  if (req.url.includes('/api/auth/api/auth')) {
    req.url = req.url.replace('/api/auth/api/auth', '/api/auth');
    console.log('Normalized URL to:', req.url);
  }
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/donate", donationRoutes);
app.use("/api/dashboard", dashboardRoutes); // Story 4.1: Backend Aggregation Dashboard

// Error handling
app.use(errorHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    https: req.secure,
    protocol: req.protocol
  });
});

const PORT = process.env.PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Function to start HTTPS server
function startHTTPSServer() {
  try {
    const sslKeyPath = path.join(__dirname, 'ssl', 'server.key');
    const sslCertPath = path.join(__dirname, 'ssl', 'server.crt');

    // Check if SSL certificates exist
    if (!fs.existsSync(sslKeyPath) || !fs.existsSync(sslCertPath)) {
      console.log('⚠️  SSL certificates not found. Run generate-ssl-cert.ps1 first.');
      console.log('   For now, starting HTTP server only...');
      startHTTPServer();
      return;
    }

    // Read SSL certificate and key
    const httpsOptions = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath)
    };

    // Create HTTPS server
    const httpsServer = https.createServer(httpsOptions, app);

    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`🔒 HTTPS Server running on port ${HTTPS_PORT}`);
      console.log(`   https://localhost:${HTTPS_PORT}`);
    });

    // Also start HTTP server for redirect
    const httpApp = express();
    httpApp.use((req, res) => {
      const httpsUrl = `https://${req.headers.host.split(':')[0]}:${HTTPS_PORT}${req.url}`;
      console.log(`Redirecting HTTP to HTTPS: ${httpsUrl}`);
      res.redirect(301, httpsUrl);
    });

    const httpServer = http.createServer(httpApp);
    httpServer.listen(PORT, () => {
      console.log(`🔀 HTTP Redirect Server running on port ${PORT} (redirects to HTTPS)`);
    });

  } catch (error) {
    console.error('❌ Error starting HTTPS server:', error.message);
    console.log('   Falling back to HTTP server...');
    startHTTPServer();
  }
}

// Function to start HTTP server (development/fallback)
function startHTTPServer() {
  const httpServer = http.createServer(app);
  httpServer.listen(PORT, () => {
    console.log(`🚀 HTTP Server running on port ${PORT}`);
    console.log(`   http://localhost:${PORT}`);
    console.log('   ⚠️  WARNING: HTTPS is not enabled. Use for development only!');
  });
}

// Determine which server to start based on environment
if (process.env.USE_HTTPS === 'true' || process.env.NODE_ENV === 'production') {
  console.log('Starting server with HTTPS...');
  startHTTPSServer();
} else {
  console.log('Starting server with HTTP (development mode)...');
  startHTTPServer();
}

export default app;

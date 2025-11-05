/**
 * Story 5.3: Rate Limiting Middleware
 * 
 * Implements rate limiting protection for sensitive endpoints to prevent:
 * - Brute-force attacks
 * - Denial-of-service (DoS) attacks
 * - API abuse
 * 
 * Rate limits applied to:
 * - Login endpoint: 5 attempts per 15 minutes
 * - Password reset: 3 attempts per 15 minutes
 * - Registration: 5 attempts per hour
 * - Donation endpoint: 10 attempts per minute
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

/**
 * Custom handler for rate limit exceeded
 * Logs the event and returns user-friendly error message
 */
const rateLimitHandler = (req, res) => {
  const logData = {
    ip: req.ip,
    path: req.path,
    userAgent: req.get('user-agent')
  };
  
  if (req.log) {
    req.log.warn(logData, 'Rate limit exceeded');
  } else {
    logger.warn(logData, 'Rate limit exceeded');
  }

  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
    retryAfter: req.rateLimit?.resetTime 
      ? new Date(req.rateLimit.resetTime).toISOString()
      : undefined
  });
};

/**
 * Skip successful requests (optional optimization)
 * Only count failed login attempts
 */
const skipSuccessfulRequests = (req, res) => {
  return res.statusCode < 400;
};

/**
 * Login Rate Limiter
 * Limit: 5 attempts per 15 minutes per IP
 * Protects against brute-force password attacks
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs per IP
  message: 'Too many login attempts. Please try again after 15 minutes.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: rateLimitHandler,
  // Optional: Only count failed login attempts
  // skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Use IP address as key
    return req.ip;
  }
});

/**
 * Password Reset Rate Limiter
 * Limit: 3 attempts per 15 minutes per IP
 * Prevents password reset abuse and email flooding
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per windowMs per IP
  message: 'Too many password reset requests. Please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    return req.ip;
  }
});

/**
 * Registration Rate Limiter
 * Limit: 5 registrations per hour per IP
 * Prevents spam account creation
 */
export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour per IP
  message: 'Too many registration attempts. Please try again after 1 hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    return req.ip;
  }
});

/**
 * Donation Rate Limiter
 * Limit: 10 donations per minute per user
 * Prevents rapid-fire donation spam
 */
export const donationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many donation requests. Please wait a moment and try again.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  }
});

/**
 * General API Rate Limiter
 * Limit: 100 requests per 15 minutes per IP
 * General protection for all API endpoints
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests from this IP. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  }
});

/**
 * Strict Rate Limiter for highly sensitive operations
 * Limit: 3 attempts per 5 minutes
 */
export const strictRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 requests
  message: 'Too many attempts. Please try again after 5 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

export default {
  loginRateLimiter,
  passwordResetRateLimiter,
  registrationRateLimiter,
  donationRateLimiter,
  generalRateLimiter,
  strictRateLimiter
};

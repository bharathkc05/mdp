/**
 * HTTPS Enforcement Middleware
 * Story 5.1: Enforce HTTPS and Secure Transport
 * 
 * This middleware ensures all client-server communication uses HTTPS
 * and implements security best practices for secure transport.
 */

/**
 * Middleware to enforce HTTPS for all requests
 * Redirects HTTP requests to HTTPS in production
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const enforceHTTPS = (req, res, next) => {
  // Skip HTTPS enforcement in development/test environments
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return next();
  }

  // Check if request is already secure
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }

  // Redirect HTTP to HTTPS
  const httpsUrl = `https://${req.headers.host}${req.url}`;
  console.log(`[HTTPS Enforcer] Redirecting HTTP to HTTPS: ${httpsUrl}`);
  
  return res.redirect(301, httpsUrl);
};

/**
 * Middleware to set HTTP Strict Transport Security (HSTS) headers
 * Tells browsers to only use HTTPS for future requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const setHSTSHeaders = (req, res, next) => {
  // Only set HSTS in production
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    // max-age: 1 year in seconds
    // includeSubDomains: Apply to all subdomains
    // preload: Allow browsers to preload HSTS
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  next();
};

/**
 * Configure secure cookie settings for production
 * @returns {Object} Cookie configuration object
 */
export const getSecureCookieConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,              // Prevent JavaScript access to cookies
    secure: isProduction,        // Only send cookies over HTTPS in production
    sameSite: 'strict',          // CSRF protection
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  };
};

/**
 * Middleware to validate secure connection requirements
 * Ensures critical operations only happen over HTTPS
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const requireSecureConnection = (req, res, next) => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return next();
  }

  if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
    return res.status(403).json({
      success: false,
      message: 'This operation requires a secure HTTPS connection'
    });
  }

  next();
};

/**
 * Additional security headers for secure transport
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const setSecurityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Referrer policy for privacy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'"
  );
  
  next();
};

export default {
  enforceHTTPS,
  setHSTSHeaders,
  getSecureCookieConfig,
  requireSecureConnection,
  setSecurityHeaders
};

import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Structured error logging
  if (req && req.log) {
    req.log.error({ err, message: err.message }, 'Unhandled error');
  } else {
    logger.error({ err, message: err.message }, 'Unhandled error');
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
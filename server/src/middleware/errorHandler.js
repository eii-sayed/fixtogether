const logger = require('../utils/logger');
const config = require('../config');

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || '';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle 404 - route not found
 */
const notFound = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

/**
 * Global error handler
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join('. ');
    code = 'VALIDATION_ERROR';
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `A record with this ${field} already exists.`;
    code = 'DUPLICATE_KEY';
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    code = 'INVALID_ID';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired.';
    code = 'TOKEN_EXPIRED';
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File size exceeds the allowed limit.';
    code = 'FILE_TOO_LARGE';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn('Client error:', {
      message: err.message,
      statusCode,
      url: req.originalUrl,
    });
  }

  const response = {
    success: false,
    message,
    code,
  };

  // Include stack trace only in development
  if (config.env === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = { AppError, notFound, errorHandler };

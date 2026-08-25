const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * In test environment, skip rate limiting by default so test suites
 * (which register many users across multiple tests) are not throttled.
 * Targeted rate-limiting tests can pass the 'x-test-rate-limit: true' header.
 */
const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * Consistent rate-limit response handler.
 * Returns JSON with code: 'RATE_LIMIT_EXCEEDED' and retryAfter seconds.
 */
const rateLimitHandler = (req, res, next, options) => {
  const retryAfter = Math.ceil(options.windowMs / 1000);
  res.setHeader('Retry-After', retryAfter);
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter,
  });
};

const createLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: (req) => {
      if (options.skip && options.skip(req)) return true;
      if (isTestEnv && !req.headers['x-test-rate-limit']) return true;
      return false;
    },
  });
};

/**
 * General API limiter — applied to all /api routes.
 * Skips health check and token refresh to keep them always available.
 */
const generalLimiter = createLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  skip: (req) => req.path === '/health' || req.path === '/v1/auth/refresh',
});

/**
 * Public reads limiter — for public listing endpoints.
 */
const publicLimiter = createLimiter({
  windowMs: config.publicRateLimit.windowMs,
  max: config.publicRateLimit.max,
});

/**
 * Authenticated reads limiter — generous limit for authenticated navigation.
 */
const authReadLimiter = createLimiter({
  windowMs: config.authReadRateLimit.windowMs,
  max: config.authReadRateLimit.max,
});

/**
 * Auth limiter — stricter limit for login and registration.
 */
const authLimiter = createLimiter({
  windowMs: config.authRateLimit.windowMs,
  max: config.authRateLimit.max,
});

/**
 * Write limiter — for mutations: creating items, updating profiles, etc.
 */
const writeLimiter = createLimiter({
  windowMs: config.writeRateLimit.windowMs,
  max: config.writeRateLimit.max,
});

/**
 * Publish limiter — for repair request publishing.
 */
const publishLimiter = createLimiter({
  windowMs: config.publishRateLimit.windowMs,
  max: config.publishRateLimit.max,
});

/**
 * AI limiter — for AI analysis / chat.
 */
const aiLimiter = createLimiter({
  windowMs: config.aiRateLimit.windowMs,
  max: config.aiRateLimit.max,
});

/**
 * Message limiter — for sending chat messages.
 */
const messageLimiter = createLimiter({
  windowMs: config.messageRateLimit.windowMs,
  max: config.messageRateLimit.max,
});

/**
 * Upload limiter — for file / image uploads.
 */
const uploadLimiter = createLimiter({
  windowMs: config.uploadRateLimit.windowMs,
  max: config.uploadRateLimit.max,
});

/**
 * Security limiter — for password changes, account status changes.
 */
const securityLimiter = createLimiter({
  windowMs: config.securityRateLimit.windowMs,
  max: config.securityRateLimit.max,
});

module.exports = {
  generalLimiter,
  publicLimiter,
  authReadLimiter,
  authLimiter,
  writeLimiter,
  publishLimiter,
  aiLimiter,
  messageLimiter,
  uploadLimiter,
  securityLimiter,
  rateLimitHandler,
};

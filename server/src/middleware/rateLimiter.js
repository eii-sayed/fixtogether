const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { createRateLimitStore } = require('../services/rateLimitStore');

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
  const resetAt = req.rateLimit?.resetTime?.getTime?.();
  const retryAfter = resetAt
    ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
    : Math.ceil(options.windowMs / 1000);
  res.setHeader('Retry-After', retryAfter);
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter,
  });
};

const getAuthenticatedUserId = (req) => {
  const header = req.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(header.slice(7), config.jwt.accessSecret);
    return decoded?.userId?.toString() || null;
  } catch {
    return null;
  }
};

const rateLimitKey = (req) => {
  const userId = getAuthenticatedUserId(req);
  return userId ? `account:${userId}` : `ip:${ipKeyGenerator(req.ip)}`;
};

const createLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    keyGenerator: rateLimitKey,
    store: createRateLimitStore(options.name),
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: (req) => {
      if (options.skip && options.skip(req)) return true;
      if (isTestEnv && !req.headers['x-test-rate-limit']) return true;
      if (process.env.NODE_ENV === 'development' && req.headers['x-bypass-rate-limit']) return true;
      return false;
    },
  });
};

/**
 * General API limiter — applied to all /api routes.
 * Skips health check and token refresh to keep them always available.
 */
const generalLimiter = createLimiter({
  name: 'general',
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/health' || req.path === '/v1/auth/refresh',
});

/**
 * Read requests get a separate pool. Authenticated users are keyed by their
 * verified account; public traffic is keyed by IP.
 */
const readLimiter = createLimiter({
  name: 'reads',
  windowMs: config.authReadRateLimit.windowMs,
  max: (req) => (getAuthenticatedUserId(req) ? config.authReadRateLimit.max : config.publicRateLimit.max),
  skip: (req) => !['GET', 'HEAD'].includes(req.method),
});

/**
 * Public reads limiter — for public listing endpoints.
 */
const publicLimiter = createLimiter({
  name: 'public',
  windowMs: config.publicRateLimit.windowMs,
  max: config.publicRateLimit.max,
});

/**
 * Authenticated reads limiter — generous limit for authenticated navigation.
 */
const authReadLimiter = createLimiter({
  name: 'authenticated-read',
  windowMs: config.authReadRateLimit.windowMs,
  max: config.authReadRateLimit.max,
});

/**
 * Auth limiter — stricter limit for login and registration.
 */
const authLimiter = createLimiter({
  name: 'auth',
  windowMs: config.authRateLimit.windowMs,
  max: config.authRateLimit.max,
});

/**
 * Write limiter — for mutations: creating items, updating profiles, etc.
 */
const writeLimiter = createLimiter({
  name: 'write',
  windowMs: config.writeRateLimit.windowMs,
  max: config.writeRateLimit.max,
});

/**
 * Publish limiter — for repair request publishing.
 */
const publishLimiter = createLimiter({
  name: 'publish',
  windowMs: config.publishRateLimit.windowMs,
  max: config.publishRateLimit.max,
});

/**
 * AI limiter — for AI analysis / chat.
 */
const aiLimiter = createLimiter({
  name: 'ai',
  windowMs: config.aiRateLimit.windowMs,
  max: config.aiRateLimit.max,
});

/**
 * Message limiter — for sending chat messages.
 */
const messageLimiter = createLimiter({
  name: 'message',
  windowMs: config.messageRateLimit.windowMs,
  max: config.messageRateLimit.max,
});

/**
 * Upload limiter — for file / image uploads.
 */
const uploadLimiter = createLimiter({
  name: 'upload',
  windowMs: config.uploadRateLimit.windowMs,
  max: config.uploadRateLimit.max,
});

/**
 * Security limiter — for password changes, account status changes.
 */
const securityLimiter = createLimiter({
  name: 'security',
  windowMs: config.securityRateLimit.windowMs,
  max: config.securityRateLimit.max,
});

module.exports = {
  generalLimiter,
  readLimiter,
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

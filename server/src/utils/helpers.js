/**
 * Utility helpers used across the application
 */

/**
 * Wrap async route handlers to catch errors
 * @param {Function} fn - Async function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Build pagination response
 * @param {number} total - Total items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 */
const paginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

/**
 * Parse pagination query params
 * @param {Object} query - Express query object
 * @param {Object} defaults - Default values
 */
const parsePagination = (query, defaults = { page: 1, limit: 20, maxLimit: 100 }) => {
  let page = parseInt(query.page, 10) || defaults.page;
  let limit = parseInt(query.limit, 10) || defaults.limit;

  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > defaults.maxLimit) limit = defaults.maxLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Generate a URL-safe slug from a string
 * @param {string} str
 */
const slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Generate a random alphanumeric code
 * @param {number} length
 */
const generateCode = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Strip sensitive fields from an object
 * @param {Object} obj
 * @param {string[]} fields
 */
const stripFields = (obj, fields) => {
  const cleaned = { ...obj };
  fields.forEach((field) => delete cleaned[field]);
  return cleaned;
};

/**
 * Standard success response format
 */
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Standard error response format
 */
const errorResponse = (res, message = 'Error', statusCode = 400, code = '') => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
  });
};

module.exports = {
  asyncHandler,
  paginationMeta,
  parsePagination,
  slugify,
  generateCode,
  stripFields,
  successResponse,
  errorResponse,
};

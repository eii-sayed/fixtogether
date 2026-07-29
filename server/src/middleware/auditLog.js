const { AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Create an audit log entry
 * @param {Object} params
 * @param {string} params.actor - User ID
 * @param {string} params.action - Action performed
 * @param {string} params.targetType - Type of target entity
 * @param {string} params.targetId - ID of target entity
 * @param {Object} params.metadata - Additional data
 * @param {Object} req - Express request (for IP and user agent)
 */
const createAuditLog = async ({ actor, action, targetType, targetId, metadata = {} }, req = null) => {
  try {
    await AuditLog.create({
      actor,
      action,
      targetType,
      targetId,
      metadata,
      ipAddress: req ? (req.ip || req.connection.remoteAddress) : '',
      userAgent: req ? (req.headers['user-agent'] || '') : '',
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error.message);
  }
};

/**
 * Audit log middleware - logs specific actions automatically
 * @param {string} action - Action name
 * @param {string} targetType - Target entity type
 * @param {Function} getTargetId - Function to get target ID from request
 */
const auditMiddleware = (action, targetType, getTargetId = null) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Log only successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const targetId = getTargetId ? getTargetId(req, data) : req.params.id;
        createAuditLog(
          {
            actor: req.user.userId,
            action,
            targetType,
            targetId,
            metadata: {
              method: req.method,
              path: req.originalUrl,
            },
          },
          req
        );
      }
      return originalJson(data);
    };

    next();
  };
};

module.exports = { createAuditLog, auditMiddleware };

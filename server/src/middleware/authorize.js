const { hasPermission } = require('../services/permissionService');
const { User, ReviewQueueItem } = require('../models');
const { ADMIN_PERMISSIONS, REVIEW_QUEUE_TYPE } = require('../constants');
const mongoose = require('mongoose');

const hasAdminPermission = (user, permission) => {
  if (user?.role !== 'admin' || !Array.isArray(user.adminPermissions)) return false;
  return user.adminPermissions.includes(ADMIN_PERMISSIONS.SUPER_ADMIN) || user.adminPermissions.includes(permission);
};

const queuePermissionForType = (entityType) => ({
  [REVIEW_QUEUE_TYPE.VERIFICATION]: ADMIN_PERMISSIONS.VERIFICATION,
  [REVIEW_QUEUE_TYPE.SAFETY_FLAG]: ADMIN_PERMISSIONS.SAFETY,
  [REVIEW_QUEUE_TYPE.DISPUTE]: ADMIN_PERMISSIONS.DISPUTES,
  [REVIEW_QUEUE_TYPE.USER_APPEAL]: ADMIN_PERMISSIONS.SUPPORT,
  [REVIEW_QUEUE_TYPE.STALLED_REQUEST]: ADMIN_PERMISSIONS.SUPPORT,
  [REVIEW_QUEUE_TYPE.SYSTEM_HEALTH]: ADMIN_PERMISSIONS.AUDIT,
}[entityType]);

/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
};

/**
 * Check if current user owns a resource or is admin
 * @param {Function} getOwnerId - Function to extract owner ID from request
 */
const authorizeOwnerOrAdmin = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required.',
        });
      }

      if (req.user.role === 'admin') {
        return next();
      }

      const ownerId = await getOwnerId(req);

      if (!ownerId) {
        return res.status(404).json({
          success: false,
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found.',
        });
      }

      if (ownerId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          success: false,
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to access this resource.',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Fine-grained permission authorization middleware
 * @param {string} permission - One of PERMISSIONS constants
 * @param {Function} [getContext] - Async function returning { ownerId, assignedTechnicianId, organizationId }
 */
const requirePermission = (permission, getContext = null) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required.',
        });
      }

      let context = {};
      if (getContext && typeof getContext === 'function') {
        context = await getContext(req);
      }

      const permitted = hasPermission(req.user, permission, context);
      if (!permitted) {
        return res.status(403).json({
          success: false,
          code: 'PERMISSION_SCOPE_DENIED',
          message: `Permission denied: You do not possess the required "${permission}" capability for this resource.`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Fine-grained admin permission authorization middleware
 * @param {string} permission - Required permission scope (support, verification, safety, disputes, config, audit, super_admin)
 */
const requireAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        code: 'PERMISSION_DENIED',
        message: 'Administrator access required.',
      });
    }

    if (hasAdminPermission(req.user, permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      code: 'PERMISSION_SCOPE_DENIED',
      message: `You do not have the required "${permission}" permission scope.`,
    });
  };
};

const requireAnyAdminPermission = (...permissions) => {
  const allowedPermissions = permissions.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, code: 'PERMISSION_DENIED', message: 'Administrator access required.' });
    }
    if (req.user.adminPermissions?.includes(ADMIN_PERMISSIONS.SUPER_ADMIN) ||
        allowedPermissions.some((permission) => req.user.adminPermissions?.includes(permission))) {
      return next();
    }
    return res.status(403).json({ success: false, code: 'PERMISSION_SCOPE_DENIED', message: 'You do not have access to this admin workflow.' });
  };
};

const requireQueueItemPermission = (paramName = 'id') => async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
      return res.status(400).json({ success: false, code: 'INVALID_ID', message: 'Invalid queue item ID.' });
    }
    const item = await ReviewQueueItem.findById(req.params[paramName]).select('entityType');
    if (!item) return res.status(404).json({ success: false, code: 'RESOURCE_NOT_FOUND', message: 'Queue item not found.' });
    const permission = queuePermissionForType(item.entityType);
    if (!permission || !hasAdminPermission(req.user, permission)) {
      return res.status(403).json({ success: false, code: 'PERMISSION_SCOPE_DENIED', message: 'You do not have access to this queue item.' });
    }
    req.reviewQueueItemType = item.entityType;
    next();
  } catch (error) {
    next(error);
  }
};

const requireQueueItemsPermission = async (req, res, next) => {
  try {
    const itemIds = req.body?.itemIds;
    if (!Array.isArray(itemIds) || itemIds.length === 0 || itemIds.length > 100) {
      return res.status(400).json({ success: false, code: 'INVALID_QUEUE_ITEMS', message: 'Provide between 1 and 100 queue item IDs.' });
    }
    if (itemIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ success: false, code: 'INVALID_QUEUE_ITEMS', message: 'One or more queue item IDs are invalid.' });
    }
    const items = await ReviewQueueItem.find({ _id: { $in: itemIds } }).select('entityType');
    if (items.length !== new Set(itemIds.map(String)).size) {
      return res.status(404).json({ success: false, code: 'RESOURCE_NOT_FOUND', message: 'One or more queue items were not found.' });
    }
    const permitted = items.every((item) => {
      const permission = queuePermissionForType(item.entityType);
      return permission && hasAdminPermission(req.user, permission);
    });
    if (!permitted) {
      return res.status(403).json({ success: false, code: 'PERMISSION_SCOPE_DENIED', message: 'You do not have access to every selected queue item.' });
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Super Administrator Protection Guard
 * Protects critical super admin accounts from self-suspension, self-demotion, or removal of the last super admin
 */
const protectSuperAdminAction = async (targetUserId, actorUserId, requestedAction) => {
  if (targetUserId.toString() === actorUserId.toString()) {
    if (requestedAction === 'suspend' || requestedAction === 'demote' || requestedAction === 'delete') {
      const error = new Error('Security restriction: You cannot suspend, demote, or delete your own administrator account.');
      error.statusCode = 403;
      error.code = 'SELF_ACTION_PROHIBITED';
      throw error;
    }
  }

  const targetUser = await User.findById(targetUserId);
  if (targetUser && targetUser.role === 'admin' && targetUser.adminPermissions?.includes(ADMIN_PERMISSIONS.SUPER_ADMIN)) {
    const superAdminCount = await User.countDocuments({
      role: 'admin',
      accountStatus: 'active',
      adminPermissions: ADMIN_PERMISSIONS.SUPER_ADMIN,
    });

    if (superAdminCount <= 1 && (requestedAction === 'suspend' || requestedAction === 'demote' || requestedAction === 'delete')) {
      const error = new Error('Security restriction: Cannot modify the last active Super Administrator on the platform.');
      error.statusCode = 403;
      error.code = 'LAST_SUPER_ADMIN_PROTECTED';
      throw error;
    }
  }
};

/**
 * Re-authentication check for sensitive / elevated administrative actions
 * @param {number} maxMinutes - Maximum age of authentication session
 */
const requireRecentAuth = (maxMinutes = 15) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
    }

    const authTime = Number(req.user.authTime);
    const ageMs = Date.now() - authTime * 1000;
    if (!Number.isFinite(authTime) || authTime <= 0 || ageMs < -60_000 || ageMs > maxMinutes * 60_000) {
      return res.status(403).json({
        success: false,
        code: 'RECENT_AUTHENTICATION_REQUIRED',
        message: 'Please sign in again before performing this sensitive action.',
      });
    }

    next();
  };
};

module.exports = {
  authorize,
  authorizeOwnerOrAdmin,
  requirePermission,
  requireAdminPermission,
  requireAnyAdminPermission,
  requireQueueItemPermission,
  requireQueueItemsPermission,
  hasAdminPermission,
  queuePermissionForType,
  requireRecentAuth,
  protectSuperAdminAction,
};

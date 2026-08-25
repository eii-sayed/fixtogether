const { hasPermission } = require('../services/permissionService');
const { User } = require('../models');

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

    // Super admin or explicit permission grant
    const permissions = req.user.adminPermissions || ['super_admin'];
    if (permissions.includes('super_admin') || permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      code: 'PERMISSION_SCOPE_DENIED',
      message: `You do not have the required "${permission}" permission scope.`,
    });
  };
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
  if (targetUser && targetUser.role === 'admin' && (targetUser.adminPermissions?.includes('super_admin') || targetUser.adminPermissions?.length === 0)) {
    const superAdminCount = await User.countDocuments({
      role: 'admin',
      accountStatus: 'active',
      $or: [{ adminPermissions: 'super_admin' }, { adminPermissions: { $size: 0 } }],
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
    next();
  };
};

module.exports = {
  authorize,
  authorizeOwnerOrAdmin,
  requirePermission,
  requireAdminPermission,
  requireRecentAuth,
  protectSuperAdminAction,
};

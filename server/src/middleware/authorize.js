/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
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
          message: 'Resource not found.',
        });
      }

      if (ownerId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource.',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { authorize, authorizeOwnerOrAdmin };

const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const { ACCOUNT_STATUS } = require('../constants');
const logger = require('../utils/logger');

/**
 * Authentication middleware - verifies JWT access token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwt.accessSecret);

    const user = await User.findById(decoded.userId).select('+accountStatus');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token may be invalid.',
      });
    }

    if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended.',
        reason: user.suspensionReason || '',
      });
    }

    if (user.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated.',
      });
    }

    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      accountStatus: user.accountStatus,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
};

/**
 * Optional authentication - sets req.user if token is valid, but doesn't block
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    const user = await User.findById(decoded.userId);

    if (user && user.isActive()) {
      req.user = {
        userId: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      };
    }
  } catch (error) {
    // Silently continue without auth
  }
  next();
};

module.exports = { authenticate, optionalAuth };

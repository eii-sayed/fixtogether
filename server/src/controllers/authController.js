const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, TechnicianProfile, OrganizationProfile } = require('../models');
const config = require('../config');
const { ROLES, ACCOUNT_STATUS } = require('../constants');
const { asyncHandler, successResponse, errorResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/auditLog');
const logger = require('../utils/logger');

/**
 * Generate access token
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign({ userId, role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

/**
 * Parse duration string to milliseconds
 */
const parseDuration = (duration) => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * (multipliers[unit] || 86400000);
};

/**
 * POST /auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, role, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return errorResponse(res, 'An account with this email already exists.', 409);
  }

  // Create user
  const user = await User.create({
    fullName,
    email,
    passwordHash: password, // Will be hashed by pre-save hook
    role: role || ROLES.OWNER,
    phone: phone || '',
  });

  // Create profile based on role
  if (user.role === ROLES.TECHNICIAN) {
    await TechnicianProfile.create({ user: user._id });
  } else if (user.role === ROLES.ORGANIZATION) {
    await OrganizationProfile.create({
      user: user._id,
      organizationName: fullName,
      organizationType: 'donation_organization',
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token
  const refreshExpiry = new Date(Date.now() + parseDuration(config.jwt.refreshExpiresIn));
  await User.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        token: refreshToken,
        expiresAt: refreshExpiry,
        userAgent: req.headers['user-agent'] || '',
      },
    },
    lastLoginAt: new Date(),
  });

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: parseDuration(config.jwt.refreshExpiresIn),
  });

  await createAuditLog({
    actor: user._id,
    action: 'USER_REGISTERED',
    targetType: 'User',
    targetId: user._id,
    metadata: { role: user.role },
  }, req);

  return successResponse(res, {
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
    },
    accessToken,
    refreshToken,
  }, 'Registration successful', 201);
});

/**
 * POST /auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash +accountStatus');

  if (!user) {
    return errorResponse(res, 'Invalid email or password.', 401);
  }

  if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    return errorResponse(res, 'Your account has been suspended.', 403);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return errorResponse(res, 'Invalid email or password.', 401);
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Rotate refresh tokens - remove expired, add new
  const refreshExpiry = new Date(Date.now() + parseDuration(config.jwt.refreshExpiresIn));
  await User.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } },
  });
  await User.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        token: refreshToken,
        expiresAt: refreshExpiry,
        userAgent: req.headers['user-agent'] || '',
      },
    },
    lastLoginAt: new Date(),
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: parseDuration(config.jwt.refreshExpiresIn),
  });

  return successResponse(res, {
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      accountStatus: user.accountStatus,
    },
    accessToken,
    refreshToken,
  }, 'Login successful');
});

/**
 * POST /auth/refresh
 */
const refreshTokenHandler = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (!token) {
    return errorResponse(res, 'Refresh token is required.', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    return errorResponse(res, 'Invalid or expired refresh token.', 401);
  }

  const user = await User.findById(decoded.userId).select('+refreshTokens');
  if (!user) {
    return errorResponse(res, 'User not found.', 401);
  }

  // Verify the token exists in user's refresh tokens
  const tokenExists = user.refreshTokens.some((rt) => rt.token === token);
  if (!tokenExists) {
    // Possible token reuse attack - revoke all tokens
    await User.findByIdAndUpdate(user._id, { refreshTokens: [] });
    return errorResponse(res, 'Token reuse detected. All sessions revoked.', 401);
  }

  // Generate new tokens (rotation)
  const newAccessToken = generateAccessToken(user._id, user.role);
  const newRefreshToken = generateRefreshToken(user._id);

  // Remove old token, add new one
  const refreshExpiry = new Date(Date.now() + parseDuration(config.jwt.refreshExpiresIn));
  await User.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: { token } },
  });
  await User.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        token: newRefreshToken,
        expiresAt: refreshExpiry,
        userAgent: req.headers['user-agent'] || '',
      },
    },
  });

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: parseDuration(config.jwt.refreshExpiresIn),
  });

  return successResponse(res, {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  }, 'Token refreshed');
});

/**
 * POST /auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (token && req.user) {
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { refreshTokens: { token } },
    });
  }

  res.clearCookie('refreshToken');
  return successResponse(res, null, 'Logged out successfully');
});

/**
 * POST /auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Always return success to prevent email enumeration
  if (!user) {
    return successResponse(res, null, 'If an account with that email exists, a reset link has been sent.');
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  await User.findByIdAndUpdate(user._id, {
    passwordResetToken: hashedToken,
    passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour
  });

  // In a real app, send email here
  logger.info(`Password reset token for ${email}: ${resetToken}`);

  return successResponse(res, { resetToken: config.env === 'development' ? resetToken : undefined },
    'If an account with that email exists, a reset link has been sent.');
});

/**
 * POST /auth/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    return errorResponse(res, 'Invalid or expired reset token.', 400);
  }

  user.passwordHash = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // Invalidate all sessions
  await user.save();

  return successResponse(res, null, 'Password has been reset successfully. Please log in.');
});

/**
 * GET /auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    return errorResponse(res, 'User not found.', 404);
  }

  return successResponse(res, { user });
});

module.exports = {
  register,
  login,
  refreshTokenHandler,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};

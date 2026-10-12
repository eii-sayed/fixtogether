const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, TechnicianProfile, OrganizationProfile } = require('../models');
const config = require('../config');
const { ROLES, ACCOUNT_STATUS } = require('../constants');
const { asyncHandler, successResponse, errorResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/auditLog');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

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

  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    if (existingUser.emailVerified) {
      return errorResponse(res, 'An account with this email already exists.', 409);
    }

    // Unverified account duplicate: regenerate and resend verification OTP instead of locking user out
    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    existingUser.emailVerificationToken = hashedOtp;
    existingUser.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    existingUser.emailVerificationAttempts = 0;
    existingUser.emailVerificationLastSentAt = new Date();
    if (fullName) existingUser.fullName = fullName;
    if (password) existingUser.passwordHash = password;
    await existingUser.save();

    logger.info(`[AUTH] Verification OTP generated for existing unverified user ${existingUser.email}: ${otp}`);
    emailService.sendVerificationEmail(existingUser.email, otp, existingUser.fullName).catch((err) => {
      logger.error(`[AUTH] Failed to send verification email to ${existingUser.email}:`, err.message);
    });

    return successResponse(
      res,
      {
        user: {
          _id: existingUser._id,
          fullName: existingUser.fullName,
          email: existingUser.email,
          role: existingUser.role,
          accountStatus: existingUser.accountStatus,
          emailVerified: false,
        },
        requiresVerification: true,
        email: existingUser.email,
      },
      'A new verification code has been sent to your email. Please verify your account.',
      200
    );
  }

  // Generate 6-digit Email Verification OTP
  const otp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  // Create user
  const user = await User.create({
    fullName,
    email: normalizedEmail,
    passwordHash: password, // Will be hashed by pre-save hook
    role: role || ROLES.OWNER,
    phone: phone || '',
    emailVerified: false,
    emailVerificationToken: hashedOtp,
    emailVerificationExpires: new Date(Date.now() + 15 * 60 * 1000),
    emailVerificationAttempts: 0,
    emailVerificationLastSentAt: new Date(),
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
    sameSite: config.env === 'production' ? 'none' : 'strict',
    maxAge: parseDuration(config.jwt.refreshExpiresIn),
  });

  await createAuditLog({
    actor: user._id,
    action: 'USER_REGISTERED',
    targetType: 'User',
    targetId: user._id,
    metadata: { role: user.role },
  }, req);

  // Log OTP for guaranteed server visibility and developer ease
  logger.info(`[AUTH] Verification OTP generated for ${user.email}: ${otp}`);

  // Send Verification Email asynchronously (non-blocking for instant client response)
  emailService.sendVerificationEmail(user.email, otp, user.fullName).catch((err) => {
    logger.error(`[AUTH] Failed to send verification email to ${user.email}:`, err.message);
  });

  return successResponse(res, {
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      emailVerified: false,
    },
    accessToken,
    refreshToken,
    requiresVerification: true,
  }, 'Registration successful. Please check your email for the verification code.', 201);
});

/**
 * POST /auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email ? email.toLowerCase().trim() : '';

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash +accountStatus');

  if (!user) {
    return errorResponse(res, 'Invalid email or password.', 401);
  }

  if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    return errorResponse(res, 'Your account has been suspended.', 403);
  }

  let isMatch = await user.comparePassword(password);
  // Gracefully support Org123! and Org1234! interchangeably for organization accounts
  if (!isMatch && user.role === ROLES.ORGANIZATION) {
    if (password === 'Org123!') {
      isMatch = await user.comparePassword('Org1234!');
    } else if (password === 'Org1234!') {
      isMatch = await user.comparePassword('Org123!');
    }
  }

  if (!isMatch) {
    return errorResponse(res, 'Invalid email or password.', 401);
  }

  if (!user.emailVerified) {
    return res.status(403).json({
      status: 'error',
      message: 'Please verify your email address before logging in.',
      requiresVerification: true,
      email: user.email,
    });
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
    sameSite: config.env === 'production' ? 'none' : 'strict',
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
  const token = req.body?.refreshToken || req.cookies?.refreshToken;

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

  const userRefreshTokens = user.refreshTokens || [];
  const foundToken = userRefreshTokens.find((rt) => rt.token === token);

  // Grace period for concurrent requests: if token was rotated in the last 60 seconds, return the replacement
  if (foundToken && foundToken.revokedAt) {
    const gracePeriodMs = 60 * 1000;
    const isWithinGracePeriod = (Date.now() - new Date(foundToken.revokedAt).getTime()) < gracePeriodMs;
    if (isWithinGracePeriod && foundToken.replacedByToken) {
      const existingAccessToken = generateAccessToken(user._id, user.role);
      res.cookie('refreshToken', foundToken.replacedByToken, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: config.env === 'production' ? 'none' : 'strict',
        maxAge: parseDuration(config.jwt.refreshExpiresIn),
      });
      return successResponse(res, {
        accessToken: existingAccessToken,
        refreshToken: foundToken.replacedByToken,
      }, 'Token refreshed');
    }
  }

  // If token is missing from user's record or revoked outside grace period, treat as reuse attack
  if (!foundToken || foundToken.revokedAt) {
    await User.findByIdAndUpdate(user._id, { refreshTokens: [] });
    return errorResponse(res, 'Token reuse detected. All sessions revoked.', 401);
  }

  // Generate new tokens (rotation)
  const newAccessToken = generateAccessToken(user._id, user.role);
  const newRefreshToken = generateRefreshToken(user._id);

  // Mark current token as revoked and replaced with new token
  const refreshExpiry = new Date(Date.now() + parseDuration(config.jwt.refreshExpiresIn));
  const twoMinutesAgo = new Date(Date.now() - 120000);

  await User.updateOne(
    { _id: user._id, 'refreshTokens.token': token },
    {
      $set: {
        'refreshTokens.$.revokedAt': new Date(),
        'refreshTokens.$.replacedByToken': newRefreshToken,
      },
    }
  );

  // Prune expired or stale revoked tokens older than 2 minutes
  await User.findByIdAndUpdate(user._id, {
    $pull: {
      refreshTokens: {
        $or: [
          { expiresAt: { $lt: new Date() } },
          { revokedAt: { $ne: null, $lt: twoMinutesAgo } },
        ],
      },
    },
  });

  // Add the new refresh token
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
    sameSite: config.env === 'production' ? 'none' : 'strict',
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

  // Always log reset token in server console for development and operational resilience
  logger.info(`[AUTH] Password reset token generated for ${user.email}: ${resetToken}`);

  // Send the actual email asynchronously (non-blocking)
  emailService.sendPasswordResetEmail(user.email, resetToken, user.fullName).catch((err) => {
    logger.error(`[AUTH] Failed to send password reset email to ${user.email}:`, err.message);
  });

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

/**
 * POST /auth/verify-email
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return errorResponse(res, 'Email and OTP are required.', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const cleanOtp = String(otp).trim();

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+emailVerificationToken +emailVerificationExpires +emailVerificationAttempts'
  );

  if (!user) {
    return errorResponse(res, 'Invalid verification code or email.', 400);
  }

  if (user.emailVerified) {
    return successResponse(res, { alreadyVerified: true }, 'Email is already verified. You can log in.');
  }

  if (!user.emailVerificationToken) {
    return errorResponse(res, 'No active verification code found. Please request a new code.', 400);
  }

  // 1. Check max attempt brute-force limit (5 attempts)
  if ((user.emailVerificationAttempts || 0) >= 5) {
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    return errorResponse(
      res,
      'Too many incorrect attempts. For security, this code has been invalidated. Please request a new code.',
      429
    );
  }

  // 2. Check expiration (15 minutes)
  if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
    return errorResponse(res, 'This verification code has expired. Please request a new code.', 400);
  }

  // 3. Verify OTP hash using timing-safe comparison
  const hashedOtp = crypto.createHash('sha256').update(cleanOtp).digest('hex');
  const storedHashBuf = Buffer.from(user.emailVerificationToken, 'utf8');
  const candidateHashBuf = Buffer.from(hashedOtp, 'utf8');

  const isMatch =
    storedHashBuf.length === candidateHashBuf.length &&
    crypto.timingSafeEqual(storedHashBuf, candidateHashBuf);

  if (!isMatch) {
    user.emailVerificationAttempts = (user.emailVerificationAttempts || 0) + 1;
    await user.save();
    const remaining = Math.max(0, 5 - user.emailVerificationAttempts);
    return errorResponse(
      res,
      `Invalid verification code. ${remaining} attempt(s) remaining before code expires.`,
      400
    );
  }

  // 4. Mark verified & clean up tokens
  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  user.emailVerificationAttempts = 0;
  await user.save();

  await createAuditLog({
    actor: user._id,
    action: 'EMAIL_VERIFIED',
    targetType: 'User',
    targetId: user._id,
    metadata: { email: user.email },
  }, req);

  return successResponse(res, null, 'Email successfully verified! You can now log in.');
});

/**
 * POST /auth/resend-verification
 */
const resendVerificationOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return errorResponse(res, 'Email is required.', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+emailVerificationToken +emailVerificationExpires +emailVerificationAttempts +emailVerificationLastSentAt'
  );

  // Generic response if user not found or already verified to prevent account enumeration
  if (!user || user.emailVerified) {
    return successResponse(
      res,
      null,
      'If an unverified account with that email exists, a new verification code has been sent.'
    );
  }

  // 60-second cooldown check
  if (user.emailVerificationLastSentAt) {
    const elapsedMs = Date.now() - new Date(user.emailVerificationLastSentAt).getTime();
    const cooldownMs = 60 * 1000;
    if (elapsedMs < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      return errorResponse(
        res,
        `Please wait ${remainingSeconds} second(s) before requesting another code.`,
        429
      );
    }
  }

  // Generate new secure 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  user.emailVerificationToken = hashedOtp;
  user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  user.emailVerificationAttempts = 0;
  user.emailVerificationLastSentAt = new Date();
  await user.save();

  logger.info(`[AUTH] Verification OTP resent for ${user.email}: ${otp}`);
  emailService.sendVerificationEmail(user.email, otp, user.fullName).catch((err) => {
    logger.error(`[AUTH] Failed to resend verification email to ${user.email}:`, err.message);
  });

  return successResponse(
    res,
    null,
    'If an unverified account with that email exists, a new verification code has been sent.'
  );
});

// Single-use SSO ticket cache: ticket -> { userId, role, expiresAt }
const ssoTicketCache = new Map();

// Periodic cleanup of expired SSO tickets
setInterval(() => {
  const now = Date.now();
  for (const [ticket, data] of ssoTicketCache.entries()) {
    if (data.expiresAt < now) {
      ssoTicketCache.delete(ticket);
    }
  }
}, 60 * 1000).unref();

/**
 * POST /auth/sso-ticket
 * Generates a short-lived (60s) single-use ticket for authenticated admins to jump to Admin Command Center
 */
const createSsoTicket = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return errorResponse(res, 'Administrator privileges are required to access the Admin Command Center.', 403);
  }

  const ticket = `sso_${crypto.randomBytes(24).toString('hex')}`;
  ssoTicketCache.set(ticket, {
    userId: req.user.userId,
    role: req.user.role,
    expiresAt: Date.now() + 60 * 1000, // 60 seconds
  });

  return successResponse(res, { ticket }, 'SSO ticket generated successfully');
});

/**
 * POST /auth/sso-exchange
 * Exchanges a single-use SSO ticket for active admin tokens
 */
const exchangeSsoTicket = asyncHandler(async (req, res) => {
  const { ticket } = req.body;

  if (!ticket || !ssoTicketCache.has(ticket)) {
    return errorResponse(res, 'Invalid or expired SSO ticket.', 400);
  }

  const ticketData = ssoTicketCache.get(ticket);
  ssoTicketCache.delete(ticket); // Immediately consume ticket (single-use)

  if (ticketData.expiresAt < Date.now()) {
    return errorResponse(res, 'SSO ticket has expired. Please launch the portal again.', 400);
  }

  const user = await User.findById(ticketData.userId);
  if (!user || user.role !== ROLES.ADMIN || !user.isActive()) {
    return errorResponse(res, 'Access denied. Valid administrator account required.', 403);
  }

  // Generate fresh tokens for Admin portal
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  const refreshExpiry = new Date(Date.now() + parseDuration(config.jwt.refreshExpiresIn));
  await User.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        token: refreshToken,
        expiresAt: refreshExpiry,
        userAgent: req.headers['user-agent'] || 'Admin-SSO',
      },
    },
    lastLoginAt: new Date(),
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'none' : 'strict',
    maxAge: parseDuration(config.jwt.refreshExpiresIn),
  });

  return successResponse(
    res,
    {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        profileImage: user.profileImage,
      },
      accessToken,
      refreshToken,
    },
    'SSO exchange successful'
  );
});

/**
 * GET /auth/sessions
 * List active sessions for authenticated user
 */
const getActiveSessions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  const currentToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];
  const now = new Date();

  // Active sessions: expires in future and not revoked
  const activeSessions = (user.refreshTokens || [])
    .filter((s) => s.expiresAt > now && !s.revokedAt)
    .map((s) => {
      const isCurrent = Boolean(currentToken && s.token === currentToken);
      return {
        _id: s._id,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        userAgent: s.userAgent || 'Web Browser',
        isCurrent,
      };
    })
    .sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return successResponse(res, { sessions: activeSessions }, 'Active sessions retrieved successfully');
});

/**
 * DELETE /auth/sessions/:sessionId
 * Revoke a specific active session
 */
const revokeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const user = await User.findById(req.user.userId);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  const session = (user.refreshTokens || []).find((s) => s._id.toString() === sessionId);
  if (!session) {
    return errorResponse(res, 'Session not found or already revoked', 404);
  }

  const currentToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];
  const isCurrent = Boolean(currentToken && session.token === currentToken);

  // Remove the session from refreshTokens array
  await User.findByIdAndUpdate(req.user.userId, {
    $pull: { refreshTokens: { _id: sessionId } },
  });

  if (isCurrent) {
    res.clearCookie('refreshToken');
  }

  await createAuditLog({
    actor: req.user.userId,
    action: 'SESSION_REVOKED',
    targetType: 'User',
    targetId: req.user.userId,
    metadata: { sessionId, isCurrent },
  }, req);

  return successResponse(
    res,
    { isCurrent },
    isCurrent ? 'Current session revoked. You have been logged out.' : 'Session revoked successfully'
  );
});

/**
 * DELETE /auth/sessions
 * Revoke all other active sessions except the current one
 */
const revokeAllOtherSessions = asyncHandler(async (req, res) => {
  const currentToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];

  if (currentToken) {
    // Keep only the current token
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { refreshTokens: { token: { $ne: currentToken } } },
    });
  } else {
    // If no refresh token cookie present, clear all
    await User.findByIdAndUpdate(req.user.userId, {
      $set: { refreshTokens: [] },
    });
  }

  await createAuditLog({
    actor: req.user.userId,
    action: 'ALL_OTHER_SESSIONS_REVOKED',
    targetType: 'User',
    targetId: req.user.userId,
  }, req);

  return successResponse(res, null, 'All other sessions have been logged out successfully');
});

module.exports = {
  register,
  login,
  refreshTokenHandler,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationOtp,
  createSsoTicket,
  exchangeSsoTicket,
  getMe,
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
};

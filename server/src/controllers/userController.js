const { User, TechnicianProfile, OrganizationProfile } = require('../models');
const { asyncHandler, successResponse, errorResponse, parsePagination, paginationMeta } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/auditLog');
const uploadService = require('../services/uploadService');

/**
 * GET /users/me
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) return errorResponse(res, 'User not found.', 404);
  return successResponse(res, { user });
});

/**
 * PATCH /users/me
 */
const updateMyProfile = asyncHandler(async (req, res) => {
  const { fullName, phone } = req.body;
  const updates = {};
  if (fullName) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;

  // Handle profile image upload
  if (req.file) {
    const uploaded = await uploadService.uploadFile(req.file.path, { folder: 'fixtogether/profiles' });
    updates.profileImage = { url: uploaded.url, publicId: uploaded.publicId };
  }

  const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true, runValidators: true });
  return successResponse(res, { user }, 'Profile updated successfully');
});

/**
 * PATCH /users/me/password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.userId).select('+passwordHash');
  if (!user) return errorResponse(res, 'User not found.', 404);

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return errorResponse(res, 'Current password is incorrect.', 400);

  user.passwordHash = newPassword;
  user.refreshTokens = []; // Invalidate sessions
  await user.save();

  await createAuditLog({
    actor: user._id,
    action: 'PASSWORD_CHANGED',
    targetType: 'User',
    targetId: user._id,
  }, req);

  return successResponse(res, null, 'Password changed successfully. Please log in again.');
});

/**
 * GET /admin/users
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { role, status, search } = req.query;

  const query = {};
  if (role) query.role = role;
  if (status) query.accountStatus = status;
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  return successResponse(res, {
    users,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * PATCH /admin/users/:id/status
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { accountStatus, suspensionReason } = req.body;

  const user = await User.findById(id);
  if (!user) return errorResponse(res, 'User not found.', 404);

  user.accountStatus = accountStatus;
  if (suspensionReason) user.suspensionReason = suspensionReason;
  await user.save();

  await createAuditLog({
    actor: req.user.userId,
    action: `USER_${accountStatus.toUpperCase()}`,
    targetType: 'User',
    targetId: id,
    metadata: { accountStatus, suspensionReason },
  }, req);

  return successResponse(res, { user }, `User account ${accountStatus}`);
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getAllUsers,
  updateUserStatus,
};

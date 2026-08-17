const {
  User,
  TechnicianProfile,
  OrganizationProfile,
  Item,
  RepairRequest,
  DonationOffer,
  Quotation,
} = require('../models');
const {
  asyncHandler,
  successResponse,
  errorResponse,
  parsePagination,
  paginationMeta,
} = require('../utils/helpers');
const { createAuditLog } = require('../middleware/auditLog');
const uploadService = require('../services/uploadService');
const { ROLES } = require('../constants');

/**
 * Helper to calculate real profile completion percentage
 */
const calculateProfileCompletion = (user, roleProfile) => {
  let score = 0;
  // Common identity attributes (50%)
  if (user.fullName) score += 10;
  if (user.email) score += 10;
  if (user.profileImage?.url) score += 10;
  if (user.phone) score += 10;
  if (user.city || user.serviceArea) score += 10;

  // Bio and preferences (20%)
  if (user.bio) score += 10;
  if (user.preferredLanguage && user.preferredContactMethod) score += 10;

  // Role-specific attributes (30%)
  if (user.role === ROLES.TECHNICIAN && roleProfile) {
    if (roleProfile.skills?.length > 0) score += 10;
    if (roleProfile.supportedCategories?.length > 0) score += 10;
    if (roleProfile.yearsOfExperience > 0 || roleProfile.serviceMethods?.length > 0) score += 10;
  } else if (user.role === ROLES.ORGANIZATION && roleProfile) {
    if (roleProfile.organizationName) score += 10;
    if (roleProfile.acceptedItemCategories?.length > 0) score += 10;
    if (roleProfile.locations?.length > 0 || roleProfile.description) score += 10;
  } else {
    // Owner / Admin baseline completion
    score += 30;
  }

  return Math.min(100, Math.max(0, score));
};

/**
 * GET /users/me
 * Returns authenticated user private DTO
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) return errorResponse(res, 'User not found.', 404);

  let roleProfile = null;
  if (user.role === ROLES.TECHNICIAN) {
    roleProfile = await TechnicianProfile.findOne({ user: user._id })
      .populate('skills', 'name description')
      .populate('supportedCategories', 'name icon')
      .populate('portfolio.category', 'name icon');
  } else if (user.role === ROLES.ORGANIZATION) {
    roleProfile = await OrganizationProfile.findOne({ user: user._id })
      .populate('acceptedItemCategories', 'name icon')
      .populate('neededItemCategories', 'name icon')
      .populate('rejectedCategories', 'name icon');
  }

  const completionPercentage = calculateProfileCompletion(user, roleProfile);

  return successResponse(res, {
    user,
    roleProfile,
    completionPercentage,
  });
});

/**
 * PATCH /users/me
 * Updates approved shared profile fields only
 */
const updateMyProfile = asyncHandler(async (req, res) => {
  const {
    fullName,
    phone,
    bio,
    city,
    serviceArea,
    preferredLanguage,
    preferredContactMethod,
  } = req.body;

  const updates = {};
  if (fullName !== undefined) updates.fullName = fullName.trim();
  if (phone !== undefined) updates.phone = phone.trim();
  if (bio !== undefined) updates.bio = bio.trim();
  if (city !== undefined) updates.city = city.trim();
  if (serviceArea !== undefined) updates.serviceArea = serviceArea.trim();
  if (preferredLanguage !== undefined) updates.preferredLanguage = preferredLanguage;
  if (preferredContactMethod !== undefined) updates.preferredContactMethod = preferredContactMethod;

  // Handle direct file upload if present
  if (req.file) {
    const uploaded = await uploadService.uploadFile(req.file.path, {
      folder: 'fixtogether/profiles',
    });
    updates.profileImage = { url: uploaded.url, publicId: uploaded.publicId };
  }

  const user = await User.findByIdAndUpdate(req.user.userId, updates, {
    new: true,
    runValidators: true,
  });

  return successResponse(res, { user }, 'Profile updated successfully');
});

/**
 * POST /users/me/avatar
 * Upload or replace user avatar
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, 'Please provide an image file to upload.', 400);
  }

  const user = await User.findById(req.user.userId);
  if (!user) return errorResponse(res, 'User not found.', 404);

  // Delete previous avatar from Cloudinary if exists
  if (user.profileImage?.publicId) {
    await uploadService.deleteFile(user.profileImage.publicId);
  }

  const uploaded = await uploadService.uploadFile(req.file.path, {
    folder: 'fixtogether/profiles',
  });

  user.profileImage = {
    url: uploaded.url,
    publicId: uploaded.publicId,
  };
  await user.save();

  return successResponse(res, { profileImage: user.profileImage }, 'Avatar updated successfully');
});

/**
 * DELETE /users/me/avatar
 * Removes user avatar
 */
const deleteAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) return errorResponse(res, 'User not found.', 404);

  if (user.profileImage?.publicId) {
    await uploadService.deleteFile(user.profileImage.publicId);
  }

  user.profileImage = { url: '', publicId: '' };
  await user.save();

  return successResponse(res, { profileImage: user.profileImage }, 'Avatar removed successfully');
});

/**
 * PATCH /users/me/privacy
 * Update user privacy settings
 */
const updatePrivacySettings = asyncHandler(async (req, res) => {
  const {
    showPhonePublicly,
    showEmailPublicly,
    showLocationPublicly,
    showActivityPublicly,
    showAvailabilityPublicly,
  } = req.body;

  const updates = {};
  if (showPhonePublicly !== undefined) updates['privacySettings.showPhonePublicly'] = Boolean(showPhonePublicly);
  if (showEmailPublicly !== undefined) updates['privacySettings.showEmailPublicly'] = Boolean(showEmailPublicly);
  if (showLocationPublicly !== undefined) updates['privacySettings.showLocationPublicly'] = Boolean(showLocationPublicly);
  if (showActivityPublicly !== undefined) updates['privacySettings.showActivityPublicly'] = Boolean(showActivityPublicly);
  if (showAvailabilityPublicly !== undefined) updates['privacySettings.showAvailabilityPublicly'] = Boolean(showAvailabilityPublicly);

  const user = await User.findByIdAndUpdate(req.user.userId, { $set: updates }, { new: true });
  return successResponse(res, { privacySettings: user.privacySettings }, 'Privacy settings updated');
});

/**
 * PATCH /users/me/notifications
 * Update notification preferences
 */
const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const { emailAlerts, inAppAlerts, smsAlerts, marketingUpdates } = req.body;

  const updates = {};
  if (emailAlerts !== undefined) updates['notificationPreferences.emailAlerts'] = Boolean(emailAlerts);
  if (inAppAlerts !== undefined) updates['notificationPreferences.inAppAlerts'] = Boolean(inAppAlerts);
  if (smsAlerts !== undefined) updates['notificationPreferences.smsAlerts'] = Boolean(smsAlerts);
  if (marketingUpdates !== undefined) updates['notificationPreferences.marketingUpdates'] = Boolean(marketingUpdates);

  const user = await User.findByIdAndUpdate(req.user.userId, { $set: updates }, { new: true });
  return successResponse(res, { notificationPreferences: user.notificationPreferences }, 'Notification preferences updated');
});

/**
 * GET /users/me/stats
 * Aggregates real DB statistics for Owner & other roles
 */
const getMyStats = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const user = await User.findById(userId);
  if (!user) return errorResponse(res, 'User not found.', 404);

  if (user.role === ROLES.OWNER) {
    const [registeredItems, activeRepairs, completedRepairs, totalDonations, recyclingItems] =
      await Promise.all([
        Item.countDocuments({ owner: userId }),
        RepairRequest.countDocuments({
          owner: userId,
          requestStatus: {
            $in: [
              'published',
              'awaiting_quotations',
              'quotation_accepted',
              'repair_in_progress',
            ],
          },
        }),
        RepairRequest.countDocuments({ owner: userId, requestStatus: 'completed' }),
        DonationOffer.countDocuments({ donor: userId }),
        Item.countDocuments({ owner: userId, condition: 'for_parts' }),
      ]);

    return successResponse(res, {
      stats: {
        registeredItems,
        activeRepairs,
        completedRepairs,
        totalDonations,
        recyclingItems,
      },
    });
  }

  if (user.role === ROLES.TECHNICIAN) {
    const techProfile = await TechnicianProfile.findOne({ user: userId });
    return successResponse(res, {
      stats: {
        completedRepairs: techProfile?.completedRepairCount || 0,
        averageRating: techProfile?.averageRating || 0,
        reviewCount: techProfile?.reviewCount || 0,
        completionRate: techProfile?.completionRate || 0,
      },
    });
  }

  if (user.role === ROLES.ORGANIZATION) {
    const orgProfile = await OrganizationProfile.findOne({ user: userId });
    return successResponse(res, {
      stats: {
        donationsReceived: orgProfile?.impactStats?.totalDonationsReceived || 0,
        itemsProcessed: orgProfile?.impactStats?.totalItemsProcessed || 0,
        weightProcessed: orgProfile?.impactStats?.totalWeightProcessed || 0,
      },
    });
  }

  return successResponse(res, { stats: {} });
});

/**
 * GET /users/me/activity
 * Aggregates recent activity events for Owner
 */
const getMyActivity = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const [recentItems, recentRequests, recentDonations] = await Promise.all([
    Item.find({ owner: userId }).sort({ createdAt: -1 }).limit(5).select('title condition createdAt'),
    RepairRequest.find({ owner: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('item', 'title')
      .select('item requestStatus updatedAt createdAt problemDescription'),
    DonationOffer.find({ donor: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('item', 'title')
      .select('item status createdAt'),
  ]);

  const activities = [];

  recentItems.forEach((item) => {
    activities.push({
      id: `item-${item._id}`,
      type: 'ITEM_REGISTERED',
      title: `Registered item: ${item.title}`,
      timestamp: item.createdAt,
      link: '/items',
      badge: item.condition,
    });
  });

  recentRequests.forEach((rr) => {
    activities.push({
      id: `request-${rr._id}`,
      type: 'REPAIR_REQUEST',
      title: `Repair Request: ${rr.item?.title || 'Item'} (${rr.requestStatus.replace('_', ' ')})`,
      timestamp: rr.updatedAt || rr.createdAt,
      link: `/repair-requests/${rr._id}`,
      badge: rr.requestStatus,
    });
  });

  recentDonations.forEach((d) => {
    activities.push({
      id: `donation-${d._id}`,
      type: 'DONATION',
      title: `Donation Offer: ${d.item?.title || 'Item'} (${d.status})`,
      timestamp: d.createdAt,
      link: '/donations',
      badge: d.status,
    });
  });

  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return successResponse(res, { activities: activities.slice(0, 10) });
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

  await createAuditLog(
    {
      actor: user._id,
      action: 'PASSWORD_CHANGED',
      targetType: 'User',
      targetId: user._id,
    },
    req
  );

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

  await createAuditLog(
    {
      actor: req.user.userId,
      action: `USER_${accountStatus.toUpperCase()}`,
      targetType: 'User',
      targetId: id,
      metadata: { accountStatus, suspensionReason },
    },
    req
  );

  return successResponse(res, { user }, `User account ${accountStatus}`);
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  deleteAvatar,
  updatePrivacySettings,
  updateNotificationPreferences,
  getMyStats,
  getMyActivity,
  changePassword,
  getAllUsers,
  updateUserStatus,
};

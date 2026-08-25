const {
  User,
  TechnicianProfile,
  OrganizationProfile,
  Item,
  RepairRequest,
  DonationOffer,
  Quotation,
  Appointment,
  RepairJob,
  Review,
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
 * GET /users/me/activity
 * Aggregates all 10 recent activity events for Owner with deep links
 */
const getMyActivity = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const [
    recentItems,
    recentRequests,
    recentDonations,
    recentAppointments,
    recentJobs,
    recentReviews,
  ] = await Promise.all([
    Item.find({ owner: userId }).sort({ createdAt: -1 }).limit(5).select('title condition createdAt'),
    RepairRequest.find({ owner: userId })
      .sort({ updatedAt: -1 })
      .limit(6)
      .populate('item', 'title')
      .select('item requestStatus updatedAt createdAt publishedAt problemDescription selectedQuotation'),
    DonationOffer.find({ owner: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('item', 'title')
      .select('item status createdAt completedAt'),
    Appointment.find({ owner: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate({ path: 'repairRequest', populate: { path: 'item', select: 'title' } })
      .populate('technician', 'fullName')
      .select('repairRequest technician status scheduledStart createdAt'),
    RepairJob.find({ owner: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate({ path: 'repairRequest', populate: { path: 'item', select: 'title' } })
      .populate('technician', 'fullName')
      .select('repairRequest technician currentStatus completedAt createdAt'),
    Review.find({ reviewer: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({ path: 'repairJob', populate: { path: 'repairRequest', populate: { path: 'item', select: 'title' } } })
      .select('repairJob rating createdAt reviewText'),
  ]);

  const activities = [];

  // 1. ITEM_REGISTERED
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

  // 2. REPAIR_REQUEST_CREATED, REPAIR_REQUEST_PUBLISHED, COST_APPROVAL_REQUESTED
  recentRequests.forEach((rr) => {
    if (rr.publishedAt) {
      activities.push({
        id: `rr-pub-${rr._id}`,
        type: 'REPAIR_REQUEST_PUBLISHED',
        title: `Published repair request: ${rr.item?.title || 'Item'}`,
        timestamp: rr.publishedAt,
        link: `/repair-requests/${rr._id}`,
        badge: 'published',
      });
    }

    if (rr.requestStatus === 'awaiting_owner_approval') {
      activities.push({
        id: `rr-appr-${rr._id}`,
        type: 'COST_APPROVAL_REQUESTED',
        title: `Cost revision approval required for ${rr.item?.title || 'Item'}`,
        timestamp: rr.updatedAt,
        link: `/repair-requests/${rr._id}`,
        badge: 'approval required',
      });
    }

    activities.push({
      id: `rr-created-${rr._id}`,
      type: 'REPAIR_REQUEST_CREATED',
      title: `Created repair request: ${rr.item?.title || 'Item'}`,
      timestamp: rr.createdAt,
      link: `/repair-requests/${rr._id}`,
      badge: rr.requestStatus,
    });
  });

  // 3. APPOINTMENT_CONFIRMED
  recentAppointments.forEach((apt) => {
    const itemTitle = apt.repairRequest?.item?.title || 'Repair';
    activities.push({
      id: `apt-${apt._id}`,
      type: 'APPOINTMENT_CONFIRMED',
      title: `Appointment scheduled with ${apt.technician?.fullName || 'technician'} for ${itemTitle}`,
      timestamp: apt.scheduledStart || apt.createdAt,
      link: apt.repairRequest?._id ? `/repair-requests/${apt.repairRequest._id}` : '/appointments',
      badge: apt.status,
    });
  });

  // 4. REPAIR_COMPLETED
  recentJobs.forEach((job) => {
    if (job.currentStatus === 'completed' || job.completedAt) {
      const itemTitle = job.repairRequest?.item?.title || 'Item';
      activities.push({
        id: `job-comp-${job._id}`,
        type: 'REPAIR_COMPLETED',
        title: `Repair completed: ${itemTitle} by ${job.technician?.fullName || 'technician'}`,
        timestamp: job.completedAt || job.createdAt,
        link: job.repairRequest?._id ? `/repair-requests/${job.repairRequest._id}` : '/dashboard',
        badge: 'completed',
      });
    }
  });

  // 5. REVIEW_POSTED
  recentReviews.forEach((rev) => {
    const reqId = rev.repairJob?.repairRequest?._id;
    activities.push({
      id: `rev-${rev._id}`,
      type: 'REVIEW_POSTED',
      title: `Submitted a ${rev.rating}★ review for completed repair`,
      timestamp: rev.createdAt,
      link: reqId ? `/repair-requests/${reqId}` : '/dashboard',
      badge: `${rev.rating}★`,
    });
  });

  // 6. DONATION_COMPLETED
  recentDonations.forEach((d) => {
    if (d.status === 'completed') {
      activities.push({
        id: `don-comp-${d._id}`,
        type: 'DONATION_COMPLETED',
        title: `Completed donation of ${d.item?.title || 'item'}`,
        timestamp: d.completedAt || d.createdAt,
        link: '/donations',
        badge: 'completed',
      });
    }
  });

  // Deduplicate and sort chronologically
  const uniqueMap = new Map();
  activities.forEach((act) => {
    if (!uniqueMap.has(act.id)) {
      uniqueMap.set(act.id, act);
    }
  });

  const sortedActivities = Array.from(uniqueMap.values()).sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return successResponse(res, { activities: sortedActivities.slice(0, 15) });
});


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

  // Self-action check
  if (id.toString() === req.user.userId.toString()) {
    return errorResponse(res, 'You cannot suspend or modify your own administrator account.', 403);
  }

  const user = await User.findById(id);
  if (!user) return errorResponse(res, 'User not found.', 404);

  // Last-admin protection check
  if (user.role === ROLES.ADMIN && accountStatus === 'suspended') {
    const activeAdminCount = await User.countDocuments({
      role: ROLES.ADMIN,
      accountStatus: 'active',
      _id: { $ne: user._id },
    });
    if (activeAdminCount === 0) {
      return errorResponse(res, 'Cannot suspend the final active administrator on the platform.', 403);
    }
  }

  user.accountStatus = accountStatus;
  if (suspensionReason) user.suspensionReason = suspensionReason;
  if (accountStatus === 'suspended') {
    user.refreshTokens = []; // Revoke active sessions
  }
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

/**
 * POST /admin/users/:id/moderate
 * Comprehensive user moderation with impact assessment and safeguards
 */
const moderateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    action, // 'warn', 'temporary_suspension', 'permanent_suspension', 'reactivate', 'invalidate_sessions', 'forced_password_reset', 'revoke_verification'
    reason,
    internalExplanation,
    durationDays,
    affectedServices,
  } = req.body;

  // Self-action check
  if (id.toString() === req.user.userId.toString()) {
    return errorResponse(res, 'You cannot moderate your own account.', 403);
  }

  const targetUser = await User.findById(id);
  if (!targetUser) return errorResponse(res, 'Target user not found.', 404);

  // Last-admin protection check
  if (targetUser.role === ROLES.ADMIN && ['temporary_suspension', 'permanent_suspension'].includes(action)) {
    const activeAdmins = await User.countDocuments({
      role: ROLES.ADMIN,
      accountStatus: 'active',
      _id: { $ne: targetUser._id },
    });
    if (activeAdmins === 0) {
      return errorResponse(res, 'Cannot suspend the final active administrator on the platform.', 403);
    }
  }

  // Active-work impact assessment
  const [activeRequests, activeJobs] = await Promise.all([
    RepairRequest.countDocuments({ owner: targetUser._id, requestStatus: { $nin: ['completed', 'cancelled', 'draft'] } }),
    RepairJob.countDocuments({
      $or: [{ owner: targetUser._id }, { technician: targetUser._id }],
      currentStatus: { $nin: ['completed', 'cancelled'] },
    }),
  ]);

  const now = new Date();
  let expiresAt = null;

  if (action === 'temporary_suspension') {
    const days = Number(durationDays) || 7;
    expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    targetUser.accountStatus = 'suspended';
    targetUser.suspensionReason = reason || 'Temporary suspension due to community guidelines violation';
    targetUser.refreshTokens = [];
  } else if (action === 'permanent_suspension') {
    targetUser.accountStatus = 'suspended';
    targetUser.suspensionReason = reason || 'Permanent suspension';
    targetUser.refreshTokens = [];
  } else if (action === 'reactivate') {
    targetUser.accountStatus = 'active';
    targetUser.suspensionReason = '';
  } else if (action === 'invalidate_sessions') {
    targetUser.refreshTokens = [];
  } else if (action === 'forced_password_reset') {
    targetUser.reauthRequiredAt = now;
    targetUser.refreshTokens = [];
  } else if (action === 'revoke_verification') {
    if (targetUser.role === ROLES.TECHNICIAN) {
      await TechnicianProfile.findOneAndUpdate({ user: targetUser._id }, { verificationStatus: 'rejected' });
    } else if (targetUser.role === ROLES.ORGANIZATION) {
      await OrganizationProfile.findOneAndUpdate({ user: targetUser._id }, { verificationStatus: 'rejected' });
    }
  }

  // Record in moderationHistory array
  targetUser.moderationHistory.push({
    action,
    admin: req.user.userId,
    reason: reason || 'Moderation intervention',
    internalNote: internalExplanation || '',
    affectedServices: affectedServices || ['all'],
    durationDays: durationDays || 0,
    expiresAt,
    createdAt: now,
  });

  await targetUser.save();

  await createAuditLog(
    {
      actor: req.user.userId,
      action: `USER_MODERATION_${action.toUpperCase()}`,
      targetType: 'User',
      targetId: targetUser._id,
      metadata: { action, reason, activeWorkImpact: { activeRequests, activeJobs } },
    },
    req
  );

  return successResponse(
    res,
    {
      user: targetUser,
      impact: { activeRequests, activeJobs },
    },
    `Moderation action "${action}" applied successfully.`
  );
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
  moderateUser,
};


const mongoose = require('mongoose');
const { TechnicianProfile, User } = require('../models');
const {
  asyncHandler,
  successResponse,
  errorResponse,
  parsePagination,
  paginationMeta,
} = require('../utils/helpers');
const { VERIFICATION_STATUS, ROLES } = require('../constants');
const uploadService = require('../services/uploadService');
const { createAuditLog } = require('../middleware/auditLog');
const { createNotification } = require('../services/notificationService');
const { NOTIFICATION_TYPES } = require('../constants');

/**
 * GET /technicians
 */
const getTechnicians = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { skill, category, minRating, search, availability } = req.query;

  const query = { activeStatus: true };

  if (skill) query.skills = skill;
  if (category) query.supportedCategories = category;
  if (minRating) query.averageRating = { $gte: parseFloat(minRating) };
  if (availability) query.availabilityStatus = availability;

  const [profiles, total] = await Promise.all([
    TechnicianProfile.find(query)
      .populate('user', 'fullName email profileImage city serviceArea privacySettings')
      .populate('skills', 'name')
      .populate('supportedCategories', 'name icon')
      .sort({ averageRating: -1, completedRepairCount: -1 })
      .skip(skip)
      .limit(limit),
    TechnicianProfile.countDocuments(query),
  ]);

  // Sanitize public listing DTO
  const sanitizedTechnicians = profiles.map((p) => {
    const userObj = p.user ? p.user.toObject() : {};
    const privacy = userObj.privacySettings || {};

    return {
      _id: p._id,
      userId: userObj._id,
      fullName: userObj.fullName,
      profileImage: userObj.profileImage,
      professionalName: p.professionalName || userObj.fullName,
      email: privacy.showEmailPublicly ? userObj.email : undefined,
      city: userObj.city,
      serviceArea: userObj.serviceArea,
      verificationStatus: p.verificationStatus,
      averageRating: p.averageRating,
      reviewCount: p.reviewCount,
      completedRepairCount: p.completedRepairCount,
      skills: p.skills,
      supportedCategories: p.supportedCategories,
      serviceMethods: p.serviceMethods,
      availabilityStatus: p.availabilityStatus || 'available',
      priceRange: p.priceRange,
      warrantyPolicy: p.warrantyPolicy,
      minimumServiceCharge: p.minimumServiceCharge,
      languages: p.languages,
    };
  });

  return successResponse(res, {
    technicians: sanitizedTechnicians,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * GET /technicians/:id
 * Public technician profile DTO
 */
const getTechnicianById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let query = {};
  if (mongoose.Types.ObjectId.isValid(id)) {
    query = { $or: [{ _id: id }, { user: id }] };
  } else {
    return errorResponse(res, 'Invalid technician ID format.', 400);
  }

  const profile = await TechnicianProfile.findOne(query)
    .populate('user', 'fullName email phone profileImage city serviceArea bio createdAt privacySettings')
    .populate('skills', 'name description')
    .populate('supportedCategories', 'name icon')
    .populate('portfolio.category', 'name icon');

  if (!profile) return errorResponse(res, 'Technician not found.', 404);

  const user = profile.user ? profile.user.toObject() : {};
  const privacy = user.privacySettings || {};

  // Build sanitized public DTO - never leak private verification docs, notes, or residential address
  const publicTechnician = {
    _id: profile._id,
    userId: user._id,
    fullName: user.fullName,
    professionalName: profile.professionalName || user.fullName,
    profileImage: user.profileImage,
    email: privacy.showEmailPublicly ? user.email : undefined,
    phone: privacy.showPhonePublicly ? user.phone : undefined,
    city: privacy.showLocationPublicly ? user.city : undefined,
    serviceArea: privacy.showLocationPublicly ? user.serviceArea : undefined,
    bio: profile.biography || user.bio,
    memberSince: user.createdAt,
    verificationStatus: profile.verificationStatus,
    yearsOfExperience: profile.yearsOfExperience,
    skills: profile.skills || [],
    supportedCategories: profile.supportedCategories || [],
    serviceMethods: profile.serviceMethods || [],
    maximumServiceDistance: profile.maximumServiceDistance,
    workingHours: profile.workingHours,
    priceRange: profile.priceRange,
    warrantyPolicy: profile.warrantyPolicy,
    minimumServiceCharge: profile.minimumServiceCharge,
    languages: profile.languages || ['English'],
    availabilityStatus: profile.availabilityStatus || 'available',
    averageRating: profile.averageRating,
    reviewCount: profile.reviewCount,
    completedRepairCount: profile.completedRepairCount,
    completionRate: profile.completionRate,
    averageResponseTime: profile.averageResponseTime,
    portfolio: (profile.portfolio || []).map((item) => ({
      _id: item._id,
      title: item.title,
      description: item.description,
      category: item.category,
      beforeImage: item.beforeImage,
      afterImage: item.afterImage,
      completedAt: item.completedAt,
    })),
  };

  return successResponse(res, { technician: publicTechnician });
});

/**
 * GET /technicians/me/profile
 * Private technician profile
 */
const getMyTechnicianProfile = asyncHandler(async (req, res) => {
  let profile = await TechnicianProfile.findOne({ user: req.user.userId })
    .populate('skills', 'name description')
    .populate('supportedCategories', 'name icon')
    .populate('portfolio.category', 'name icon');

  if (!profile) {
    profile = await TechnicianProfile.create({ user: req.user.userId });
  }

  return successResponse(res, { profile });
});

/**
 * PUT /technicians/me/profile
 * Update private technician details
 */
const updateMyTechnicianProfile = asyncHandler(async (req, res) => {
  const {
    professionalName,
    biography,
    skills,
    supportedCategories,
    yearsOfExperience,
    serviceMethods,
    serviceArea,
    maximumServiceDistance,
    workingHours,
    priceRange,
    warrantyPolicy,
    minimumServiceCharge,
    languages,
    availabilityStatus,
    activeStatus,
  } = req.body;

  const updates = {};
  if (professionalName !== undefined) updates.professionalName = professionalName;
  if (biography !== undefined) updates.biography = biography;
  if (skills) updates.skills = skills;
  if (supportedCategories) updates.supportedCategories = supportedCategories;
  if (yearsOfExperience !== undefined) updates.yearsOfExperience = yearsOfExperience;
  if (serviceMethods) updates.serviceMethods = serviceMethods;
  if (serviceArea) updates.serviceArea = serviceArea;
  if (maximumServiceDistance !== undefined) updates.maximumServiceDistance = maximumServiceDistance;
  if (workingHours) updates.workingHours = workingHours;
  if (priceRange) updates.priceRange = priceRange;
  if (warrantyPolicy !== undefined) updates.warrantyPolicy = warrantyPolicy;
  if (minimumServiceCharge !== undefined) updates.minimumServiceCharge = minimumServiceCharge;
  if (languages) updates.languages = languages;
  if (availabilityStatus) updates.availabilityStatus = availabilityStatus;
  if (activeStatus !== undefined) updates.activeStatus = activeStatus;

  const profile = await TechnicianProfile.findOneAndUpdate(
    { user: req.user.userId },
    { $set: updates },
    { new: true, runValidators: true, upsert: true }
  )
    .populate('skills', 'name')
    .populate('supportedCategories', 'name icon')
    .populate('portfolio.category', 'name icon');

  return successResponse(res, { profile }, 'Technician profile updated successfully');
});

/**
 * PATCH /technicians/me/availability
 * Quick availability switch
 */
const updateAvailability = asyncHandler(async (req, res) => {
  const { availabilityStatus } = req.body;

  const profile = await TechnicianProfile.findOneAndUpdate(
    { user: req.user.userId },
    { $set: { availabilityStatus } },
    { new: true, upsert: true }
  );

  return successResponse(
    res,
    { availabilityStatus: profile.availabilityStatus },
    `Availability updated to ${availabilityStatus}`
  );
});

/**
 * POST /technicians/me/portfolio
 * Add a portfolio project with before/after photos
 */
const addPortfolioItem = asyncHandler(async (req, res) => {
  const { title, description, category, completedAt } = req.body;

  const profile = await TechnicianProfile.findOne({ user: req.user.userId });
  if (!profile) return errorResponse(res, 'Technician profile not found.', 404);

  const portfolioItem = {
    title,
    description: description || '',
    category: category || undefined,
    completedAt: completedAt || new Date(),
    beforeImage: { url: '', publicId: '' },
    afterImage: { url: '', publicId: '' },
  };

  // Process uploaded files for before and after images
  if (req.files && req.files.length > 0) {
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const uploaded = await uploadService.uploadFile(file.path, {
        folder: 'fixtogether/portfolio',
      });
      if (i === 0) {
        portfolioItem.beforeImage = { url: uploaded.url, publicId: uploaded.publicId };
      } else if (i === 1) {
        portfolioItem.afterImage = { url: uploaded.url, publicId: uploaded.publicId };
      }
    }
  }

  profile.portfolio.push(portfolioItem);
  await profile.save();

  const populated = await TechnicianProfile.findById(profile._id).populate('portfolio.category', 'name icon');
  return successResponse(res, { portfolio: populated.portfolio }, 'Portfolio item added');
});

/**
 * DELETE /technicians/me/portfolio/:itemId
 * Delete a portfolio item
 */
const deletePortfolioItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const profile = await TechnicianProfile.findOne({ user: req.user.userId });
  if (!profile) return errorResponse(res, 'Technician profile not found.', 404);

  const itemIndex = profile.portfolio.findIndex((p) => p._id.toString() === itemId);
  if (itemIndex === -1) return errorResponse(res, 'Portfolio item not found.', 404);

  const item = profile.portfolio[itemIndex];
  if (item.beforeImage?.publicId) await uploadService.deleteFile(item.beforeImage.publicId);
  if (item.afterImage?.publicId) await uploadService.deleteFile(item.afterImage.publicId);

  profile.portfolio.splice(itemIndex, 1);
  await profile.save();

  return successResponse(res, { portfolio: profile.portfolio }, 'Portfolio item removed');
});

/**
 * POST /technicians/me/verification
 */
const submitVerification = asyncHandler(async (req, res) => {
  const profile = await TechnicianProfile.findOne({ user: req.user.userId });
  if (!profile) return errorResponse(res, 'Profile not found.', 404);

  const documents = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const uploaded = await uploadService.uploadFile(file.path, { folder: 'fixtogether/verification' });
      documents.push({
        type: 'verification_document',
        url: uploaded.url,
        publicId: uploaded.publicId,
        uploadedAt: new Date(),
      });
    }
  }

  profile.verificationDocuments.push(...documents);
  profile.verificationStatus = VERIFICATION_STATUS.PENDING;
  await profile.save();

  return successResponse(res, { profile }, 'Verification documents submitted');
});

/**
 * GET /admin/technicians/pending
 */
const getPendingTechnicians = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [profiles, total] = await Promise.all([
    TechnicianProfile.find({ verificationStatus: VERIFICATION_STATUS.PENDING })
      .populate('user', 'fullName email phone createdAt')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    TechnicianProfile.countDocuments({ verificationStatus: VERIFICATION_STATUS.PENDING }),
  ]);

  return successResponse(res, {
    technicians: profiles,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * PATCH /admin/technicians/:id/verification
 */
const updateVerificationStatus = asyncHandler(async (req, res) => {
  const { verificationStatus, verificationNote } = req.body;
  const profile = await TechnicianProfile.findOne({ user: req.params.id });

  if (!profile) return errorResponse(res, 'Technician not found.', 404);

  profile.verificationStatus = verificationStatus;
  if (verificationNote) profile.verificationNote = verificationNote;
  await profile.save();

  const notifType =
    verificationStatus === VERIFICATION_STATUS.APPROVED
      ? NOTIFICATION_TYPES.ACCOUNT_VERIFIED
      : NOTIFICATION_TYPES.ACCOUNT_REJECTED;

  await createNotification({
    userId: req.params.id,
    type: notifType,
    title: verificationStatus === VERIFICATION_STATUS.APPROVED ? 'Verification Approved' : 'Verification Update',
    message:
      verificationStatus === VERIFICATION_STATUS.APPROVED
        ? 'Your technician profile has been verified. You can now receive repair requests.'
        : `Verification status: ${verificationStatus}. ${verificationNote || ''}`,
    relatedEntityType: 'TechnicianProfile',
    relatedEntityId: profile._id,
  });

  await createAuditLog(
    {
      actor: req.user.userId,
      action: 'TECHNICIAN_VERIFICATION_UPDATED',
      targetType: 'TechnicianProfile',
      targetId: profile._id,
      metadata: { verificationStatus, verificationNote },
    },
    req
  );

  return successResponse(res, { profile }, 'Verification status updated');
});

module.exports = {
  getTechnicians,
  getTechnicianById,
  getMyTechnicianProfile,
  updateMyTechnicianProfile,
  updateAvailability,
  addPortfolioItem,
  deletePortfolioItem,
  submitVerification,
  getPendingTechnicians,
  updateVerificationStatus,
};

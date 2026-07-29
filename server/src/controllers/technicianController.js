const { TechnicianProfile, User } = require('../models');
const { asyncHandler, successResponse, errorResponse, parsePagination, paginationMeta } = require('../utils/helpers');
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
  const { skill, category, minRating, city, search } = req.query;

  const query = { activeStatus: true };

  if (skill) query.skills = skill;
  if (category) query.supportedCategories = category;
  if (minRating) query.averageRating = { $gte: parseFloat(minRating) };

  const [profiles, total] = await Promise.all([
    TechnicianProfile.find(query)
      .populate('user', 'fullName email profileImage')
      .populate('skills', 'name')
      .populate('supportedCategories', 'name')
      .sort({ averageRating: -1, completedRepairCount: -1 })
      .skip(skip)
      .limit(limit),
    TechnicianProfile.countDocuments(query),
  ]);

  return successResponse(res, {
    technicians: profiles,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * GET /technicians/:id
 */
const getTechnicianById = asyncHandler(async (req, res) => {
  const profile = await TechnicianProfile.findOne({ user: req.params.id })
    .populate('user', 'fullName email profileImage createdAt')
    .populate('skills', 'name description')
    .populate('supportedCategories', 'name icon');

  if (!profile) return errorResponse(res, 'Technician not found.', 404);

  return successResponse(res, { technician: profile });
});

/**
 * GET /technicians/me/profile
 */
const getMyTechnicianProfile = asyncHandler(async (req, res) => {
  let profile = await TechnicianProfile.findOne({ user: req.user.userId })
    .populate('skills', 'name description')
    .populate('supportedCategories', 'name icon');

  if (!profile) {
    profile = await TechnicianProfile.create({ user: req.user.userId });
  }

  return successResponse(res, { profile });
});

/**
 * PUT /technicians/me/profile
 */
const updateMyTechnicianProfile = asyncHandler(async (req, res) => {
  const {
    biography, skills, supportedCategories, yearsOfExperience,
    serviceMethods, serviceArea, maximumServiceDistance,
    workingHours, priceRange, warrantyOptions, activeStatus,
  } = req.body;

  const updates = {};
  if (biography !== undefined) updates.biography = biography;
  if (skills) updates.skills = skills;
  if (supportedCategories) updates.supportedCategories = supportedCategories;
  if (yearsOfExperience !== undefined) updates.yearsOfExperience = yearsOfExperience;
  if (serviceMethods) updates.serviceMethods = serviceMethods;
  if (serviceArea) updates.serviceArea = serviceArea;
  if (maximumServiceDistance !== undefined) updates.maximumServiceDistance = maximumServiceDistance;
  if (workingHours) updates.workingHours = workingHours;
  if (priceRange) updates.priceRange = priceRange;
  if (warrantyOptions) updates.warrantyOptions = warrantyOptions;
  if (activeStatus !== undefined) updates.activeStatus = activeStatus;

  const profile = await TechnicianProfile.findOneAndUpdate(
    { user: req.user.userId },
    updates,
    { new: true, runValidators: true, upsert: true }
  )
    .populate('skills', 'name')
    .populate('supportedCategories', 'name');

  return successResponse(res, { profile }, 'Profile updated successfully');
});

/**
 * POST /technicians/me/verification
 */
const submitVerification = asyncHandler(async (req, res) => {
  const profile = await TechnicianProfile.findOne({ user: req.user.userId });
  if (!profile) return errorResponse(res, 'Profile not found.', 404);

  // Upload verification documents
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

  // Notify technician
  const notifType = verificationStatus === VERIFICATION_STATUS.APPROVED
    ? NOTIFICATION_TYPES.ACCOUNT_VERIFIED
    : NOTIFICATION_TYPES.ACCOUNT_REJECTED;

  await createNotification({
    userId: req.params.id,
    type: notifType,
    title: verificationStatus === VERIFICATION_STATUS.APPROVED
      ? 'Verification Approved'
      : 'Verification Update',
    message: verificationStatus === VERIFICATION_STATUS.APPROVED
      ? 'Your technician profile has been verified. You can now receive repair requests.'
      : `Verification status: ${verificationStatus}. ${verificationNote || ''}`,
    relatedEntityType: 'TechnicianProfile',
    relatedEntityId: profile._id,
  });

  await createAuditLog({
    actor: req.user.userId,
    action: 'TECHNICIAN_VERIFICATION_UPDATED',
    targetType: 'TechnicianProfile',
    targetId: profile._id,
    metadata: { verificationStatus, verificationNote },
  }, req);

  return successResponse(res, { profile }, 'Verification status updated');
});

module.exports = {
  getTechnicians,
  getTechnicianById,
  getMyTechnicianProfile,
  updateMyTechnicianProfile,
  submitVerification,
  getPendingTechnicians,
  updateVerificationStatus,
};

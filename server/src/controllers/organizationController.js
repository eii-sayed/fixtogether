const mongoose = require('mongoose');
const { OrganizationProfile, DonationOffer } = require('../models');
const {
  asyncHandler,
  successResponse,
  errorResponse,
  parsePagination,
  paginationMeta,
} = require('../utils/helpers');
const { VERIFICATION_STATUS, ORGANIZATION_TYPES, NOTIFICATION_TYPES } = require('../constants');
const uploadService = require('../services/uploadService');
const { createAuditLog } = require('../middleware/auditLog');
const { createNotification } = require('../services/notificationService');

/**
 * GET /organizations
 * Public organization listing
 */
const getOrganizations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { type, category, search } = req.query;

  const query = { activeStatus: true, verificationStatus: VERIFICATION_STATUS.APPROVED };
  if (type) query.organizationType = type;
  if (category) query.acceptedItemCategories = category;
  if (search) query.organizationName = { $regex: search, $options: 'i' };

  const [orgs, total] = await Promise.all([
    OrganizationProfile.find(query)
      .populate('user', 'fullName email profileImage city serviceArea')
      .populate('acceptedItemCategories', 'name icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    OrganizationProfile.countDocuments(query),
  ]);

  const sanitizedOrgs = orgs.map((org) => {
    const userObj = org.user ? org.user.toObject() : {};
    return {
      _id: org._id,
      userId: userObj._id,
      organizationName: org.organizationName,
      organizationType: org.organizationType,
      description: org.description,
      logo: userObj.profileImage,
      website: org.registrationInformation?.website,
      city: org.address?.city || userObj.city,
      serviceArea: userObj.serviceArea,
      verificationStatus: org.verificationStatus,
      acceptedItemCategories: org.acceptedItemCategories,
      pickupAvailable: org.pickupAvailable,
      dropoffAvailable: org.dropoffAvailable,
      impactStats: org.impactStats,
      locations: org.locations,
    };
  });

  return successResponse(res, {
    organizations: sanitizedOrgs,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * GET /organizations/:id
 * Public organization profile DTO
 */
const getOrganizationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let query = {};
  if (mongoose.Types.ObjectId.isValid(id)) {
    query = { $or: [{ _id: id }, { user: id }] };
  } else {
    return errorResponse(res, 'Invalid organization ID format.', 400);
  }

  const org = await OrganizationProfile.findOne(query)
    .populate('user', 'fullName email phone profileImage city serviceArea createdAt privacySettings')
    .populate('acceptedItemCategories', 'name icon')
    .populate('neededItemCategories', 'name icon')
    .populate('rejectedCategories', 'name icon');

  if (!org) return errorResponse(res, 'Organization not found.', 404);

  const user = org.user ? org.user.toObject() : {};
  const privacy = user.privacySettings || {};

  // Build sanitized public DTO - never leak internal documents or private address notes
  const publicOrg = {
    _id: org._id,
    userId: user._id,
    organizationName: org.organizationName,
    organizationType: org.organizationType,
    description: org.description,
    logo: user.profileImage,
    publicEmail: privacy.showEmailPublicly ? org.contactPerson?.email || user.email : undefined,
    publicPhone: privacy.showPhonePublicly ? org.contactPerson?.phone || user.phone : undefined,
    website: org.registrationInformation?.website,
    city: privacy.showLocationPublicly ? org.address?.city || user.city : undefined,
    serviceArea: privacy.showLocationPublicly ? org.serviceArea : undefined,
    verificationStatus: org.verificationStatus,
    acceptedItemCategories: org.acceptedItemCategories || [],
    neededItemCategories: org.neededItemCategories || [],
    rejectedCategories: org.rejectedCategories || [],
    pickupAvailable: org.pickupAvailable,
    dropoffAvailable: org.dropoffAvailable,
    donationInstructions: org.donationInstructions,
    recyclingInstructions: org.recyclingInstructions,
    locations: org.locations || [],
    operatingHours: org.operatingHours,
    impactStats: org.impactStats || {
      totalDonationsReceived: 0,
      totalItemsProcessed: 0,
      totalWeightProcessed: 0,
    },
    memberSince: user.createdAt,
  };

  return successResponse(res, { organization: publicOrg });
});

/**
 * GET /organizations/me/profile
 * Authenticated private organization profile
 */
const getMyOrganizationProfile = asyncHandler(async (req, res) => {
  let profile = await OrganizationProfile.findOne({ user: req.user.userId })
    .populate('acceptedItemCategories', 'name icon')
    .populate('neededItemCategories', 'name icon')
    .populate('rejectedCategories', 'name icon');

  if (!profile) {
    profile = await OrganizationProfile.create({
      user: req.user.userId,
      organizationName: req.user.fullName,
      organizationType: ORGANIZATION_TYPES.DONATION_ORG,
    });
  }

  return successResponse(res, { profile });
});

/**
 * PUT /organizations/me/profile
 * Update authenticated organization profile
 */
const updateMyOrganizationProfile = asyncHandler(async (req, res) => {
  const {
    organizationName,
    organizationType,
    description,
    contactPerson,
    registrationInformation,
    address,
    serviceArea,
    maximumServiceDistance,
    acceptedItemCategories,
    neededItemCategories,
    rejectedCategories,
    pickupAvailable,
    dropoffAvailable,
    donationInstructions,
    recyclingInstructions,
    locations,
    operatingHours,
    activeStatus,
  } = req.body;

  const updates = {};
  if (organizationName !== undefined) updates.organizationName = organizationName;
  if (organizationType !== undefined) updates.organizationType = organizationType;
  if (description !== undefined) updates.description = description;
  if (contactPerson !== undefined) updates.contactPerson = contactPerson;
  if (registrationInformation !== undefined) updates.registrationInformation = registrationInformation;
  if (address !== undefined) updates.address = address;
  if (serviceArea !== undefined) updates.serviceArea = serviceArea;
  if (maximumServiceDistance !== undefined) updates.maximumServiceDistance = maximumServiceDistance;
  if (acceptedItemCategories !== undefined) updates.acceptedItemCategories = acceptedItemCategories;
  if (neededItemCategories !== undefined) updates.neededItemCategories = neededItemCategories;
  if (rejectedCategories !== undefined) updates.rejectedCategories = rejectedCategories;
  if (pickupAvailable !== undefined) updates.pickupAvailable = pickupAvailable;
  if (dropoffAvailable !== undefined) updates.dropoffAvailable = dropoffAvailable;
  if (donationInstructions !== undefined) updates.donationInstructions = donationInstructions;
  if (recyclingInstructions !== undefined) updates.recyclingInstructions = recyclingInstructions;
  if (locations !== undefined) updates.locations = locations;
  if (operatingHours !== undefined) updates.operatingHours = operatingHours;
  if (activeStatus !== undefined) updates.activeStatus = activeStatus;

  const profile = await OrganizationProfile.findOneAndUpdate(
    { user: req.user.userId },
    { $set: updates },
    { new: true, runValidators: true, upsert: true }
  )
    .populate('acceptedItemCategories', 'name icon')
    .populate('neededItemCategories', 'name icon')
    .populate('rejectedCategories', 'name icon');

  return successResponse(res, { profile }, 'Organization profile updated successfully');
});

/**
 * POST /organizations/me/verification
 */
const submitOrgVerification = asyncHandler(async (req, res) => {
  const profile = await OrganizationProfile.findOne({ user: req.user.userId });
  if (!profile) return errorResponse(res, 'Profile not found.', 404);

  const documents = [];
  if (req.files?.length > 0) {
    for (const file of req.files) {
      const uploaded = await uploadService.uploadFile(file.path, {
        folder: 'fixtogether/org-verification',
      });
      documents.push({
        type: 'org_document',
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
 * GET /admin/organizations/pending
 */
const getPendingOrganizations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [orgs, total] = await Promise.all([
    OrganizationProfile.find({ verificationStatus: VERIFICATION_STATUS.PENDING })
      .populate('user', 'fullName email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    OrganizationProfile.countDocuments({ verificationStatus: VERIFICATION_STATUS.PENDING }),
  ]);

  return successResponse(res, {
    organizations: orgs,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * PATCH /admin/organizations/:id/verification
 */
const updateOrgVerificationStatus = asyncHandler(async (req, res) => {
  const { verificationStatus, verificationNote } = req.body;
  const profile = await OrganizationProfile.findOne({ user: req.params.id });

  if (!profile) return errorResponse(res, 'Organization not found.', 404);

  profile.verificationStatus = verificationStatus;
  if (verificationNote) profile.verificationNote = verificationNote;
  await profile.save();

  await createNotification({
    userId: req.params.id,
    type:
      verificationStatus === VERIFICATION_STATUS.APPROVED
        ? NOTIFICATION_TYPES.ACCOUNT_VERIFIED
        : NOTIFICATION_TYPES.ACCOUNT_REJECTED,
    title: verificationStatus === VERIFICATION_STATUS.APPROVED ? 'Organization Verified' : 'Verification Update',
    message:
      verificationStatus === VERIFICATION_STATUS.APPROVED
        ? 'Your organization has been verified.'
        : `Status: ${verificationStatus}. ${verificationNote || ''}`,
    relatedEntityType: 'OrganizationProfile',
    relatedEntityId: profile._id,
  });

  await createAuditLog(
    {
      actor: req.user.userId,
      action: 'ORG_VERIFICATION_UPDATED',
      targetType: 'OrganizationProfile',
      targetId: profile._id,
      metadata: { verificationStatus },
    },
    req
  );

  return successResponse(res, { profile }, 'Verification updated');
});

module.exports = {
  getOrganizations,
  getOrganizationById,
  getMyOrganizationProfile,
  updateMyOrganizationProfile,
  submitOrgVerification,
  getPendingOrganizations,
  updateOrgVerificationStatus,
};

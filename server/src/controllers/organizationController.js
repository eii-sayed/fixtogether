const { OrganizationProfile } = require('../models');
const { asyncHandler, successResponse, errorResponse, parsePagination, paginationMeta } = require('../utils/helpers');
const { VERIFICATION_STATUS, ORGANIZATION_TYPES, NOTIFICATION_TYPES } = require('../constants');
const uploadService = require('../services/uploadService');
const { createAuditLog } = require('../middleware/auditLog');
const { createNotification } = require('../services/notificationService');

const getOrganizations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { type, category, search } = req.query;
  const query = { activeStatus: true, verificationStatus: VERIFICATION_STATUS.APPROVED };
  if (type) query.organizationType = type;
  if (category) query.acceptedItemCategories = category;
  if (search) query.organizationName = { $regex: search, $options: 'i' };

  const [orgs, total] = await Promise.all([
    OrganizationProfile.find(query)
      .populate('user', 'fullName email profileImage')
      .populate('acceptedItemCategories', 'name icon')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    OrganizationProfile.countDocuments(query),
  ]);
  return successResponse(res, { organizations: orgs, pagination: paginationMeta(total, page, limit) });
});

const getOrganizationById = asyncHandler(async (req, res) => {
  const org = await OrganizationProfile.findOne({ user: req.params.id })
    .populate('user', 'fullName email profileImage')
    .populate('acceptedItemCategories', 'name icon')
    .populate('neededItemCategories', 'name icon');
  if (!org) return errorResponse(res, 'Organization not found.', 404);
  return successResponse(res, { organization: org });
});

const getMyOrganizationProfile = asyncHandler(async (req, res) => {
  let profile = await OrganizationProfile.findOne({ user: req.user.userId })
    .populate('acceptedItemCategories', 'name').populate('neededItemCategories', 'name');
  if (!profile) {
    profile = await OrganizationProfile.create({
      user: req.user.userId, organizationName: req.user.fullName,
      organizationType: ORGANIZATION_TYPES.DONATION_ORG,
    });
  }
  return successResponse(res, { profile });
});

const updateMyOrganizationProfile = asyncHandler(async (req, res) => {
  const updates = {};
  const fields = ['organizationName', 'organizationType', 'description', 'contactPerson',
    'registrationInformation', 'address', 'serviceArea', 'maximumServiceDistance',
    'acceptedItemCategories', 'neededItemCategories', 'pickupAvailable', 'operatingHours', 'activeStatus'];
  fields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const profile = await OrganizationProfile.findOneAndUpdate(
    { user: req.user.userId }, updates, { new: true, runValidators: true, upsert: true }
  ).populate('acceptedItemCategories', 'name').populate('neededItemCategories', 'name');
  return successResponse(res, { profile }, 'Profile updated');
});

const submitOrgVerification = asyncHandler(async (req, res) => {
  const profile = await OrganizationProfile.findOne({ user: req.user.userId });
  if (!profile) return errorResponse(res, 'Profile not found.', 404);
  const documents = [];
  if (req.files?.length > 0) {
    for (const file of req.files) {
      const uploaded = await uploadService.uploadFile(file.path, { folder: 'fixtogether/org-verification' });
      documents.push({ type: 'org_document', url: uploaded.url, publicId: uploaded.publicId });
    }
  }
  profile.verificationDocuments.push(...documents);
  profile.verificationStatus = VERIFICATION_STATUS.PENDING;
  await profile.save();
  return successResponse(res, { profile }, 'Verification submitted');
});

const getPendingOrganizations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [orgs, total] = await Promise.all([
    OrganizationProfile.find({ verificationStatus: VERIFICATION_STATUS.PENDING })
      .populate('user', 'fullName email').sort({ updatedAt: -1 }).skip(skip).limit(limit),
    OrganizationProfile.countDocuments({ verificationStatus: VERIFICATION_STATUS.PENDING }),
  ]);
  return successResponse(res, { organizations: orgs, pagination: paginationMeta(total, page, limit) });
});

const updateOrgVerificationStatus = asyncHandler(async (req, res) => {
  const { verificationStatus, verificationNote } = req.body;
  const profile = await OrganizationProfile.findOne({ user: req.params.id });
  if (!profile) return errorResponse(res, 'Organization not found.', 404);
  profile.verificationStatus = verificationStatus;
  if (verificationNote) profile.verificationNote = verificationNote;
  await profile.save();

  await createNotification({
    userId: req.params.id,
    type: verificationStatus === VERIFICATION_STATUS.APPROVED ? NOTIFICATION_TYPES.ACCOUNT_VERIFIED : NOTIFICATION_TYPES.ACCOUNT_REJECTED,
    title: verificationStatus === VERIFICATION_STATUS.APPROVED ? 'Organization Verified' : 'Verification Update',
    message: verificationStatus === VERIFICATION_STATUS.APPROVED
      ? 'Your organization has been verified.' : `Status: ${verificationStatus}. ${verificationNote || ''}`,
    relatedEntityType: 'OrganizationProfile', relatedEntityId: profile._id,
  });

  await createAuditLog({ actor: req.user.userId, action: 'ORG_VERIFICATION_UPDATED',
    targetType: 'OrganizationProfile', targetId: profile._id, metadata: { verificationStatus } }, req);
  return successResponse(res, { profile }, 'Verification updated');
});

module.exports = { getOrganizations, getOrganizationById, getMyOrganizationProfile,
  updateMyOrganizationProfile, submitOrgVerification, getPendingOrganizations, updateOrgVerificationStatus };

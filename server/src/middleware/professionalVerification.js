const { TechnicianProfile, OrganizationProfile } = require('../models');
const { ROLES, VERIFICATION_STATUS } = require('../constants');
const logger = require('../utils/logger');

const blockedResponse = (res, professionalType, verificationStatus) => res.status(403).json({
  success: false,
  code: 'PROFESSIONAL_VERIFICATION_REQUIRED',
  message: `Administrator verification is required before using ${professionalType} operations.`,
  verificationStatus: verificationStatus || VERIFICATION_STATUS.NOT_SUBMITTED,
});

const requireVerifiedTechnician = async (req, res, next) => {
  // This middleware is safe on shared owner/admin/technician routes.
  if (req.user?.role !== ROLES.TECHNICIAN) return next();
  try {
    const profile = await TechnicianProfile.findOne({ user: req.user.userId })
      .select('verificationStatus')
      .lean();
    if (profile?.verificationStatus !== VERIFICATION_STATUS.APPROVED) {
      return blockedResponse(res, 'technician', profile?.verificationStatus);
    }
    return next();
  } catch (error) {
    logger.error('Technician verification check failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify technician access.' });
  }
};

const requireVerifiedOrganization = async (req, res, next) => {
  // This middleware is safe on shared owner/admin/organization routes.
  if (req.user?.role !== ROLES.ORGANIZATION) return next();
  try {
    const profile = await OrganizationProfile.findOne({ user: req.user.userId })
      .select('verificationStatus')
      .lean();
    if (profile?.verificationStatus !== VERIFICATION_STATUS.APPROVED) {
      return blockedResponse(res, 'organization', profile?.verificationStatus);
    }
    return next();
  } catch (error) {
    logger.error('Organization verification check failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify organization access.' });
  }
};

module.exports = { requireVerifiedTechnician, requireVerifiedOrganization };

/**
 * Safe Response Serializers & Field-Level Visibility Projections
 */

/**
 * Serialize a RepairRequest based on viewer's identity and assignment status
 * @param {Object} request - Mongoose or plain RepairRequest object
 * @param {Object} viewer - Authenticated user payload { userId, role, adminPermissions }
 * @returns {Object} Sanitized RepairRequest DTO
 */
const serializeRepairRequest = (request, viewer) => {
  if (!request) return null;
  const reqObj = request.toObject ? request.toObject() : { ...request };

  const viewerId = viewer?.userId?.toString();
  const isOwner = viewerId && reqObj.owner?._id?.toString() === viewerId || reqObj.owner?.toString() === viewerId;
  const isAdmin = viewer?.role === 'admin';
  const isAssignedTech = viewerId && (reqObj.assignedTechnician?._id?.toString() === viewerId || reqObj.assignedTechnician?.toString() === viewerId);

  // If unassigned technician or public browsing
  if (!isOwner && !isAdmin && !isAssignedTech) {
    // Mask private owner contact
    if (reqObj.owner && typeof reqObj.owner === 'object') {
      reqObj.owner = {
        _id: reqObj.owner._id,
        fullName: reqObj.owner.fullName,
        city: reqObj.owner.city,
      };
    }

    // Mask exact coordinates to approximate city/area
    if (reqObj.item?.approximateLocation) {
      reqObj.item.approximateLocation = {
        city: reqObj.item.approximateLocation.city || reqObj.owner?.city,
        area: reqObj.item.approximateLocation.area,
        coordinates: { coordinates: [0, 0] },
      };
    }

    // Strip sensitive internal/moderation fields
    delete reqObj.adminNotes;
    delete reqObj.safetyReviewHistory;
    delete reqObj.internalNotes;
  }

  // Hide admin-only notes from owner and technician
  if (!isAdmin) {
    delete reqObj.adminNotes;
  }

  return reqObj;
};

/**
 * Serialize a DonationOffer based on viewer's identity
 * @param {Object} offer - Mongoose or plain DonationOffer object
 * @param {Object} viewer - Authenticated user payload
 * @returns {Object} Sanitized DonationOffer DTO
 */
const serializeDonationOffer = (offer, viewer) => {
  if (!offer) return null;
  const offerObj = offer.toObject ? offer.toObject() : { ...offer };

  const viewerId = viewer?.userId?.toString();
  const isOwner = viewerId && (offerObj.owner?._id?.toString() === viewerId || offerObj.owner?.toString() === viewerId);
  const isAdmin = viewer?.role === 'admin';
  const isSelectedOrg = viewerId && (offerObj.selectedOrganization?.user?.toString() === viewerId || offerObj.selectedOrganization?.toString() === viewerId);
  const isConfirmedHandover = ['handover_scheduled', 'in_transit', 'received', 'inspected', 'processing', 'completed'].includes(offerObj.status);

  // If viewer is an organization browsing offers before confirmed handover
  if (!isOwner && !isAdmin && (!isSelectedOrg || !isConfirmedHandover)) {
    if (offerObj.owner && typeof offerObj.owner === 'object') {
      offerObj.owner = {
        _id: offerObj.owner._id,
        fullName: offerObj.owner.fullName,
        city: offerObj.owner.city,
      };
    }
    if (offerObj.pickupLocation) {
      offerObj.pickupLocation = {
        approximateArea: offerObj.pickupLocation.approximateArea,
        city: offerObj.pickupLocation.city,
        coordinates: { coordinates: [0, 0] },
      };
    }
  }

  // Strip private internal notes from donor
  if (isOwner && !isAdmin) {
    if (offerObj.decision) delete offerObj.decision.internalNote;
    if (offerObj.inspection) {
      delete offerObj.inspection.internalNotes;
      delete offerObj.inspection.adminNotes;
    }
  }

  return offerObj;
};

/**
 * Serialize a User profile for safe display
 * @param {Object} user - User document
 * @param {Object} viewer - Authenticated user payload
 * @returns {Object}
 */
const serializeUser = (user, viewer) => {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : { ...user };

  delete userObj.passwordHash;
  delete userObj.refreshTokenHash;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpires;

  const viewerId = viewer?.userId?.toString();
  const isSelf = viewerId && userObj._id?.toString() === viewerId;
  const isAdmin = viewer?.role === 'admin';

  if (!isSelf && !isAdmin) {
    const privacy = userObj.privacySettings || {};
    if (!privacy.showEmailPublicly) delete userObj.email;
    if (!privacy.showPhonePublicly) delete userObj.phone;
    if (!privacy.showLocationPublicly) {
      delete userObj.city;
      delete userObj.serviceArea;
    }
    delete userObj.privacySettings;
    delete userObj.accountStatusHistory;
    delete userObj.failedLoginAttempts;
  }

  return userObj;
};

module.exports = {
  serializeRepairRequest,
  serializeDonationOffer,
  serializeUser,
};

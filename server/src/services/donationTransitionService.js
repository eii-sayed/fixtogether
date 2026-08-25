const mongoose = require('mongoose');
const { DONATION_STATUS, DONATION_TRANSITIONS, VERIFICATION_STATUS } = require('../constants');
const { DonationOffer, AuditLog } = require('../models');
const { createNotification } = require('./notificationService');
const logger = require('../utils/logger');

/**
 * Validate and execute a donation offer state transition atomically
 * @param {Object} params
 * @param {string|ObjectId} params.donationId - Donation Offer ID
 * @param {string} params.targetStatus - Desired new status
 * @param {Object} params.actor - req.user object { userId, role, email }
 * @param {Object} [params.payload] - Additional fields to set
 * @param {number} [params.expectedVersion] - Optimistic concurrency version
 * @param {string} [params.reason] - Transition justification
 * @param {string} [params.publicNote] - Donor-facing note
 * @param {string} [params.internalNote] - Private organization note
 * @returns {Promise<Object>} Updated DonationOffer document
 */
const transitionDonationStatus = async ({
  donationId,
  targetStatus,
  actor,
  payload = {},
  expectedVersion,
  reason = '',
  publicNote = '',
  internalNote = '',
}) => {
  const donation = await DonationOffer.findById(donationId);
  if (!donation) {
    const error = new Error('Donation offer not found.');
    error.statusCode = 404;
    throw error;
  }

  // 1. Optimistic Concurrency Check
  if (expectedVersion !== undefined && donation.version !== expectedVersion) {
    const error = new Error(
      `Conflict: This donation offer has been modified by another action (Version ${donation.version} vs Expected ${expectedVersion}). Please refresh and try again.`
    );
    error.statusCode = 409;
    error.code = 'RESOURCE_VERSION_CONFLICT';
    throw error;
  }

  const currentStatus = donation.status;

  // 2. Validate Allowed Transition
  const allowedTransitions = DONATION_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(targetStatus) && currentStatus !== targetStatus) {
    const error = new Error(
      `Invalid state transition: Cannot move donation offer from '${currentStatus}' to '${targetStatus}'.`
    );
    error.statusCode = 400;
    throw error;
  }

  // 3. Role & Ownership Authorization
  if (actor.role === 'owner') {
    if (donation.owner.toString() !== actor.userId.toString()) {
      const error = new Error('Unauthorized: You can only modify your own donation offers.');
      error.statusCode = 403;
      throw error;
    }
  } else if (actor.role === 'organization') {
    // If already accepted, must be the selected organization
    if (
      donation.selectedOrganization &&
      donation.selectedOrganization.toString() !== actor.userId.toString()
    ) {
      const { OrganizationProfile } = require('../models');
      const orgProfile = await OrganizationProfile.findOne({ user: actor.userId });
      if (
        !orgProfile ||
        donation.selectedOrganization.toString() !== orgProfile._id.toString()
      ) {
        const error = new Error('Unauthorized: This donation offer is assigned to another organization.');
        error.statusCode = 403;
        throw error;
      }
    }
  } else if (actor.role !== 'admin') {
    const error = new Error('Unauthorized role for donation operations.');
    error.statusCode = 403;
    throw error;
  }

  // 4. Verification Check for Acceptance / Processing
  if (targetStatus === DONATION_STATUS.ACCEPTED && actor.role === 'organization') {
    const { OrganizationProfile } = require('../models');
    const orgProfile = await OrganizationProfile.findOne({ user: actor.userId });
    if (!orgProfile || orgProfile.verificationStatus !== VERIFICATION_STATUS.APPROVED) {
      const error = new Error(
        'Compliance restriction: Your organization must have Approved verification status to accept donation offers.'
      );
      error.statusCode = 403;
      throw error;
    }
  }

  // 5. Update Status, Payload & Append to History
  donation.status = targetStatus;
  donation.version = (donation.version || 1) + 1;

  if (payload) {
    const nestedSubdocs = ['decision', 'handover', 'inspection', 'processing', 'dataBearing', 'pickupLocation'];
    Object.keys(payload).forEach((key) => {
      if (nestedSubdocs.includes(key) && typeof payload[key] === 'object' && payload[key] !== null) {
        donation[key] = {
          ...(donation[key] ? donation[key].toObject?.() || donation[key] : {}),
          ...payload[key],
        };
      } else {
        donation[key] = payload[key];
      }
    });
  }

  donation.history.push({
    fromStatus: currentStatus,
    toStatus: targetStatus,
    actingUser: actor.userId,
    actingRole: actor.role,
    timestamp: new Date(),
    publicNote,
    internalNote,
    reason,
  });

  await donation.save();

  // 6. Record Audit Log
  try {
    await AuditLog.create({
      actor: actor.userId,
      action: `DONATION_STATUS_${targetStatus.toUpperCase()}`,
      targetType: 'DonationOffer',
      targetId: donation._id,
      previousValues: { status: currentStatus },
      updatedValues: { status: targetStatus, reason, version: donation.version },
      severity: 'info',
      success: true,
    });
  } catch (auditErr) {
    logger.warn('Failed to create audit log for donation transition:', auditErr.message);
  }

  return donation;
};

module.exports = {
  transitionDonationStatus,
};

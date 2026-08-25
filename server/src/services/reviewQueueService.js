const {
  ReviewQueueItem,
  TechnicianProfile,
  OrganizationProfile,
  RepairRequest,
  Dispute,
  AuditLog,
  User,
} = require('../models');
const {
  REVIEW_QUEUE_TYPE,
  REVIEW_QUEUE_STATE,
  REVIEW_PRIORITY,
  DISPUTE_STATUS,
} = require('../constants');
const logger = require('../utils/logger');

const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Sync active work items into the unified Review Queue
 */
const syncReviewQueue = async () => {
  try {
    const now = new Date();

    // 1. Pending Technician Verifications
    const pendingTechs = await TechnicianProfile.find({
      verificationStatus: 'pending',
    }).populate('user', 'fullName email createdAt');

    for (const tech of pendingTechs) {
      const waitHours = (now - new Date(tech.updatedAt || tech.createdAt)) / (1000 * 60 * 60);
      const priority = waitHours > 48 ? REVIEW_PRIORITY.HIGH : REVIEW_PRIORITY.MEDIUM;
      const slaDeadline = new Date(new Date(tech.updatedAt || tech.createdAt).getTime() + 48 * 60 * 60 * 1000);

      await ReviewQueueItem.findOneAndUpdate(
        { entityType: REVIEW_QUEUE_TYPE.VERIFICATION, entityId: tech._id },
        {
          $setOnInsert: {
            entityType: REVIEW_QUEUE_TYPE.VERIFICATION,
            entityId: tech._id,
            entityModel: 'TechnicianProfile',
            title: `Technician Verification: ${tech.user?.fullName || 'Specialist'}`,
            reason: `Submitted credentials (${tech.skills?.length || 0} skills, ${tech.verificationDocuments?.length || 0} docs)`,
            submittedAt: tech.updatedAt || tech.createdAt,
            slaDeadline,
          },
          $set: {
            priority,
            'metadata.userId': tech.user?._id,
            'metadata.skillsCount': tech.skills?.length || 0,
            'metadata.docsCount': tech.verificationDocuments?.length || 0,
          },
        },
        { upsert: true, new: true }
      );
    }

    // 2. Pending Organization Verifications
    const pendingOrgs = await OrganizationProfile.find({
      verificationStatus: 'pending',
    }).populate('user', 'fullName email createdAt');

    for (const org of pendingOrgs) {
      const waitHours = (now - new Date(org.updatedAt || org.createdAt)) / (1000 * 60 * 60);
      const priority = waitHours > 48 ? REVIEW_PRIORITY.HIGH : REVIEW_PRIORITY.MEDIUM;
      const slaDeadline = new Date(new Date(org.updatedAt || org.createdAt).getTime() + 48 * 60 * 60 * 1000);

      await ReviewQueueItem.findOneAndUpdate(
        { entityType: REVIEW_QUEUE_TYPE.VERIFICATION, entityId: org._id },
        {
          $setOnInsert: {
            entityType: REVIEW_QUEUE_TYPE.VERIFICATION,
            entityId: org._id,
            entityModel: 'OrganizationProfile',
            title: `Organization Verification: ${org.organizationName || org.user?.fullName || 'Organization'}`,
            reason: `Non-profit / Community Hub Application (${org.organizationType || 'Partner'})`,
            submittedAt: org.updatedAt || org.createdAt,
            slaDeadline,
          },
          $set: {
            priority,
            'metadata.userId': org.user?._id,
            'metadata.orgType': org.organizationType,
          },
        },
        { upsert: true, new: true }
      );
    }

    // 3. Flagged Repair Requests
    const flaggedRequests = await RepairRequest.find({
      'safetyFlags.0': { $exists: true },
      requestStatus: { $nin: ['completed', 'cancelled', 'draft'] },
    }).populate('item', 'title category').populate('owner', 'fullName email');

    for (const rr of flaggedRequests) {
      const hasCritical = rr.safetyFlags.some((f) => f.severity === 'critical');
      const priority = hasCritical ? REVIEW_PRIORITY.CRITICAL : REVIEW_PRIORITY.HIGH;
      const slaHours = hasCritical ? 12 : 24;
      const slaDeadline = new Date(new Date(rr.createdAt).getTime() + slaHours * 60 * 60 * 1000);

      await ReviewQueueItem.findOneAndUpdate(
        { entityType: REVIEW_QUEUE_TYPE.SAFETY_FLAG, entityId: rr._id },
        {
          $setOnInsert: {
            entityType: REVIEW_QUEUE_TYPE.SAFETY_FLAG,
            entityId: rr._id,
            entityModel: 'RepairRequest',
            title: `Safety Hazard Flag: ${rr.item?.title || 'Device'}`,
            reason: `Triggered ${rr.safetyFlags.length} safety warnings (${rr.safetyFlags.map((f) => f.type).join(', ')})`,
            submittedAt: rr.createdAt,
            slaDeadline,
          },
          $set: {
            priority,
            'metadata.ownerName': rr.owner?.fullName,
            'metadata.flagsCount': rr.safetyFlags.length,
            'metadata.flags': rr.safetyFlags,
          },
        },
        { upsert: true, new: true }
      );
    }

    // 4. Active Disputes
    const activeDisputes = await Dispute.find({
      status: { $in: [DISPUTE_STATUS.OPEN, DISPUTE_STATUS.UNDER_REVIEW, DISPUTE_STATUS.AWAITING_RESPONSE] },
    }).populate('openedBy', 'fullName').populate('againstUser', 'fullName');

    for (const disp of activeDisputes) {
      const priority = REVIEW_PRIORITY.CRITICAL;
      const slaDeadline = new Date(new Date(disp.createdAt).getTime() + 24 * 60 * 60 * 1000);

      await ReviewQueueItem.findOneAndUpdate(
        { entityType: REVIEW_QUEUE_TYPE.DISPUTE, entityId: disp._id },
        {
          $setOnInsert: {
            entityType: REVIEW_QUEUE_TYPE.DISPUTE,
            entityId: disp._id,
            entityModel: 'Dispute',
            title: `Dispute Case: ${disp.category?.toUpperCase() || 'Conflict'}`,
            reason: `${disp.openedBy?.fullName || 'Owner'} raised formal dispute against ${disp.againstUser?.fullName || 'Technician'}`,
            submittedAt: disp.createdAt,
            slaDeadline,
          },
          $set: {
            priority,
            'metadata.category': disp.category,
            'metadata.repairJobId': disp.repairJob,
          },
        },
        { upsert: true, new: true }
      );
    }

    // 5. Clean up resolved items
    // (If underlying entity is no longer pending/flagged/open, mark review queue item resolved)
    await ReviewQueueItem.deleteMany({
      reviewState: REVIEW_QUEUE_STATE.RESOLVED,
      updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
  } catch (err) {
    logger.error('Error syncing Review Queue:', err.message);
  }
};

/**
 * Acquire soft review lock
 */
const acquireLock = async (queueItemId, adminId) => {
  const item = await ReviewQueueItem.findById(queueItemId);
  if (!item) throw new Error('Queue item not found.');

  const now = new Date();
  if (
    item.lock?.lockedBy &&
    item.lock.lockedBy.toString() !== adminId.toString() &&
    item.lock.expiresAt > now
  ) {
    const lockedAdmin = await User.findById(item.lock.lockedBy).select('fullName email');
    return {
      acquired: false,
      lockedBy: lockedAdmin || { fullName: 'Another Administrator' },
      expiresAt: item.lock.expiresAt,
    };
  }

  item.lock = {
    lockedBy: adminId,
    lockedAt: now,
    expiresAt: new Date(now.getTime() + LOCK_DURATION_MS),
  };
  item.reviewState = item.reviewState === REVIEW_QUEUE_STATE.PENDING ? REVIEW_QUEUE_STATE.IN_REVIEW : item.reviewState;
  await item.save();

  return { acquired: true, item };
};

/**
 * Release soft review lock
 */
const releaseLock = async (queueItemId, adminId) => {
  const item = await ReviewQueueItem.findById(queueItemId);
  if (!item) return;

  if (item.lock?.lockedBy?.toString() === adminId.toString()) {
    item.lock = { lockedBy: null, lockedAt: null, expiresAt: null };
    await item.save();
  }
};

/**
 * Authorized Takeover of lock
 */
const takeoverLock = async (queueItemId, adminId, reason, req) => {
  const item = await ReviewQueueItem.findById(queueItemId);
  if (!item) throw new Error('Queue item not found.');

  const previousHolder = item.lock?.lockedBy;
  const now = new Date();

  item.lock = {
    lockedBy: adminId,
    lockedAt: now,
    expiresAt: new Date(now.getTime() + LOCK_DURATION_MS),
  };
  item.internalNotes.push({
    admin: adminId,
    note: `[Lock Takeover] Took over active review. Reason: ${reason || 'Priority escalation'}`,
    createdAt: now,
  });
  await item.save();

  await AuditLog.create({
    actor: adminId,
    action: 'QUEUE_LOCK_TAKEOVER',
    targetType: 'ReviewQueueItem',
    targetId: queueItemId,
    metadata: { previousHolder, reason },
    ipAddress: req?.ip || '',
    userAgent: req?.headers?.['user-agent'] || '',
  });

  return item;
};

module.exports = {
  syncReviewQueue,
  acquireLock,
  releaseLock,
  takeoverLock,
  LOCK_DURATION_MS,
};

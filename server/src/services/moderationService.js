const { User } = require('../models');
const { createAuditLog } = require('../middleware/auditLog');
const logger = require('../utils/logger');

let expiryInterval = null;
let expiryInProgress = false;

const expireTemporarySuspensions = async (now = new Date()) => {
  if (expiryInProgress) return 0;
  expiryInProgress = true;
  let expiredCount = 0;

  try {
    const candidates = await User.find({
      accountStatus: 'suspended',
      suspensionExpiresAt: { $lte: now },
    }).select('_id suspensionExpiresAt');

    for (const candidate of candidates) {
      const updated = await User.findOneAndUpdate(
        { _id: candidate._id, accountStatus: 'suspended', suspensionExpiresAt: { $lte: now } },
        {
          $set: { accountStatus: 'active', suspensionReason: '', suspensionExpiresAt: null },
          $push: {
            moderationHistory: {
              action: 'automatic_reactivation',
              reason: 'Temporary suspension period expired.',
              internalNote: '',
              affectedServices: ['all'],
              durationDays: 0,
              createdAt: now,
            },
          },
        },
        { new: true }
      );
      if (!updated) continue;

      expiredCount += 1;
      await createAuditLog({
        actor: null,
        action: 'USER_TEMPORARY_SUSPENSION_EXPIRED',
        targetType: 'User',
        targetId: updated._id,
        metadata: { suspensionExpiresAt: candidate.suspensionExpiresAt },
      });
    }
  } catch (error) {
    logger.error('Temporary suspension expiry failed:', error.message);
  } finally {
    expiryInProgress = false;
  }

  return expiredCount;
};

const startSuspensionExpiryWorker = (intervalMs = 60_000) => {
  stopSuspensionExpiryWorker();
  expireTemporarySuspensions().catch((error) => logger.error('Suspension expiry worker failed:', error.message));
  expiryInterval = setInterval(() => {
    expireTemporarySuspensions().catch((error) => logger.error('Suspension expiry worker failed:', error.message));
  }, intervalMs);
};

const stopSuspensionExpiryWorker = () => {
  if (expiryInterval) {
    clearInterval(expiryInterval);
    expiryInterval = null;
  }
};

module.exports = { expireTemporarySuspensions, startSuspensionExpiryWorker, stopSuspensionExpiryWorker };

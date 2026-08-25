const crypto = require('crypto');
const logger = require('../utils/logger');

// In-memory / persisted job store
const jobs = new Map();

/**
 * Create a new background task
 */
const createJob = (type, payload = {}, userId = null) => {
  const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const job = {
    jobId,
    type,
    payload,
    userId,
    status: 'queued',
    progress: 0,
    result: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  jobs.set(jobId, job);

  // Automatically trigger job processing asynchronously
  setTimeout(() => executeJob(jobId), 50);

  return job;
};

/**
 * Get job status
 */
const getJobStatus = (jobId) => {
  return jobs.get(jobId) || null;
};

/**
 * Execute job handler based on job type
 */
const executeJob = async (jobId) => {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'processing';
  job.progress = 10;
  job.updatedAt = new Date();

  try {
    switch (job.type) {
      case 'EXPORT_AUDIT_LOGS': {
        const { AuditLog } = require('../models');
        const logs = await AuditLog.find(job.payload.query || {})
          .sort({ timestamp: -1 })
          .limit(1000)
          .populate('actor', 'fullName email');

        job.progress = 70;
        const csvRows = [
          'Timestamp,Action,Actor,TargetType,TargetID,IPAddress,Severity,Success',
          ...logs.map((l) =>
            `"${l.timestamp?.toISOString()}","${l.action}","${l.actor?.fullName || 'System'}","${l.targetType}","${l.targetId || ''}","${l.ipAddress || ''}","${l.severity || 'info'}","${l.success}"`
          ),
        ];

        job.result = {
          format: 'csv',
          totalRecords: logs.length,
          content: csvRows.join('\n'),
        };
        break;
      }

      case 'AGGREGATE_IMPACT': {
        const { ImpactRecord, RepairJob } = require('../models');
        job.progress = 50;
        const totals = await ImpactRecord.aggregate([
          {
            $group: {
              _id: null,
              totalWasteAvoided: { $sum: '$estimatedWasteAvoided' },
              totalCostSaved: { $sum: { $subtract: ['$estimatedReplacementCost', '$repairCost'] } },
              totalRecords: { $sum: 1 },
            },
          },
        ]);
        job.result = totals[0] || { totalWasteAvoided: 0, totalCostSaved: 0, totalRecords: 0 };
        break;
      }

      case 'SCAN_EXPIRED_VERIFICATIONS': {
        const { TechnicianProfile } = require('../models');
        job.progress = 40;
        const count = await TechnicianProfile.countDocuments({
          verificationStatus: 'approved',
          'verificationDocuments.expiryDate': { $lt: new Date() },
        });
        job.result = { expiredCount: count };
        break;
      }

      default:
        job.result = { message: 'Job executed successfully' };
    }

    job.status = 'completed';
    job.progress = 100;
  } catch (err) {
    logger.error(`Background job ${jobId} failed:`, err.message);
    job.status = 'failed';
    job.error = err.message;
  } finally {
    job.updatedAt = new Date();
  }
};

module.exports = {
  createJob,
  getJobStatus,
};

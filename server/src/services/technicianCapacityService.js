const { TechnicianProfile, RepairJob } = require('../models');
const { REPAIR_JOB_STATUS, VERIFICATION_STATUS } = require('../constants');

const ACTIVE_JOB_STATUSES = [
  REPAIR_JOB_STATUS.PENDING_INSPECTION,
  REPAIR_JOB_STATUS.INSPECTING,
  REPAIR_JOB_STATUS.AWAITING_APPROVAL,
  REPAIR_JOB_STATUS.WAITING_FOR_PARTS,
  REPAIR_JOB_STATUS.IN_PROGRESS,
  REPAIR_JOB_STATUS.QUALITY_CHECK,
  REPAIR_JOB_STATUS.READY_FOR_COLLECTION,
];

const createHttpError = (status, message) => Object.assign(new Error(message), { status, statusCode: status });

// In a Mongo transaction the profile write makes concurrent acceptances for a
// technician conflict and retry, so the active-job count is checked again.
const assertTechnicianCapacity = async (technicianId, session = null) => {
  const profileQuery = TechnicianProfile.findOne({ user: technicianId });
  if (session) profileQuery.session(session);
  const profile = await profileQuery;
  if (!profile || profile.verificationStatus !== VERIFICATION_STATUS.APPROVED || !profile.activeStatus) {
    throw createHttpError(409, 'The selected technician is not approved for repair work.');
  }
  if (profile.availabilityStatus === 'unavailable' || (profile.vacationMode && (!profile.vacationUntil || profile.vacationUntil >= new Date()))) {
    throw createHttpError(409, 'The selected technician is currently unavailable.');
  }
  const countQuery = RepairJob.countDocuments({ technician: technicianId, currentStatus: { $in: ACTIVE_JOB_STATUSES } });
  if (session) countQuery.session(session);
  const activeJobs = await countQuery;
  const maxJobs = profile.maxConcurrentJobs || 5;
  if (activeJobs >= maxJobs) {
    throw createHttpError(409, 'The selected technician has reached their active-job limit. Choose another technician or wait for capacity.');
  }
  profile.scheduleVersion = (profile.scheduleVersion || 0) + 1;
  await profile.save(session ? { session } : undefined);
  return { profile, activeJobs, maxJobs };
};

module.exports = { ACTIVE_JOB_STATUSES, assertTechnicianCapacity };

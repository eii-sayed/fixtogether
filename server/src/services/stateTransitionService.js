const { RepairRequest, RepairJob, RepairStatusHistory } = require('../models');
const {
  REPAIR_REQUEST_STATUS,
  REPAIR_STATUS_TRANSITIONS,
  REPAIR_JOB_STATUS,
  REPAIR_JOB_TRANSITIONS,
  ROLES,
} = require('../constants');
const { createAuditLog } = require('../middleware/auditLog');
const { createOutboxEvent } = require('./outboxService');
const logger = require('../utils/logger');

/**
 * Validates if a repair request status transition is permitted.
 */
function isValidRepairRequestTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true; // idempotent
  const allowed = REPAIR_STATUS_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(nextStatus));
}

/**
 * Validates if a repair job status transition is permitted.
 */
function isValidRepairJobTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true; // idempotent
  const allowed = REPAIR_JOB_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(nextStatus));
}

/**
 * Validates role-level authorization for a specific request status transition.
 */
function authorizeTransitionByRole(currentStatus, nextStatus, userRole) {
  if (userRole === ROLES.ADMIN) return true;

  // Owner allowed state changes
  const ownerPermitted = [
    { from: REPAIR_REQUEST_STATUS.DRAFT, to: [REPAIR_REQUEST_STATUS.AWAITING_AI_ANALYSIS, REPAIR_REQUEST_STATUS.PUBLISHED, REPAIR_REQUEST_STATUS.CANCELLED] },
    { from: REPAIR_REQUEST_STATUS.AWAITING_AI_ANALYSIS, to: [REPAIR_REQUEST_STATUS.AWAITING_OWNER_REVIEW, REPAIR_REQUEST_STATUS.PUBLISHED, REPAIR_REQUEST_STATUS.CANCELLED] },
    { from: REPAIR_REQUEST_STATUS.AWAITING_OWNER_REVIEW, to: [REPAIR_REQUEST_STATUS.AWAITING_CLARIFICATION, REPAIR_REQUEST_STATUS.PUBLISHED, REPAIR_REQUEST_STATUS.CANCELLED] },
    { from: REPAIR_REQUEST_STATUS.AWAITING_CLARIFICATION, to: [REPAIR_REQUEST_STATUS.PUBLISHED, REPAIR_REQUEST_STATUS.CANCELLED] },
    { from: REPAIR_REQUEST_STATUS.PUBLISHED, to: [REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS, REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS, REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED, REPAIR_REQUEST_STATUS.CANCELLED, REPAIR_REQUEST_STATUS.DONATION_OFFERED] },
    { from: REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS, to: [REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS, REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED, REPAIR_REQUEST_STATUS.CANCELLED] },
    { from: REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS, to: [REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED, REPAIR_REQUEST_STATUS.CANCELLED] },
    { from: REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED, to: [REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED, REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS, REPAIR_REQUEST_STATUS.CANCELLED] },
    { from: REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED, to: [REPAIR_REQUEST_STATUS.APPOINTMENT_SCHEDULED, REPAIR_REQUEST_STATUS.CANCELLED, REPAIR_REQUEST_STATUS.DISPUTED] },
    { from: REPAIR_REQUEST_STATUS.APPOINTMENT_SCHEDULED, to: [REPAIR_REQUEST_STATUS.CANCELLED, REPAIR_REQUEST_STATUS.DISPUTED] },
    { from: REPAIR_REQUEST_STATUS.AWAITING_OWNER_APPROVAL, to: [REPAIR_REQUEST_STATUS.REPAIR_IN_PROGRESS, REPAIR_REQUEST_STATUS.CANCELLED, REPAIR_REQUEST_STATUS.DISPUTED] },
    { from: REPAIR_REQUEST_STATUS.READY_FOR_COLLECTION, to: [REPAIR_REQUEST_STATUS.COMPLETED, REPAIR_REQUEST_STATUS.DISPUTED] },
    { from: REPAIR_REQUEST_STATUS.COMPLETED, to: [REPAIR_REQUEST_STATUS.DISPUTED] },
    { from: REPAIR_REQUEST_STATUS.REPAIR_UNSUCCESSFUL, to: [REPAIR_REQUEST_STATUS.DONATION_OFFERED, REPAIR_REQUEST_STATUS.PARTS_REUSE_APPROVED, REPAIR_REQUEST_STATUS.SENT_FOR_RECYCLING, REPAIR_REQUEST_STATUS.DISPUTED] },
  ];

  // Technician allowed state changes
  const technicianPermitted = [
    { from: REPAIR_REQUEST_STATUS.PUBLISHED, to: [REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED] },
    { from: REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS, to: [REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED] },
    { from: REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS, to: [REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED] },
    { from: REPAIR_REQUEST_STATUS.APPOINTMENT_SCHEDULED, to: [REPAIR_REQUEST_STATUS.UNDER_INSPECTION] },
    { from: REPAIR_REQUEST_STATUS.UNDER_INSPECTION, to: [REPAIR_REQUEST_STATUS.AWAITING_OWNER_APPROVAL, REPAIR_REQUEST_STATUS.REPAIR_IN_PROGRESS, REPAIR_REQUEST_STATUS.REPAIR_UNSUCCESSFUL] },
    { from: REPAIR_REQUEST_STATUS.AWAITING_OWNER_APPROVAL, to: [REPAIR_REQUEST_STATUS.REPAIR_IN_PROGRESS, REPAIR_REQUEST_STATUS.WAITING_FOR_PARTS] },
    { from: REPAIR_REQUEST_STATUS.WAITING_FOR_PARTS, to: [REPAIR_REQUEST_STATUS.REPAIR_IN_PROGRESS] },
    { from: REPAIR_REQUEST_STATUS.REPAIR_IN_PROGRESS, to: [REPAIR_REQUEST_STATUS.QUALITY_CHECK, REPAIR_REQUEST_STATUS.WAITING_FOR_PARTS, REPAIR_REQUEST_STATUS.REPAIR_UNSUCCESSFUL] },
    { from: REPAIR_REQUEST_STATUS.QUALITY_CHECK, to: [REPAIR_REQUEST_STATUS.READY_FOR_COLLECTION, REPAIR_REQUEST_STATUS.REPAIR_IN_PROGRESS, REPAIR_REQUEST_STATUS.REPAIR_UNSUCCESSFUL] },
  ];

  if (userRole === ROLES.OWNER) {
    const rule = ownerPermitted.find((r) => r.from === currentStatus);
    return Boolean(rule && rule.to.includes(nextStatus));
  }

  if (userRole === ROLES.TECHNICIAN) {
    const rule = technicianPermitted.find((r) => r.from === currentStatus);
    return Boolean(rule && rule.to.includes(nextStatus));
  }

  return false;
}

/**
 * Transitions a RepairRequest status strictly with audit logging and ownership checks.
 */
async function transitionRepairRequest(repairRequestId, nextStatus, user, options = {}) {
  const { reason = '', req = null, session = null } = options;

  const query = RepairRequest.findById(repairRequestId);
  if (session) query.session(session);
  const request = await query;

  if (!request) {
    throw new Error('Repair request not found');
  }

  const previousStatus = request.requestStatus;

  // Idempotency: if already in the target state, return immediately without duplicate writes
  if (previousStatus === nextStatus) {
    return { request, changed: false };
  }

  // 1. Check transition graph validity
  if (!isValidRepairRequestTransition(previousStatus, nextStatus)) {
    throw new Error(`Invalid repair request transition from "${previousStatus}" to "${nextStatus}"`);
  }

  // 2. Check role authorization
  if (!authorizeTransitionByRole(previousStatus, nextStatus, user.role)) {
    throw new Error(`Role "${user.role}" is not authorized to transition request from "${previousStatus}" to "${nextStatus}"`);
  }

  // 3. Check ownership for Owner role
  if (user.role === ROLES.OWNER && request.owner.toString() !== user.userId.toString()) {
    throw new Error('Access denied: You do not own this repair request');
  }

  // Apply state change
  request.requestStatus = nextStatus;
  if (nextStatus === REPAIR_REQUEST_STATUS.PUBLISHED && !request.publishedAt) {
    request.publishedAt = new Date();
  }

  await request.save({ session });

  // Record Outbox Event for reliable background delivery
  try {
    await createOutboxEvent({
      eventType: `repair-request.${nextStatus}`,
      entityType: 'RepairRequest',
      entityId: request._id,
      actor: user.userId,
      payload: { previousStatus, nextStatus, reason },
      deduplicationKey: `repair-request:${request._id}:${nextStatus}:${Date.now()}`,
    });
  } catch (err) {
    logger.warn('Failed to emit outbox event for repair request transition:', err.message);
  }

  // Record audit trail if req provided
  if (req) {
    await createAuditLog(
      {
        actor: user.userId,
        action: 'REPAIR_REQUEST_STATUS_TRANSITION',
        targetType: 'RepairRequest',
        targetId: request._id,
        metadata: {
          previousStatus,
          newStatus: nextStatus,
          reason,
        },
      },
      req
    );
  }

  logger.info(`[StateTransition] RepairRequest ${request._id} transitioned from ${previousStatus} -> ${nextStatus} by ${user.role} (${user.userId})`);

  return { request, changed: true, previousStatus, nextStatus };
}

/**
 * Transitions a RepairJob status strictly with RepairStatusHistory and audit logs.
 */
async function transitionRepairJob(repairJobId, nextStatus, user, options = {}) {
  const { note = '', reason = '', req = null, session = null } = options;

  const query = RepairJob.findById(repairJobId);
  if (session) query.session(session);
  const job = await query;

  if (!job) {
    throw new Error('Repair job not found');
  }

  const previousStatus = job.currentStatus;

  // Idempotency check
  if (previousStatus === nextStatus) {
    return { job, changed: false };
  }

  // 1. Check job state transition graph
  if (!isValidRepairJobTransition(previousStatus, nextStatus)) {
    throw new Error(`Invalid repair job transition from "${previousStatus}" to "${nextStatus}"`);
  }

  // 2. Permission check
  const isTechnician = job.technician.toString() === user.userId.toString();
  const isOwner = job.owner.toString() === user.userId.toString();
  const isAdmin = user.role === ROLES.ADMIN;

  if (!isTechnician && !isOwner && !isAdmin) {
    throw new Error('Access denied: Unauthorized to update this repair job');
  }

  // Technician restrictions
  if (user.role === ROLES.TECHNICIAN) {
    // Only owner/admin can confirm final completion from ready_for_collection
    if (nextStatus === REPAIR_JOB_STATUS.COMPLETED && !job.ownerAcceptedCompletion && !isAdmin) {
      throw new Error('Completion must be confirmed by the item owner or approved by administrator.');
    }
  }

  // 3. Precondition checks
  if (nextStatus === REPAIR_JOB_STATUS.READY_FOR_COLLECTION && user.role === ROLES.TECHNICIAN) {
    // Ensure quality checks exist or completion report is filled
    if ((!job.qualityChecks || job.qualityChecks.length === 0) && !job.completionReport) {
      logger.warn(`[StateTransition] RepairJob ${job._id} marked ready without formal QA checklist.`);
    }
  }

  job.currentStatus = nextStatus;
  if (nextStatus === REPAIR_JOB_STATUS.READY_FOR_COLLECTION) {
    job.technicianConfirmedCompletion = true;
  }
  await job.save({ session });

  // Record RepairStatusHistory
  await RepairStatusHistory.create(
    [
      {
        repairJob: job._id,
        previousStatus,
        newStatus: nextStatus,
        changedBy: user.userId,
        note: note || reason || '',
        timestamp: new Date(),
      },
    ],
    { session }
  );

  // Synchronize linked RepairRequest
  const jobToRequestStatusMap = {
    [REPAIR_JOB_STATUS.PENDING_INSPECTION]: REPAIR_REQUEST_STATUS.APPOINTMENT_SCHEDULED,
    [REPAIR_JOB_STATUS.INSPECTING]: REPAIR_REQUEST_STATUS.UNDER_INSPECTION,
    [REPAIR_JOB_STATUS.AWAITING_APPROVAL]: REPAIR_REQUEST_STATUS.AWAITING_OWNER_APPROVAL,
    [REPAIR_JOB_STATUS.WAITING_FOR_PARTS]: REPAIR_REQUEST_STATUS.WAITING_FOR_PARTS,
    [REPAIR_JOB_STATUS.IN_PROGRESS]: REPAIR_REQUEST_STATUS.REPAIR_IN_PROGRESS,
    [REPAIR_JOB_STATUS.QUALITY_CHECK]: REPAIR_REQUEST_STATUS.QUALITY_CHECK,
    [REPAIR_JOB_STATUS.READY_FOR_COLLECTION]: REPAIR_REQUEST_STATUS.READY_FOR_COLLECTION,
    [REPAIR_JOB_STATUS.COMPLETED]: REPAIR_REQUEST_STATUS.COMPLETED,
    [REPAIR_JOB_STATUS.UNSUCCESSFUL]: REPAIR_REQUEST_STATUS.REPAIR_UNSUCCESSFUL,
    [REPAIR_JOB_STATUS.DISPUTED]: REPAIR_REQUEST_STATUS.DISPUTED,
  };

  const matchingRequestStatus = jobToRequestStatusMap[nextStatus];
  if (matchingRequestStatus && job.repairRequest) {
    await RepairRequest.findByIdAndUpdate(
      job.repairRequest,
      { requestStatus: matchingRequestStatus },
      { session }
    );
  }

  // Record Outbox Event
  try {
    await createOutboxEvent({
      eventType: `repair-job.${nextStatus}`,
      entityType: 'RepairJob',
      entityId: job._id,
      actor: user.userId,
      payload: { previousStatus, nextStatus, note },
      deduplicationKey: `repair-job:${job._id}:${nextStatus}:${Date.now()}`,
    });
  } catch (err) {
    logger.warn('Failed to emit outbox event for repair job transition:', err.message);
  }

  if (req) {
    await createAuditLog(
      {
        actor: user.userId,
        action: 'REPAIR_JOB_STATUS_TRANSITION',
        targetType: 'RepairJob',
        targetId: job._id,
        metadata: {
          previousStatus,
          newStatus: nextStatus,
          note,
        },
      },
      req
    );
  }

  logger.info(`[StateTransition] RepairJob ${job._id} transitioned from ${previousStatus} -> ${nextStatus} by ${user.role} (${user.userId})`);

  return { job, changed: true, previousStatus, nextStatus };
}

module.exports = {
  isValidRepairRequestTransition,
  isValidRepairJobTransition,
  authorizeTransitionByRole,
  transitionRepairRequest,
  transitionRepairJob,
};

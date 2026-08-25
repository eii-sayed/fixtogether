const { Inspection, RepairJob, RepairRequest, Quotation, RepairStatusHistory, Warranty,
  Review, Dispute, Notification: NotificationModel, Part, DonationOffer, DonationNeed,
  OrganizationProfile, ImpactRecord } = require('../models');
const { REPAIR_JOB_STATUS, NOTIFICATION_TYPES, REPAIR_REQUEST_STATUS, WARRANTY_STATUS } = require('../constants');
const { asyncHandler, successResponse, errorResponse, parsePagination, paginationMeta, generateCode } = require('../utils/helpers');
const { createNotification } = require('../services/notificationService');
const uploadService = require('../services/uploadService');
const { createAuditLog } = require('../middleware/auditLog');

// ===== INSPECTION =====
const createInspection = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Repair job not found.', 404);
  if (job.technician.toString() !== req.user.userId.toString()) return errorResponse(res, 'Access denied.', 403);

  let images = [];
  if (req.files && req.files.length > 0) {
    const uploaded = await uploadService.uploadMultiple(req.files, { folder: 'fixtogether/inspections' });
    images = uploaded.map((u) => ({ url: u.url, publicId: u.publicId }));
  }

  const inspection = await Inspection.create({
    repairRequest: job.repairRequest,
    technician: req.user.userId,
    ...req.body,
    images: images.length > 0 ? images : req.body.images || [],
  });

  job.inspection = inspection._id;
  await job.save();

  const { transitionRepairJob } = require('../services/stateTransitionService');
  await transitionRepairJob(job._id, REPAIR_JOB_STATUS.INSPECTING, req.user, {
    note: `Diagnostic inspection completed. Repairability: ${inspection.repairability || 'evaluated'}`,
    req,
  });

  if (inspection.repairFeasible === 'no' || inspection.repairability === 'unfeasible') {
    await createNotification({
      userId: job.owner.toString(),
      type: NOTIFICATION_TYPES.REPAIR_STATUS_UPDATED,
      title: 'Inspection Complete: Not Feasible',
      message: 'Technician assessment: repair is not economically feasible. Alternative options available.',
      relatedEntityType: 'RepairJob',
      relatedEntityId: job._id,
    });
  } else {
    await createNotification({
      userId: job.owner.toString(),
      type: NOTIFICATION_TYPES.REPAIR_STATUS_UPDATED,
      title: 'Inspection Complete',
      message: 'Technician has completed the hardware diagnostic inspection.',
      relatedEntityType: 'RepairJob',
      relatedEntityId: job._id,
    });
  }

  return successResponse(res, { inspection, job }, 'Inspection recorded', 201);
});

const getInspection = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Not found.', 404);
  const inspection = await Inspection.findOne({ repairRequest: job.repairRequest })
    .populate('technician', 'fullName');
  return successResponse(res, { inspection });
});

const ownerInspectionDecision = asyncHandler(async (req, res) => {
  const inspection = await Inspection.findById(req.params.id);
  if (!inspection) return errorResponse(res, 'Not found.', 404);
  const { decision, note } = req.body;
  inspection.ownerApprovalStatus = decision;
  inspection.ownerApprovalNote = note || '';
  inspection.ownerDecisionAt = new Date();
  await inspection.save();

  const job = await RepairJob.findOne({ inspection: inspection._id });
  if (job && decision === 'approved') {
    const { transitionRepairJob } = require('../services/stateTransitionService');
    await transitionRepairJob(job._id, REPAIR_JOB_STATUS.IN_PROGRESS, req.user, {
      note: `Owner approved inspection findings: ${note || ''}`,
      req,
    });
  }

  return successResponse(res, { inspection }, 'Decision recorded');
});

// ===== COST APPROVAL =====
const requestCostApproval = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Repair job not found.', 404);
  if (job.technician.toString() !== req.user.userId.toString()) return errorResponse(res, 'Access denied.', 403);

  const {
    originalTotal, revisedTotal, additionalLabor, additionalParts, additionalDays,
    newlyDiscoveredIssue, reason, explanation,
  } = req.body;

  let images = [];
  if (req.files?.length > 0) {
    const uploaded = await uploadService.uploadMultiple(req.files, { folder: 'fixtogether/cost_approvals' });
    images = uploaded.map((u) => ({ url: u.url, publicId: u.publicId }));
  }

  job.costApprovalRequest = {
    requestedAt: new Date(),
    originalTotal: originalTotal || job.finalTotalCost || 0,
    revisedTotal: revisedTotal || 0,
    additionalLabor: additionalLabor || 0,
    additionalParts: additionalParts || 0,
    additionalDays: additionalDays || 0,
    newlyDiscoveredIssue: newlyDiscoveredIssue || '',
    reason: reason || '',
    explanation: explanation || '',
    images,
    status: 'pending',
    decisionAt: null,
    ownerNote: '',
  };

  await job.save();

  const { transitionRepairJob } = require('../services/stateTransitionService');
  await transitionRepairJob(job._id, REPAIR_JOB_STATUS.AWAITING_APPROVAL, req.user, {
    note: `Cost approval requested: revised total ৳${revisedTotal}`,
    req,
  });

  await createNotification({
    userId: job.owner.toString(),
    type: NOTIFICATION_TYPES.OWNER_APPROVAL_REQUIRED,
    title: 'Cost Revision Requires Approval',
    message: `Technician requested approval for additional work (৳${revisedTotal}). Please review and respond.`,
    relatedEntityType: 'RepairJob',
    relatedEntityId: job._id,
  });

  return successResponse(res, { job }, 'Cost approval request submitted to owner');
});

const ownerCostApprovalDecision = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Repair job not found.', 404);
  if (job.owner.toString() !== req.user.userId.toString()) return errorResponse(res, 'Access denied.', 403);

  const { decision, note } = req.body; // 'approved' | 'rejected'
  if (!job.costApprovalRequest || job.costApprovalRequest.status === 'none') {
    return errorResponse(res, 'No pending cost approval request found for this job.', 400);
  }

  job.costApprovalRequest.status = decision;
  job.costApprovalRequest.decisionAt = new Date();
  job.costApprovalRequest.ownerNote = note || '';

  const { transitionRepairJob } = require('../services/stateTransitionService');

  if (decision === 'approved') {
    if (job.costApprovalRequest.revisedTotal) {
      job.finalTotalCost = job.costApprovalRequest.revisedTotal;
    }
    await job.save();

    const hasUnreceivedParts = job.requiredParts.some((p) => ['required', 'searching', 'ordered'].includes(p.status));
    const nextState = hasUnreceivedParts ? REPAIR_JOB_STATUS.WAITING_FOR_PARTS : REPAIR_JOB_STATUS.IN_PROGRESS;

    await transitionRepairJob(job._id, nextState, req.user, {
      note: `Owner approved revised cost (৳${job.costApprovalRequest.revisedTotal}). ${note || ''}`,
      req,
    });

    await createNotification({
      userId: job.technician.toString(),
      type: NOTIFICATION_TYPES.REPAIR_STATUS_UPDATED,
      title: 'Cost Revision Approved',
      message: 'The owner has approved your revised cost. You can now proceed with the repair.',
      relatedEntityType: 'RepairJob',
      relatedEntityId: job._id,
    });
  } else {
    await job.save();
    await createNotification({
      userId: job.technician.toString(),
      type: NOTIFICATION_TYPES.REPAIR_STATUS_UPDATED,
      title: 'Cost Revision Declined',
      message: `The owner declined the revised cost: "${note || 'No reason provided'}". Please discuss options in chat.`,
      relatedEntityType: 'RepairJob',
      relatedEntityId: job._id,
    });
  }

  return successResponse(res, { job }, `Cost revision ${decision}`);
});

// ===== REPAIR JOB =====
const getRepairJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (req.user.role === 'owner') query.owner = req.user.userId;
  else if (req.user.role === 'technician') query.technician = req.user.userId;
  if (req.query.status) query.currentStatus = req.query.status;

  const [jobs, total] = await Promise.all([
    RepairJob.find(query)
      .populate('repairRequest', 'item problemDescription preferredServiceMethod')
      .populate('owner', 'fullName email')
      .populate('technician', 'fullName email')
      .populate('acceptedQuotation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RepairJob.countDocuments(query),
  ]);
  return successResponse(res, { repairJobs: jobs, pagination: paginationMeta(total, page, limit) });
});

const getRepairJobById = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id)
    .populate({ path: 'repairRequest', populate: { path: 'item', populate: { path: 'category' } } })
    .populate('owner', 'fullName email phone')
    .populate('technician', 'fullName email phone')
    .populate('acceptedQuotation')
    .populate('inspection');
  if (!job) return errorResponse(res, 'Not found.', 404);

  const history = await RepairStatusHistory.find({ repairJob: job._id })
    .populate('changedBy', 'fullName').sort({ timestamp: 1 });
  return successResponse(res, { repairJob: job, statusHistory: history });
});

const updateRepairJobStatus = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Not found.', 404);
  if (job.technician.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
    return errorResponse(res, 'Access denied.', 403);
  }

  const { status, note } = req.body;
  const { transitionRepairJob } = require('../services/stateTransitionService');
  const result = await transitionRepairJob(job._id, status, req.user, { note, req });

  await createNotification({
    userId: job.owner.toString(),
    type: NOTIFICATION_TYPES.REPAIR_STATUS_UPDATED,
    title: 'Repair Status Updated',
    message: `Status changed to: ${status.replace(/_/g, ' ')}`,
    relatedEntityType: 'RepairJob',
    relatedEntityId: job._id,
  });

  return successResponse(res, { repairJob: result.job }, 'Status updated');
});

const addParts = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Not found.', 404);
  if (job.technician.toString() !== req.user.userId.toString()) return errorResponse(res, 'Access denied.', 403);
  job.requiredParts.push(...(req.body.parts || []));
  await job.save();
  return successResponse(res, { repairJob: job }, 'Parts added');
});

const updatePartStatus = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Repair job not found.', 404);
  if (job.technician.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
    return errorResponse(res, 'Access denied.', 403);
  }

  const { partIndex } = req.params;
  const { status, actualCost, expectedArrival, supplier, installationNote, warranty } = req.body;

  if (!job.requiredParts || !job.requiredParts[partIndex]) {
    return errorResponse(res, 'Part not found in repair job.', 404);
  }

  const part = job.requiredParts[partIndex];
  if (status) part.status = status;
  if (actualCost !== undefined) part.actualCost = actualCost;
  if (expectedArrival) part.expectedArrival = expectedArrival;
  if (supplier) part.supplier = supplier;
  if (installationNote) part.installationNote = installationNote;
  if (warranty) part.warranty = warranty;

  await job.save();

  const allPartsReceived = job.requiredParts.every((p) => ['received', 'installed', 'unavailable'].includes(p.status));

  return successResponse(res, { part, allPartsReceived, repairJob: job }, 'Part status updated');
});

const submitQualityCheck = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Repair job not found.', 404);
  if (job.technician.toString() !== req.user.userId.toString()) return errorResponse(res, 'Access denied.', 403);

  const { qualityChecks, completionReport, replacedParts, finalLaborCost, finalPartsCost, paymentMethod } = req.body;

  if (qualityChecks && Array.isArray(qualityChecks)) {
    job.qualityChecks = qualityChecks;
  }
  if (completionReport) job.completionReport = completionReport;
  if (replacedParts) job.replacedParts = replacedParts;
  if (finalLaborCost !== undefined) job.finalLaborCost = finalLaborCost;
  if (finalPartsCost !== undefined) job.finalPartsCost = finalPartsCost;
  job.finalTotalCost = (job.finalLaborCost || 0) + (job.finalPartsCost || 0);
  if (paymentMethod) job.paymentMethod = paymentMethod;

  if (req.files?.length > 0) {
    const uploaded = await uploadService.uploadMultiple(req.files, { folder: 'fixtogether/completions' });
    job.completionImages = uploaded.map((u) => ({ url: u.url, publicId: u.publicId }));
  }

  const { transitionRepairJob } = require('../services/stateTransitionService');
  await transitionRepairJob(job._id, REPAIR_JOB_STATUS.READY_FOR_COLLECTION, req.user, {
    note: 'Quality checks verified. Item marked ready for collection / return delivery.',
    req,
  });

  await createNotification({
    userId: job.owner.toString(),
    type: NOTIFICATION_TYPES.REPAIR_COMPLETED,
    title: 'Repair Completed & Verified',
    message: 'Your item has passed all quality checks and is ready for collection!',
    relatedEntityType: 'RepairJob',
    relatedEntityId: job._id,
  });

  return successResponse(res, { repairJob: job }, 'Quality checks recorded and item marked ready for collection');
});

const submitCompletion = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Not found.', 404);
  if (job.technician.toString() !== req.user.userId.toString()) return errorResponse(res, 'Access denied.', 403);

  const { completionReport, finalLaborCost, finalPartsCost, replacedParts, paymentMethod, handoverDetails } = req.body;
  job.completionReport = completionReport || job.completionReport || '';
  if (finalLaborCost !== undefined) job.finalLaborCost = finalLaborCost;
  if (finalPartsCost !== undefined) job.finalPartsCost = finalPartsCost;
  job.finalTotalCost = (job.finalLaborCost || 0) + (job.finalPartsCost || 0);
  if (replacedParts) job.replacedParts = replacedParts;
  if (paymentMethod) job.paymentMethod = paymentMethod;
  if (handoverDetails) job.handoverDetails = { ...job.handoverDetails, ...handoverDetails, handedOverAt: new Date() };
  job.technicianConfirmedCompletion = true;

  if (req.files?.length > 0) {
    const uploaded = await uploadService.uploadMultiple(req.files, { folder: 'fixtogether/completions' });
    job.completionImages = uploaded.map((u) => ({ url: u.url, publicId: u.publicId }));
  }

  const { transitionRepairJob } = require('../services/stateTransitionService');
  await transitionRepairJob(job._id, REPAIR_JOB_STATUS.READY_FOR_COLLECTION, req.user, {
    note: 'Technician submitted completion report. Ready for owner confirmation.',
    req,
  });

  await createNotification({
    userId: job.owner.toString(),
    type: NOTIFICATION_TYPES.REPAIR_COMPLETED,
    title: 'Repair Completed',
    message: 'The technician has marked your repair as complete. Please confirm handover and receipt.',
    relatedEntityType: 'RepairJob',
    relatedEntityId: job._id,
  });

  return successResponse(res, { repairJob: job }, 'Completion submitted');
});

const ownerConfirmCompletion = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Not found.', 404);
  if (job.owner.toString() !== req.user.userId.toString()) return errorResponse(res, 'Access denied.', 403);

  job.ownerAcceptedCompletion = true;
  job.completedAt = new Date();
  job.paymentStatus = req.body.paymentStatus || 'paid';
  if (job.handoverDetails) {
    job.handoverDetails.ownerConfirmedAt = new Date();
  }
  await job.save();

  const { transitionRepairJob } = require('../services/stateTransitionService');
  await transitionRepairJob(job._id, REPAIR_JOB_STATUS.COMPLETED, req.user, {
    note: 'Owner confirmed completion and received item.',
    req,
  });

  // Idempotent Warranty creation: only create if warranty does not exist
  let warranty = await Warranty.findOne({ repairJob: job._id });
  if (!warranty) {
    const quotation = await Quotation.findById(job.acceptedQuotation);
    const warrantyDays = quotation?.warrantyDays || 30;
    warranty = await Warranty.create({
      repairJob: job._id,
      technician: job.technician,
      owner: job.owner,
      startDate: new Date(),
      endDate: new Date(Date.now() + warrantyDays * 86400000),
      coveredProblem: job.completionReport || 'Standard repair coverage',
      status: WARRANTY_STATUS.ACTIVE,
    });
  }

  // Create impact record
  const request = await RepairRequest.findById(job.repairRequest).populate('item');
  if (request?.item) {
    const existingImpact = await ImpactRecord.findOne({ item: request.item._id, outcome: 'repaired' });
    if (!existingImpact) {
      await ImpactRecord.create({
        item: request.item._id,
        outcome: 'repaired',
        repairCost: job.finalTotalCost,
        verified: true,
      });
    }
  }

  await createNotification({
    userId: job.technician.toString(),
    type: NOTIFICATION_TYPES.WARRANTY_CREATED,
    title: 'Repair Confirmed',
    message: 'Owner confirmed completion. Warranty activated.',
    relatedEntityType: 'RepairJob',
    relatedEntityId: job._id,
  });

  return successResponse(res, { repairJob: job, warranty }, 'Completion confirmed');
});

// ===== REVIEWS =====
const createReview = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Not found.', 404);
  if (job.owner.toString() !== req.user.userId.toString()) return errorResponse(res, 'Access denied.', 403);
  if (!job.ownerAcceptedCompletion) return errorResponse(res, 'Repair must be confirmed before reviewing.', 400);

  const existing = await Review.findOne({ repairJob: job._id, reviewer: req.user.userId });
  if (existing) return errorResponse(res, 'You have already reviewed this repair.', 409);

  const review = await Review.create({
    repairJob: job._id, reviewer: req.user.userId, technician: job.technician, ...req.body,
  });

  // Update technician stats
  const { TechnicianProfile } = require('../models');
  const allReviews = await Review.find({ technician: job.technician, moderationStatus: 'approved' });
  const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
  await TechnicianProfile.findOneAndUpdate(
    { user: job.technician },
    { averageRating: Math.round(avgRating * 10) / 10, reviewCount: allReviews.length }
  );

  await createNotification({
    userId: job.technician.toString(), type: NOTIFICATION_TYPES.REVIEW_RECEIVED,
    title: 'New Review', message: `You received a ${review.rating}-star review.`,
    relatedEntityType: 'Review', relatedEntityId: review._id,
  });
  return successResponse(res, { review }, 'Review submitted', 201);
});

const getTechnicianReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [reviews, total] = await Promise.all([
    Review.find({ technician: req.params.id, moderationStatus: 'approved' })
      .populate('reviewer', 'fullName').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments({ technician: req.params.id, moderationStatus: 'approved' }),
  ]);
  return successResponse(res, { reviews, pagination: paginationMeta(total, page, limit) });
});

const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return errorResponse(res, 'Not found.', 404);
  if (review.reviewer.toString() !== req.user.userId.toString()) return errorResponse(res, 'Access denied.', 403);
  if (new Date() > review.editableUntil) return errorResponse(res, 'Edit window has passed.', 400);

  if (req.body.rating) review.rating = req.body.rating;
  if (req.body.reviewText !== undefined) review.reviewText = req.body.reviewText;
  if (req.body.communicationRating) review.communicationRating = req.body.communicationRating;
  if (req.body.serviceQualityRating) review.serviceQualityRating = req.body.serviceQualityRating;
  if (req.body.valueRating) review.valueRating = req.body.valueRating;
  await review.save();
  return successResponse(res, { review }, 'Review updated');
});

const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return errorResponse(res, 'Not found.', 404);
  if (review.reviewer.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
    return errorResponse(res, 'Access denied.', 403);
  }
  await Review.findByIdAndDelete(req.params.id);
  return successResponse(res, null, 'Review deleted');
});

// ===== DISPUTES =====
const createDispute = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Not found.', 404);
  const isOwner = job.owner.toString() === req.user.userId.toString();
  const isTech = job.technician.toString() === req.user.userId.toString();
  if (!isOwner && !isTech) return errorResponse(res, 'Access denied.', 403);

  const dispute = await Dispute.create({
    repairJob: job._id, openedBy: req.user.userId,
    againstUser: isOwner ? job.technician : job.owner, ...req.body,
  });

  job.currentStatus = REPAIR_JOB_STATUS.DISPUTED;
  await job.save();
  await RepairRequest.findByIdAndUpdate(job.repairRequest, { requestStatus: REPAIR_REQUEST_STATUS.DISPUTED });

  const notifyUser = isOwner ? job.technician : job.owner;
  await createNotification({
    userId: notifyUser.toString(), type: NOTIFICATION_TYPES.DISPUTE_OPENED,
    title: 'Dispute Opened', message: 'A dispute has been opened regarding your repair.',
    relatedEntityType: 'Dispute', relatedEntityId: dispute._id,
  });
  return successResponse(res, { dispute }, 'Dispute opened', 201);
});

const getDisputes = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (req.user.role !== 'admin') {
    query.$or = [{ openedBy: req.user.userId }, { againstUser: req.user.userId }];
  }
  if (req.query.status) query.status = req.query.status;

  const [disputes, total] = await Promise.all([
    Dispute.find(query).populate('openedBy', 'fullName').populate('againstUser', 'fullName')
      .populate('repairJob', 'currentStatus').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Dispute.countDocuments(query),
  ]);
  return successResponse(res, { disputes, pagination: paginationMeta(total, page, limit) });
});

const getDisputeById = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id)
    .populate('openedBy', 'fullName email').populate('againstUser', 'fullName email')
    .populate('repairJob').populate('responses.user', 'fullName')
    .populate('assignedAdministrator', 'fullName');
  if (!dispute) return errorResponse(res, 'Not found.', 404);
  return successResponse(res, { dispute });
});

const addDisputeResponse = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) return errorResponse(res, 'Not found.', 404);
  dispute.responses.push({ user: req.user.userId, message: req.body.message, createdAt: new Date() });
  await dispute.save();
  return successResponse(res, { dispute }, 'Response added');
});

const requestMissingDisputeInfo = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) return errorResponse(res, 'Dispute not found.', 404);

  const { targetUserId, requestText } = req.body;
  if (!requestText?.trim()) return errorResponse(res, 'Request text is required.', 400);

  dispute.missingInfoRequests.push({
    requestedFrom: targetUserId || dispute.againstUser,
    requestText: requestText.trim(),
    requestedAt: new Date(),
  });
  dispute.status = 'awaiting_response';
  await dispute.save();

  await createNotification({
    userId: (targetUserId || dispute.againstUser).toString(),
    type: NOTIFICATION_TYPES.DISPUTE_OPENED,
    title: 'Dispute Mediation: Action Required',
    message: `Administrator requested additional information: "${requestText.substring(0, 100)}..."`,
    relatedEntityType: 'Dispute',
    relatedEntityId: dispute._id,
  });

  return successResponse(res, { dispute }, 'Missing information requested');
});

const addDisputeInternalNote = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) return errorResponse(res, 'Dispute not found.', 404);

  const { note } = req.body;
  if (!note?.trim()) return errorResponse(res, 'Note is required.', 400);

  dispute.internalNotes.push({
    admin: req.user.userId,
    note: note.trim(),
    createdAt: new Date(),
  });
  await dispute.save();

  return successResponse(res, { internalNotes: dispute.internalNotes }, 'Note added');
});

const resolveDispute = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) return errorResponse(res, 'Not found.', 404);

  const { decision, notes, internalFindings, consequencePreview, expectedVersion } = req.body;

  // Optimistic concurrency
  if (expectedVersion !== undefined && dispute.version !== expectedVersion) {
    return res.status(409).json({
      success: false,
      code: 'RESOURCE_VERSION_CONFLICT',
      message: 'This dispute was updated by another administrator.',
      latestVersion: dispute.version,
    });
  }

  dispute.status = 'resolved';
  dispute.resolution = {
    decision,
    notes,
    internalFindings: internalFindings || '',
    consequencePreview: consequencePreview || {},
    resolvedBy: req.user.userId,
  };
  dispute.resolvedAt = new Date();
  dispute.version += 1;
  await dispute.save();

  // Mark corresponding review queue item resolved
  await ReviewQueueItem.findOneAndUpdate(
    { entityType: 'dispute', entityId: dispute._id },
    { reviewState: 'resolved' }
  );

  await createNotification({
    userId: dispute.openedBy.toString(),
    type: NOTIFICATION_TYPES.DISPUTE_RESOLVED,
    title: 'Dispute Resolved',
    message: `Your dispute has been resolved: ${decision}`,
    relatedEntityType: 'Dispute',
    relatedEntityId: dispute._id,
  });

  await createNotification({
    userId: dispute.againstUser.toString(),
    type: NOTIFICATION_TYPES.DISPUTE_RESOLVED,
    title: 'Dispute Resolved',
    message: `Dispute decision finalized: ${decision}`,
    relatedEntityType: 'Dispute',
    relatedEntityId: dispute._id,
  });

  await createAuditLog({
    actor: req.user.userId,
    action: 'DISPUTE_RESOLVED',
    targetType: 'Dispute',
    targetId: dispute._id,
    metadata: { decision, notes },
  }, req);

  return successResponse(res, { dispute }, 'Dispute resolved');
});

// ===== WARRANTIES =====
const getWarranties = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (req.user.role === 'owner') query.owner = req.user.userId;
  else if (req.user.role === 'technician') query.technician = req.user.userId;

  const [warranties, total] = await Promise.all([
    Warranty.find(query).populate('repairJob').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Warranty.countDocuments(query),
  ]);
  return successResponse(res, { warranties, pagination: paginationMeta(total, page, limit) });
});

const getWarrantyById = asyncHandler(async (req, res) => {
  const warranty = await Warranty.findById(req.params.id)
    .populate('repairJob').populate('technician', 'fullName').populate('owner', 'fullName');
  if (!warranty) return errorResponse(res, 'Not found.', 404);
  return successResponse(res, { warranty });
});

const submitWarrantyClaim = asyncHandler(async (req, res) => {
  const warranty = await Warranty.findById(req.params.id);
  if (!warranty) return errorResponse(res, 'Not found.', 404);
  if (warranty.owner.toString() !== req.user.userId.toString()) return errorResponse(res, 'Access denied.', 403);
  if (warranty.status !== WARRANTY_STATUS.ACTIVE) return errorResponse(res, 'Warranty is not active.', 400);
  if (new Date() > warranty.endDate) return errorResponse(res, 'Warranty has expired.', 400);

  warranty.warrantyClaims.push({ description: req.body.description, status: 'submitted' });
  warranty.status = WARRANTY_STATUS.CLAIMED;
  await warranty.save();
  return successResponse(res, { warranty }, 'Claim submitted');
});

const updateWarrantyClaimStatus = asyncHandler(async (req, res) => {
  const warranty = await Warranty.findById(req.params.id);
  if (!warranty) return errorResponse(res, 'Not found.', 404);
  const { claimIndex, status, resolution } = req.body;
  if (warranty.warrantyClaims[claimIndex]) {
    warranty.warrantyClaims[claimIndex].status = status;
    warranty.warrantyClaims[claimIndex].resolution = resolution || '';
    if (status === 'approved' || status === 'rejected') {
      warranty.warrantyClaims[claimIndex].resolvedAt = new Date();
    }
  }
  await warranty.save();
  return successResponse(res, { warranty }, 'Claim updated');
});

// ===== DONATIONS =====
const createDonation = asyncHandler(async (req, res) => {
  const { Item: ItemModel } = require('../models');
  const item = await ItemModel.findOne({ _id: req.body.itemId, owner: req.user.userId });
  if (!item) return errorResponse(res, 'Item not found.', 404);

  const donation = await DonationOffer.create({
    item: item._id, owner: req.user.userId, ...req.body, status: 'published',
  });
  item.currentPathway = 'donation';
  await item.save();
  return successResponse(res, { donation }, 'Donation offer created', 201);
});

const getDonations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (req.user.role === 'owner') query.owner = req.user.userId;
  else if (req.user.role === 'organization') {
    const orgProfile = await OrganizationProfile.findOne({ user: req.user.userId });
    if (orgProfile) query.matchedOrganizations = { $elemMatch: { organization: orgProfile._id } };
  }
  if (req.query.status) query.status = req.query.status;

  const [donations, total] = await Promise.all([
    DonationOffer.find(query).populate('item', 'title images category')
      .populate('owner', 'fullName').sort({ createdAt: -1 }).skip(skip).limit(limit),
    DonationOffer.countDocuments(query),
  ]);
  return successResponse(res, { donations, pagination: paginationMeta(total, page, limit) });
});

const getDonationById = asyncHandler(async (req, res) => {
  const donation = await DonationOffer.findById(req.params.id)
    .populate({ path: 'item', populate: { path: 'category' } })
    .populate('owner', 'fullName email')
    .populate('selectedOrganization');
  if (!donation) return errorResponse(res, 'Not found.', 404);
  return successResponse(res, { donation });
});

const getDonationMatches = asyncHandler(async (req, res) => {
  const donation = await DonationOffer.findById(req.params.id).populate('item');
  if (!donation) return errorResponse(res, 'Not found.', 404);

  const orgs = await OrganizationProfile.find({
    verificationStatus: 'approved', activeStatus: true,
    $or: [{ acceptedItemCategories: donation.item.category }, { neededItemCategories: donation.item.category }],
  }).populate('user', 'fullName');
  return successResponse(res, { organizations: orgs });
});

const acceptDonation = asyncHandler(async (req, res) => {
  const donation = await DonationOffer.findById(req.params.id);
  if (!donation) return errorResponse(res, 'Not found.', 404);
  const orgProfile = await OrganizationProfile.findOne({ user: req.user.userId });
  if (!orgProfile) return errorResponse(res, 'Organization profile required.', 403);

  donation.selectedOrganization = orgProfile._id;
  donation.status = 'accepted';
  await donation.save();

  await createNotification({
    userId: donation.owner.toString(), type: NOTIFICATION_TYPES.DONATION_ACCEPTED,
    title: 'Donation Accepted', message: `${orgProfile.organizationName} accepted your donation.`,
    relatedEntityType: 'DonationOffer', relatedEntityId: donation._id,
  });
  return successResponse(res, { donation }, 'Donation accepted');
});

const rejectDonation = asyncHandler(async (req, res) => {
  const donation = await DonationOffer.findById(req.params.id);
  if (!donation) return errorResponse(res, 'Not found.', 404);
  donation.status = 'rejected';
  await donation.save();
  return successResponse(res, { donation }, 'Donation rejected');
});

const scheduleDonationPickup = asyncHandler(async (req, res) => {
  const donation = await DonationOffer.findById(req.params.id);
  if (!donation) return errorResponse(res, 'Not found.', 404);
  donation.scheduledDate = req.body.scheduledDate;
  donation.status = 'pickup_scheduled';
  await donation.save();
  return successResponse(res, { donation }, 'Pickup scheduled');
});

const confirmHandover = asyncHandler(async (req, res) => {
  const donation = await DonationOffer.findById(req.params.id);
  if (!donation) return errorResponse(res, 'Not found.', 404);

  if (donation.owner.toString() === req.user.userId.toString()) {
    donation.ownerConfirmed = true;
  } else {
    donation.organizationConfirmed = true;
  }

  if (donation.ownerConfirmed && donation.organizationConfirmed) {
    donation.status = 'completed';
    donation.completedAt = new Date();
    donation.handoverCode = generateCode();

    // Impact record
    const { Item: ItemModel } = require('../models');
    const item = await ItemModel.findById(donation.item);
    if (item) {
      item.status = 'donated';
      await item.save();
      await ImpactRecord.create({ item: item._id, outcome: 'donated', verified: true });
    }
  }
  await donation.save();
  return successResponse(res, { donation }, 'Handover confirmed');
});

// ===== PARTS =====
const createPart = asyncHandler(async (req, res) => {
  const part = await Part.create({ ...req.body, seller: req.user.userId });
  return successResponse(res, { part }, 'Part listed', 201);
});

const getParts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { category, condition, search } = req.query;
  const query = { listingStatus: 'available' };
  if (category) query.category = category;
  if (condition) query.condition = condition;
  if (search) query.$text = { $search: search };

  const [parts, total] = await Promise.all([
    Part.find(query).populate('seller', 'fullName').populate('category', 'name')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    Part.countDocuments(query),
  ]);
  return successResponse(res, { parts, pagination: paginationMeta(total, page, limit) });
});

const getPartById = asyncHandler(async (req, res) => {
  const part = await Part.findById(req.params.id)
    .populate('seller', 'fullName').populate('category', 'name');
  if (!part) return errorResponse(res, 'Not found.', 404);
  return successResponse(res, { part });
});

const updatePart = asyncHandler(async (req, res) => {
  const part = await Part.findOne({ _id: req.params.id, seller: req.user.userId });
  if (!part) return errorResponse(res, 'Not found.', 404);
  Object.assign(part, req.body);
  await part.save();
  return successResponse(res, { part }, 'Part updated');
});

const reservePart = asyncHandler(async (req, res) => {
  const part = await Part.findById(req.params.id);
  if (!part) return errorResponse(res, 'Not found.', 404);
  if (part.listingStatus !== 'available') return errorResponse(res, 'Part is not available.', 400);
  part.listingStatus = 'reserved';
  part.reservedBy = req.user.userId;
  part.reservedAt = new Date();
  await part.save();
  return successResponse(res, { part }, 'Part reserved');
});

// ===== NOTIFICATIONS =====
const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [notifications, total, unreadCount] = await Promise.all([
    NotificationModel.find({ user: req.user.userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    NotificationModel.countDocuments({ user: req.user.userId }),
    NotificationModel.countDocuments({ user: req.user.userId, read: false }),
  ]);
  return successResponse(res, { notifications, unreadCount, pagination: paginationMeta(total, page, limit) });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  await NotificationModel.findOneAndUpdate(
    { _id: req.params.id, user: req.user.userId }, { read: true }
  );
  return successResponse(res, null, 'Marked as read');
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await NotificationModel.updateMany({ user: req.user.userId, read: false }, { read: true });
  return successResponse(res, null, 'All notifications marked as read');
});

module.exports = {
  createInspection,
  getInspection,
  ownerInspectionDecision,
  requestCostApproval,
  ownerCostApprovalDecision,
  getRepairJobs,
  getRepairJobById,
  updateRepairJobStatus,
  addParts,
  updatePartStatus,
  submitQualityCheck,
  submitCompletion,
  ownerConfirmCompletion,
  createReview,
  getTechnicianReviews,
  updateReview,
  deleteReview,
  createDispute,
  getDisputes,
  getDisputeById,
  addDisputeResponse,
  requestMissingDisputeInfo,
  addDisputeInternalNote,
  resolveDispute,
  getWarranties,
  getWarrantyById,
  submitWarrantyClaim,
  updateWarrantyClaimStatus,
  createDonation,
  getDonations,
  getDonationById,
  getDonationMatches,
  acceptDonation,
  rejectDonation,
  scheduleDonationPickup,
  confirmHandover,
  createPart,
  getParts,
  getPartById,
  updatePart,
  reservePart,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};

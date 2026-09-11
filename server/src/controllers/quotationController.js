const { Quotation, RepairRequest, RepairJob } = require('../models');
const { QUOTATION_STATUS, REPAIR_REQUEST_STATUS, NOTIFICATION_TYPES } = require('../constants');
const { asyncHandler, successResponse, errorResponse, parsePagination, paginationMeta } = require('../utils/helpers');
const { createNotification } = require('../services/notificationService');

const createQuotation = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findById(req.params.id);
  if (!request) return errorResponse(res, 'Repair request not found.', 404);

  // Check technician is invited or matched or listing is published
  const isInvited = request.selectedTechnicians?.some(
    (t) => t.technician.toString() === req.user.userId.toString() && t.status !== 'declined'
  );
  const isPublished = [
    REPAIR_REQUEST_STATUS.PUBLISHED,
    REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS,
    REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED,
    REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS,
  ].includes(request.requestStatus);

  if (!isInvited && !isPublished) {
    return errorResponse(res, 'You are not authorized to submit a quotation for this request.', 403);
  }

  // Check for existing active quotation from this technician
  const existing = await Quotation.findOne({
    repairRequest: req.params.id,
    technician: req.user.userId,
    status: { $in: [QUOTATION_STATUS.SUBMITTED, QUOTATION_STATUS.REVISED] },
  });
  if (existing) return errorResponse(res, 'You already have an active quotation for this repair request.', 409);

  // Trusted backend financial calculation & validation
  const inspectionFee = Math.max(0, Number(req.body.inspectionFee) || 0);
  const laborCostMinimum = Math.max(0, Number(req.body.laborCostMinimum) || 0);
  const laborCostMaximum = Math.max(laborCostMinimum, Number(req.body.laborCostMaximum) || laborCostMinimum);
  const partsEstimate = Math.max(0, Number(req.body.partsEstimate) || 0);
  const transportFee = Math.max(0, Number(req.body.transportFee) || 0);
  const otherCosts = Math.max(0, Number(req.body.otherCosts) || 0);
  const estimatedTotalMinimum = inspectionFee + laborCostMinimum + partsEstimate + transportFee + otherCosts;
  const estimatedTotalMaximum = inspectionFee + laborCostMaximum + partsEstimate + transportFee + otherCosts;

  let budgetWarning = null;
  if (request.budget?.maximum && estimatedTotalMaximum > request.budget.maximum) {
    budgetWarning = `Quotation total (৳${estimatedTotalMaximum}) exceeds owner's stated budget ceiling of ৳${request.budget.maximum}.`;
  }

  const quotation = await Quotation.create({
    repairRequest: req.params.id,
    technician: req.user.userId,
    ...req.body,
    inspectionFee,
    laborCostMinimum,
    laborCostMaximum,
    partsEstimate,
    transportFee,
    otherCosts,
    estimatedTotalMinimum,
    estimatedTotalMaximum,
    status: QUOTATION_STATUS.SUBMITTED,
  });

  // Update request status via state transition service if appropriate
  if (
    request.requestStatus === REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS ||
    request.requestStatus === REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS ||
    request.requestStatus === REPAIR_REQUEST_STATUS.PUBLISHED
  ) {
    const { transitionRepairRequest } = require('../services/stateTransitionService');
    await transitionRepairRequest(request._id, REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED, req.user, {
      reason: 'First quotation received from technician',
      req,
    });
  }

  // Update invitation status if technician was invited
  const inv = request.selectedTechnicians?.find(
    (t) => t.technician.toString() === req.user.userId.toString()
  );
  if (inv) {
    inv.status = 'accepted';
    inv.respondedAt = new Date();
    await request.save();
  }

  await createNotification({
    userId: request.owner.toString(),
    type: NOTIFICATION_TYPES.QUOTATION_SUBMITTED,
    title: 'New Quotation Received',
    message: `A technician has submitted a quotation (৳${estimatedTotalMinimum} - ৳${estimatedTotalMaximum}) for your repair request.`,
    relatedEntityType: 'Quotation',
    relatedEntityId: quotation._id,
  });

  return successResponse(
    res,
    { quotation, budgetWarning },
    'Quotation submitted successfully',
    201
  );
});

const getQuotationsForRequest = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findById(req.params.id);
  if (!request) return errorResponse(res, 'Not found.', 404);
  const isOwner = request.owner.toString() === req.user.userId.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) return errorResponse(res, 'Access denied.', 403);

  const quotations = await Quotation.find({ repairRequest: req.params.id })
    .populate('technician', 'fullName profileImage')
    .sort({ createdAt: -1 });
  return successResponse(res, { quotations });
});

const getQuotationById = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id)
    .populate('technician', 'fullName profileImage')
    .populate('repairRequest', 'owner item')
    .populate('previousQuotation');
  if (!quotation) return errorResponse(res, 'Quotation not found.', 404);
  return successResponse(res, { quotation });
});

const reviseQuotation = asyncHandler(async (req, res) => {
  const original = await Quotation.findById(req.params.id);
  if (!original) return errorResponse(res, 'Quotation not found.', 404);
  if (original.technician.toString() !== req.user.userId.toString()) {
    return errorResponse(res, 'Access denied.', 403);
  }
  if (original.status === QUOTATION_STATUS.ACCEPTED) {
    return errorResponse(res, 'Cannot directly edit an accepted quotation. Create a revision.', 400);
  }

  original.status = QUOTATION_STATUS.REVISED;
  await original.save();

  const revision = await Quotation.create({
    repairRequest: original.repairRequest,
    technician: req.user.userId,
    ...req.body,
    quotationType: 'revised',
    revisionNumber: original.revisionNumber + 1,
    previousQuotation: original._id,
    status: QUOTATION_STATUS.SUBMITTED,
  });

  // Check if cost increased - requires owner approval
  const request = await RepairRequest.findById(original.repairRequest);
  if (revision.estimatedTotalMaximum > original.estimatedTotalMaximum && request) {
    request.requestStatus = REPAIR_REQUEST_STATUS.AWAITING_OWNER_APPROVAL;
    await request.save();

    await createNotification({
      userId: request.owner.toString(), type: NOTIFICATION_TYPES.OWNER_APPROVAL_REQUIRED,
      title: 'Cost Revision Requires Approval',
      message: 'The technician has submitted a revised quotation with higher costs. Your approval is needed.',
      relatedEntityType: 'Quotation', relatedEntityId: revision._id,
    });
  }

  return successResponse(res, { quotation: revision }, 'Revision submitted');
});

const acceptQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return errorResponse(res, 'Not found.', 404);

  const request = await RepairRequest.findById(quotation.repairRequest);
  const isOwner = request.owner.toString() === req.user.userId.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) return errorResponse(res, 'Access denied.', 403);

  // Idempotency: if this exact quotation is already accepted, return success
  if (request.selectedQuotation?.toString() === quotation._id.toString()) {
    return successResponse(res, { quotation }, 'Quotation already accepted');
  }

  if (request.selectedQuotation) {
    return errorResponse(res, 'A different quotation has already been accepted.', 409);
  }

  quotation.status = QUOTATION_STATUS.ACCEPTED;
  quotation.ownerDecisionAt = new Date();
  await quotation.save();

  // Mark competing quotations as not selected
  await Quotation.updateMany(
    { repairRequest: request._id, _id: { $ne: quotation._id }, status: { $in: [QUOTATION_STATUS.SUBMITTED, QUOTATION_STATUS.REVISED] } },
    { status: QUOTATION_STATUS.NOT_SELECTED, ownerDecisionAt: new Date() }
  );

  request.selectedQuotation = quotation._id;
  request.requestStatus = REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED;
  await request.save();

  // Create repair job if not already created
  let repairJob = await RepairJob.findOne({ repairRequest: request._id });
  if (!repairJob) {
    repairJob = await RepairJob.create({
      repairRequest: request._id,
      owner: request.owner,
      technician: quotation.technician,
      acceptedQuotation: quotation._id,
    });
  }

  await createNotification({
    userId: quotation.technician.toString(),
    type: NOTIFICATION_TYPES.QUOTATION_ACCEPTED,
    title: 'Quotation Accepted',
    message: 'Your quotation has been accepted by the owner!',
    relatedEntityType: 'Quotation',
    relatedEntityId: quotation._id,
  });

  return successResponse(res, { quotation, repairJob }, 'Quotation accepted');
});

const rejectQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return errorResponse(res, 'Not found.', 404);
  const request = await RepairRequest.findById(quotation.repairRequest);
  if (!request) return errorResponse(res, 'Request not found.', 404);
  const isOwner = request.owner.toString() === req.user.userId.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) return errorResponse(res, 'Access denied.', 403);
  quotation.status = QUOTATION_STATUS.REJECTED;
  quotation.ownerDecisionAt = new Date();
  await quotation.save();
  return successResponse(res, { quotation }, 'Quotation rejected');
});

const withdrawQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return errorResponse(res, 'Not found.', 404);
  if (quotation.technician.toString() !== req.user.userId.toString()) return errorResponse(res, 'Access denied.', 403);
  if (quotation.status === QUOTATION_STATUS.ACCEPTED) return errorResponse(res, 'Cannot withdraw accepted quotation.', 400);
  quotation.status = QUOTATION_STATUS.WITHDRAWN;
  await quotation.save();
  return successResponse(res, { quotation }, 'Quotation withdrawn');
});

module.exports = { createQuotation, getQuotationsForRequest, getQuotationById,
  reviseQuotation, acceptQuotation, rejectQuotation, withdrawQuotation };

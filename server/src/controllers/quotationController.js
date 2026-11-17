const mongoose = require('mongoose');
const { Quotation, RepairRequest, RepairJob } = require('../models');
const { QUOTATION_STATUS, REPAIR_REQUEST_STATUS, NOTIFICATION_TYPES, ROLES } = require('../constants');
const { asyncHandler, successResponse, errorResponse } = require('../utils/helpers');
const { createNotification } = require('../services/notificationService');
const { transitionRepairRequest } = require('../services/stateTransitionService');
const { withTransaction } = require('../utils/transaction');

const QUOTABLE_REQUEST_STATUSES = [
  REPAIR_REQUEST_STATUS.PUBLISHED,
  REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS,
  REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED,
  REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS,
];

const TRANSITION_TO_QUOTES_RECEIVED = [
  REPAIR_REQUEST_STATUS.PUBLISHED,
  REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS,
  REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS,
];

const createHttpError = (status, message) => Object.assign(new Error(message), { status });
const hasId = (value, id) => value && value.toString() === id.toString();

const isEligibleTechnician = (request, technicianId) => {
  const isInvited = request.selectedTechnicians?.some(
    (entry) => hasId(entry.technician, technicianId) && entry.status !== 'declined'
  );
  return isInvited || QUOTABLE_REQUEST_STATUSES.includes(request.requestStatus);
};

const getFinancials = (body) => {
  const inspectionFee = Number(body.inspectionFee || 0);
  const laborCostMinimum = Number(body.laborCostMinimum || 0);
  const laborCostMaximum = Number(body.laborCostMaximum || laborCostMinimum);
  const partsEstimate = Number(body.partsEstimate || 0);
  const transportFee = Number(body.transportFee || 0);
  const otherCosts = Number(body.otherCosts || 0);

  return {
    inspectionFee,
    laborCostMinimum,
    laborCostMaximum: Math.max(laborCostMinimum, laborCostMaximum),
    partsEstimate,
    transportFee,
    otherCosts,
    estimatedTotalMinimum: inspectionFee + laborCostMinimum + partsEstimate + transportFee + otherCosts,
    estimatedTotalMaximum: inspectionFee + Math.max(laborCostMinimum, laborCostMaximum) + partsEstimate + transportFee + otherCosts,
  };
};

const buildQuotationPayload = ({ repairRequestId, technicianId, body, quotationType = 'initial', revisionNumber = 1, previousQuotation = null }) => ({
  repairRequest: repairRequestId,
  technician: technicianId,
  ...getFinancials(body),
  expectedDuration: body.expectedDuration,
  warrantyDays: body.warrantyDays,
  conditions: body.conditions || '',
  technicianNotes: body.technicianNotes || '',
  ...(body.expirationDate ? { expirationDate: body.expirationDate } : {}),
  quotationType,
  revisionNumber,
  previousQuotation,
  status: QUOTATION_STATUS.SUBMITTED,
});

const markInvitationAccepted = async (request, technicianId, session) => {
  const invitation = request.selectedTechnicians?.find((entry) => hasId(entry.technician, technicianId));
  if (!invitation) return;
  invitation.status = 'accepted';
  invitation.respondedAt = new Date();
  await request.save({ session });
};

const submitQuotation = async ({ requestId, technicianId, body, req }) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) throw createHttpError(400, 'Invalid repair request ID.');

  return withTransaction(async (session) => {
    const request = await RepairRequest.findById(requestId).session(session);
    if (!request) throw createHttpError(404, 'Repair request not found.');
    if (!isEligibleTechnician(request, technicianId)) {
      throw createHttpError(403, 'You are not authorized to submit a quotation for this request.');
    }

    const existing = await Quotation.findOne({
      repairRequest: request._id,
      technician: technicianId,
      status: QUOTATION_STATUS.SUBMITTED,
    }).session(session);
    if (existing) throw createHttpError(409, 'You already have an active quotation for this repair request.');

    const payload = buildQuotationPayload({ repairRequestId: request._id, technicianId, body });
    const [quotation] = await Quotation.create([payload], { session });

    if (TRANSITION_TO_QUOTES_RECEIVED.includes(request.requestStatus)) {
      await transitionRepairRequest(request._id, REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED, req.user, {
        reason: 'Quotation received from technician', req, session,
      });
    }
    await markInvitationAccepted(request, technicianId, session);

    const budgetWarning = request.budgetMaximum > 0 && quotation.estimatedTotalMaximum > request.budgetMaximum
      ? `Quotation total (BDT ${quotation.estimatedTotalMaximum}) exceeds the owner's stated budget ceiling of BDT ${request.budgetMaximum}.`
      : null;
    return { quotation, ownerId: request.owner, budgetWarning };
  });
};

const createQuotation = asyncHandler(async (req, res) => {
  try {
    const result = await submitQuotation({
      requestId: req.params.id,
      technicianId: req.user.userId,
      body: req.body,
      req,
    });
    await createNotification({
      userId: result.ownerId,
      type: NOTIFICATION_TYPES.QUOTATION_SUBMITTED,
      title: 'New Quotation Received',
      message: `A technician submitted a quotation (BDT ${result.quotation.estimatedTotalMinimum} - BDT ${result.quotation.estimatedTotalMaximum}).`,
      relatedEntityType: 'Quotation',
      relatedEntityId: result.quotation._id,
    });
    return successResponse(res, result, 'Quotation submitted successfully', 201);
  } catch (error) {
    if (error.status) return errorResponse(res, error.message, error.status);
    throw error;
  }
});

const getQuotationsForRequest = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return errorResponse(res, 'Invalid repair request ID.', 400);
  const request = await RepairRequest.findById(req.params.id);
  if (!request) return errorResponse(res, 'Not found.', 404);
  if (!hasId(request.owner, req.user.userId) && req.user.role !== ROLES.ADMIN) {
    return errorResponse(res, 'Access denied.', 403);
  }
  const quotations = await Quotation.find({ repairRequest: request._id })
    .populate('technician', 'fullName profileImage')
    .sort({ createdAt: -1 });
  return successResponse(res, { quotations });
});

const getQuotationById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return errorResponse(res, 'Invalid quotation ID.', 400);
  const quotation = await Quotation.findById(req.params.id)
    .populate('technician', 'fullName profileImage')
    .populate('repairRequest', 'owner item')
    .populate('previousQuotation');
  if (!quotation) return errorResponse(res, 'Quotation not found.', 404);
  const isTechnician = hasId(quotation.technician?._id || quotation.technician, req.user.userId);
  const isOwner = hasId(quotation.repairRequest?.owner, req.user.userId);
  if (!isTechnician && !isOwner && req.user.role !== ROLES.ADMIN) return errorResponse(res, 'Access denied.', 403);
  return successResponse(res, { quotation });
});

const reviseQuotation = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return errorResponse(res, 'Invalid quotation ID.', 400);
    const result = await withTransaction(async (session) => {
      const original = await Quotation.findById(req.params.id).session(session);
      if (!original) throw createHttpError(404, 'Quotation not found.');
      if (!hasId(original.technician, req.user.userId)) throw createHttpError(403, 'Access denied.');
      if (original.status !== QUOTATION_STATUS.SUBMITTED) {
        throw createHttpError(409, 'Only an active submitted quotation can be revised.');
      }

      const request = await RepairRequest.findById(original.repairRequest).session(session);
      if (!request) throw createHttpError(404, 'Repair request not found.');
      original.status = QUOTATION_STATUS.REVISED;
      await original.save({ session });

      const [revision] = await Quotation.create([buildQuotationPayload({
        repairRequestId: original.repairRequest,
        technicianId: req.user.userId,
        body: req.body,
        quotationType: 'revised',
        revisionNumber: original.revisionNumber + 1,
        previousQuotation: original._id,
      })], { session });
      return { revision, ownerId: request.owner };
    });

    await createNotification({
      userId: result.ownerId,
      type: NOTIFICATION_TYPES.QUOTATION_REVISED,
      title: 'Quotation Revised',
      message: 'A technician submitted a revised quotation. Review the new amount before accepting it.',
      relatedEntityType: 'Quotation',
      relatedEntityId: result.revision._id,
    });
    return successResponse(res, { quotation: result.revision }, 'Revision submitted');
  } catch (error) {
    if (error.status) return errorResponse(res, error.message, error.status);
    throw error;
  }
});

const acceptQuotation = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return errorResponse(res, 'Invalid quotation ID.', 400);
    const result = await withTransaction(async (session) => {
      const quotation = await Quotation.findById(req.params.id).session(session);
      if (!quotation) throw createHttpError(404, 'Not found.');
      const request = await RepairRequest.findById(quotation.repairRequest).session(session);
      if (!request) throw createHttpError(404, 'Repair request not found.');
      if (!hasId(request.owner, req.user.userId) && req.user.role !== ROLES.ADMIN) {
        throw createHttpError(403, 'Access denied.');
      }
      if (hasId(request.selectedQuotation, quotation._id)) {
        return { quotation, repairJob: await RepairJob.findOne({ repairRequest: request._id }).session(session), alreadyAccepted: true };
      }
      if (request.selectedQuotation) throw createHttpError(409, 'A different quotation has already been accepted.');
      if (quotation.status !== QUOTATION_STATUS.SUBMITTED) {
        throw createHttpError(409, 'Only an active submitted quotation can be accepted.');
      }
      if (quotation.expirationDate && quotation.expirationDate <= new Date()) {
        quotation.status = QUOTATION_STATUS.EXPIRED;
        await quotation.save({ session });
        return { quotation, repairJob: null, alreadyAccepted: false, expired: true };
      }

      quotation.status = QUOTATION_STATUS.ACCEPTED;
      quotation.ownerDecisionAt = new Date();
      await quotation.save({ session });
      await Quotation.updateMany(
        { repairRequest: request._id, _id: { $ne: quotation._id }, status: { $in: [QUOTATION_STATUS.SUBMITTED, QUOTATION_STATUS.REVISED] } },
        { status: QUOTATION_STATUS.NOT_SELECTED, ownerDecisionAt: new Date() },
        { session }
      );
      request.selectedQuotation = quotation._id;
      await request.save({ session });
      await transitionRepairRequest(request._id, REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED, req.user, {
        reason: 'Owner accepted quotation', req, session,
      });

      let repairJob = await RepairJob.findOne({ repairRequest: request._id }).session(session);
      if (!repairJob) {
        [repairJob] = await RepairJob.create([{
          repairRequest: request._id,
          owner: request.owner,
          technician: quotation.technician,
          acceptedQuotation: quotation._id,
        }], { session });
      }
      return { quotation, repairJob, alreadyAccepted: false };
    });

    if (result.expired) {
      return errorResponse(res, 'This quotation has expired and cannot be accepted.', 409);
    }

    if (!result.alreadyAccepted) {
      await createNotification({
        userId: result.quotation.technician,
        type: NOTIFICATION_TYPES.QUOTATION_ACCEPTED,
        title: 'Quotation Accepted',
        message: 'Your quotation has been accepted by the owner.',
        relatedEntityType: 'Quotation',
        relatedEntityId: result.quotation._id,
      });
    }
    return successResponse(res, { quotation: result.quotation, repairJob: result.repairJob }, result.alreadyAccepted ? 'Quotation already accepted' : 'Quotation accepted');
  } catch (error) {
    if (error.status) return errorResponse(res, error.message, error.status);
    throw error;
  }
});

const rejectQuotation = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return errorResponse(res, 'Invalid quotation ID.', 400);
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return errorResponse(res, 'Not found.', 404);
  const request = await RepairRequest.findById(quotation.repairRequest);
  if (!request) return errorResponse(res, 'Request not found.', 404);
  if (!hasId(request.owner, req.user.userId) && req.user.role !== ROLES.ADMIN) return errorResponse(res, 'Access denied.', 403);
  if (quotation.status !== QUOTATION_STATUS.SUBMITTED) return errorResponse(res, 'Only an active submitted quotation can be rejected.', 409);
  quotation.status = QUOTATION_STATUS.REJECTED;
  quotation.ownerDecisionAt = new Date();
  await quotation.save();
  return successResponse(res, { quotation }, 'Quotation rejected');
});

const withdrawQuotation = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return errorResponse(res, 'Invalid quotation ID.', 400);
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return errorResponse(res, 'Not found.', 404);
  if (!hasId(quotation.technician, req.user.userId)) return errorResponse(res, 'Access denied.', 403);
  if (quotation.status !== QUOTATION_STATUS.SUBMITTED) return errorResponse(res, 'Only an active submitted quotation can be withdrawn.', 409);
  quotation.status = QUOTATION_STATUS.WITHDRAWN;
  await quotation.save();
  return successResponse(res, { quotation }, 'Quotation withdrawn');
});

const quickQuote = asyncHandler(async (req, res) => {
  const estimatedTotal = Number(req.body.estimatedTotal || 0);
  const estimatedDays = Number(req.body.estimatedDays || 3);
  const warrantyDays = Number(req.body.warrantyDays || 30);
  const body = {
    inspectionFee: 0,
    laborCostMinimum: estimatedTotal,
    laborCostMaximum: estimatedTotal,
    partsEstimate: 0,
    transportFee: 0,
    otherCosts: 0,
    expectedDuration: { value: estimatedDays, unit: 'days' },
    warrantyDays,
    technicianNotes: req.body.notes || '',
  };
  try {
    const result = await submitQuotation({ requestId: req.params.id, technicianId: req.user.userId, body, req });
    await createNotification({
      userId: result.ownerId,
      type: NOTIFICATION_TYPES.QUOTATION_SUBMITTED,
      title: 'New Quick Quote Received',
      message: `A technician submitted a quick quote of BDT ${estimatedTotal} (${estimatedDays} days).`,
      relatedEntityType: 'Quotation',
      relatedEntityId: result.quotation._id,
    });
    return successResponse(res, { quotation: result.quotation }, 'Quick quote submitted successfully', 201);
  } catch (error) {
    if (error.status) return errorResponse(res, error.message, error.status);
    throw error;
  }
});

module.exports = { createQuotation, getQuotationsForRequest, getQuotationById, reviseQuotation, acceptQuotation, rejectQuotation, withdrawQuotation, quickQuote };

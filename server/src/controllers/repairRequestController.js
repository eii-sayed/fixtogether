const { RepairRequest, Item, AIAnalysis, TechnicianMatch, ItemCategory } = require('../models');
const { REPAIR_REQUEST_STATUS, REPAIR_STATUS_TRANSITIONS, NOTIFICATION_TYPES } = require('../constants');
const { asyncHandler, successResponse, errorResponse, parsePagination, paginationMeta } = require('../utils/helpers');
const aiService = require('../services/ai');
const safetyService = require('../services/safetyService');
const matchingService = require('../services/matchingService');
const { createNotification } = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * Validate status transition
 */
const isValidTransition = (currentStatus, newStatus) => {
  const allowed = REPAIR_STATUS_TRANSITIONS[currentStatus];
  return allowed && allowed.includes(newStatus);
};

/**
 * POST /repair-requests
 */
const createRepairRequest = asyncHandler(async (req, res) => {
  const { itemId, problemDescription, issueStartedAt, eventBeforeIssue,
    previousRepairAttempts, budgetMinimum, budgetMaximum, preferredServiceMethod, availability } = req.body;

  // Verify item ownership
  const item = await Item.findOne({ _id: itemId, owner: req.user.userId });
  if (!item) return errorResponse(res, 'Item not found or you are not the owner.', 404);

  const repairRequest = await RepairRequest.create({
    item: itemId,
    owner: req.user.userId,
    problemDescription,
    issueStartedAt,
    eventBeforeIssue,
    previousRepairAttempts,
    budgetMinimum,
    budgetMaximum,
    preferredServiceMethod,
    availability,
    requestStatus: REPAIR_REQUEST_STATUS.DRAFT,
  });

  return successResponse(res, { repairRequest }, 'Repair request created', 201);
});

/**
 * GET /repair-requests
 */
const getRepairRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, search } = req.query;
  const query = {};

  // Scope by role
  if (req.user.role === 'owner') {
    query.owner = req.user.userId;
  } else if (req.user.role === 'technician') {
    // Technicians see published requests or ones they're invited to
    query.$or = [
      { requestStatus: REPAIR_REQUEST_STATUS.PUBLISHED },
      { requestStatus: REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS },
      { requestStatus: REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED },
      { 'selectedTechnicians.technician': req.user.userId },
    ];
  }
  // Admin sees all

  if (status) query.requestStatus = status;
  if (search) query.$text = { $search: search };

  const [requests, total] = await Promise.all([
    RepairRequest.find(query)
      .populate('item', 'title category images condition')
      .populate('owner', 'fullName')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    RepairRequest.countDocuments(query),
  ]);

  return successResponse(res, { repairRequests: requests, pagination: paginationMeta(total, page, limit) });
});

/**
 * GET /repair-requests/:id
 */
const getRepairRequestById = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findById(req.params.id)
    .populate({ path: 'item', populate: { path: 'category', select: 'name icon riskLevel' } })
    .populate('owner', 'fullName email')
    .populate('aiAnalysis')
    .populate('selectedQuotation')
    .populate('selectedTechnicians.technician', 'fullName');

  if (!request) return errorResponse(res, 'Repair request not found.', 404);

  // Access control
  const isOwner = request.owner._id.toString() === req.user.userId.toString();
  const isTechnician = request.selectedTechnicians.some(
    (t) => t.technician?._id?.toString() === req.user.userId.toString()
  );
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isTechnician && !isAdmin) {
    // Return limited info for published requests
    if (request.requestStatus !== REPAIR_REQUEST_STATUS.PUBLISHED &&
        request.requestStatus !== REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS) {
      return errorResponse(res, 'Access denied.', 403);
    }
  }

  return successResponse(res, { repairRequest: request });
});

/**
 * PATCH /repair-requests/:id
 */
const updateRepairRequest = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!request) return errorResponse(res, 'Repair request not found.', 404);

  if (request.requestStatus !== REPAIR_REQUEST_STATUS.DRAFT) {
    return errorResponse(res, 'Can only edit draft repair requests.', 400);
  }

  const fields = ['problemDescription', 'issueStartedAt', 'eventBeforeIssue',
    'previousRepairAttempts', 'budgetMinimum', 'budgetMaximum', 'preferredServiceMethod', 'availability'];
  fields.forEach((f) => { if (req.body[f] !== undefined) request[f] = req.body[f]; });
  await request.save();

  return successResponse(res, { repairRequest: request }, 'Request updated');
});

/**
 * POST /repair-requests/:id/analyze
 */
const analyzeRepairRequest = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findOne({ _id: req.params.id, owner: req.user.userId })
    .populate({ path: 'item', populate: { path: 'category', select: 'name riskLevel prohibitedAIAdvice defaultQuestions' } });

  if (!request) return errorResponse(res, 'Repair request not found.', 404);

  // 1. Run deterministic safety checks FIRST
  const textToCheck = [
    request.problemDescription,
    request.eventBeforeIssue,
    request.previousRepairAttempts,
  ].filter(Boolean).join(' ');

  const safetyFlags = await safetyService.checkSafetyRules(textToCheck, request.item?.category?._id);

  // Save safety flags
  request.safetyFlags = safetyFlags.map((f) => ({
    type: f.type, severity: f.severity, reason: f.reason, detectedBy: 'rule',
  }));

  // Update status
  request.requestStatus = REPAIR_REQUEST_STATUS.AWAITING_AI_ANALYSIS;
  await request.save();

  // 2. Check if AI advice should be blocked
  const blockAI = safetyService.shouldBlockAIAdvice(safetyFlags);

  let aiResult = null;

  if (!blockAI) {
    try {
      // 3. Call AI service
      const result = await aiService.analyzeRepairRequest({
        title: request.item?.title || '',
        description: request.problemDescription,
        category: request.item?.category?.name || '',
        brand: request.item?.brand || '',
        condition: request.item?.condition || '',
        eventBefore: request.eventBeforeIssue,
        previousAttempts: request.previousRepairAttempts,
      });

      // 4. Save AI analysis
      const analysis = await AIAnalysis.create({
        repairRequest: request._id,
        provider: result.provider,
        model: result.model,
        promptVersion: '1.0',
        ...result.analysis,
        processingTime: result.processingTime,
      });

      request.aiAnalysis = analysis._id;

      // Add AI-generated clarification questions
      if (result.analysis.clarificationQuestions?.length > 0) {
        request.clarificationQuestions = result.analysis.clarificationQuestions.map((q) => ({
          question: q, source: 'ai', required: false, answered: false,
        }));
      }

      // Add category default questions
      if (request.item?.category?.defaultQuestions?.length > 0) {
        const catQuestions = request.item.category.defaultQuestions.map((q) => ({
          question: q.question, source: 'category', required: q.required, answered: false,
        }));
        request.clarificationQuestions.push(...catQuestions);
      }

      // Merge AI safety flags
      if (result.analysis.safetyFlags?.length > 0) {
        for (const flag of result.analysis.safetyFlags) {
          if (!request.safetyFlags.some((f) => f.type === flag.type)) {
            request.safetyFlags.push({ ...flag, detectedBy: 'ai' });
          }
        }
      }

      request.requestStatus = REPAIR_REQUEST_STATUS.AWAITING_OWNER_REVIEW;
      aiResult = result.analysis;
    } catch (error) {
      logger.error('AI analysis failed:', error.message);
      // Fallback to manual flow
      request.requestStatus = REPAIR_REQUEST_STATUS.AWAITING_OWNER_REVIEW;
    }
  } else {
    // Safety blocked AI - proceed with manual flow
    request.requestStatus = REPAIR_REQUEST_STATUS.AWAITING_OWNER_REVIEW;
  }

  await request.save();

  return successResponse(res, {
    repairRequest: request,
    aiAnalysis: aiResult,
    safetyFlags,
    aiBlocked: blockAI,
    safetyWarning: safetyService.generateSafetyWarning(safetyFlags),
  }, blockAI ? 'Safety concerns detected. AI advice has been restricted.' : 'Analysis complete');
});

/**
 * PATCH /repair-requests/:id/ai-review
 */
const reviewAIAnalysis = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!request) return errorResponse(res, 'Not found.', 404);

  if (request.aiAnalysis) {
    const analysis = await AIAnalysis.findById(request.aiAnalysis);
    if (analysis) {
      const { correctedCategory, correctedSubcategory, correctedSymptoms, correctionNotes } = req.body;
      analysis.ownerCorrections = {
        categoryChanged: !!correctedCategory && correctedCategory !== analysis.itemCategory,
        symptomsModified: !!correctedSymptoms,
        correctedCategory: correctedCategory || '',
        correctedSubcategory: correctedSubcategory || '',
        correctedSymptoms: correctedSymptoms || [],
        correctionNotes: correctionNotes || '',
        correctedAt: new Date(),
      };
      await analysis.save();
    }
  }

  return successResponse(res, { repairRequest: request }, 'AI review saved');
});

/**
 * POST /repair-requests/:id/answers
 */
const submitClarificationAnswers = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!request) return errorResponse(res, 'Not found.', 404);

  const { answers } = req.body;
  for (const answer of answers) {
    request.clarificationAnswers.push({
      questionIndex: answer.questionIndex,
      answer: answer.answer,
      answeredAt: new Date(),
    });
    if (request.clarificationQuestions[answer.questionIndex]) {
      request.clarificationQuestions[answer.questionIndex].answered = true;
    }
  }
  await request.save();
  return successResponse(res, { repairRequest: request }, 'Answers submitted');
});

/**
 * POST /repair-requests/:id/publish
 */
const publishRepairRequest = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!request) return errorResponse(res, 'Not found.', 404);

  if (!isValidTransition(request.requestStatus, REPAIR_REQUEST_STATUS.PUBLISHED)) {
    return errorResponse(res, `Cannot publish from status: ${request.requestStatus}`, 400);
  }

  request.requestStatus = REPAIR_REQUEST_STATUS.PUBLISHED;
  request.publishedAt = new Date();
  await request.save();

  // Trigger matching in background
  try {
    const populatedRequest = await RepairRequest.findById(request._id)
      .populate({ path: 'item', populate: { path: 'category' } })
      .populate('aiAnalysis');

    const matches = await matchingService.matchTechnicians(populatedRequest);
    if (matches.length > 0) {
      await matchingService.saveMatches(request._id, matches);
      request.requestStatus = REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS;
      await request.save();
    }
  } catch (error) {
    logger.error('Matching failed:', error.message);
  }

  return successResponse(res, { repairRequest: request }, 'Request published');
});

/**
 * POST /repair-requests/:id/cancel
 */
const cancelRepairRequest = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!request) return errorResponse(res, 'Not found.', 404);

  if (!isValidTransition(request.requestStatus, REPAIR_REQUEST_STATUS.CANCELLED)) {
    return errorResponse(res, `Cannot cancel from status: ${request.requestStatus}`, 400);
  }

  request.requestStatus = REPAIR_REQUEST_STATUS.CANCELLED;
  await request.save();
  return successResponse(res, { repairRequest: request }, 'Request cancelled');
});

/**
 * GET /repair-requests/:id/matches
 */
const getMatches = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findById(req.params.id);
  if (!request) return errorResponse(res, 'Not found.', 404);

  if (request.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
    return errorResponse(res, 'Access denied.', 403);
  }

  const matches = await TechnicianMatch.find({ repairRequest: req.params.id })
    .populate('technician', 'fullName profileImage')
    .sort({ totalScore: -1 });

  // Populate technician profiles
  const { TechnicianProfile } = require('../models');
  const enrichedMatches = [];
  for (const match of matches) {
    const profile = await TechnicianProfile.findOne({ user: match.technician._id })
      .populate('skills', 'name')
      .populate('supportedCategories', 'name');

    enrichedMatches.push({
      ...match.toJSON(),
      profile: profile ? {
        biography: profile.biography,
        skills: profile.skills,
        yearsOfExperience: profile.yearsOfExperience,
        averageRating: profile.averageRating,
        reviewCount: profile.reviewCount,
        completedRepairCount: profile.completedRepairCount,
        serviceMethods: profile.serviceMethods,
        priceRange: profile.priceRange,
        verificationStatus: profile.verificationStatus,
      } : null,
    });
  }

  return successResponse(res, { matches: enrichedMatches });
});

/**
 * POST /repair-requests/:id/invitations
 */
const sendInvitations = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!request) return errorResponse(res, 'Not found.', 404);

  const { technicianIds } = req.body;
  if (!technicianIds?.length) return errorResponse(res, 'No technicians selected.', 400);

  for (const techId of technicianIds) {
    const alreadyInvited = request.selectedTechnicians.some(
      (t) => t.technician.toString() === techId
    );
    if (!alreadyInvited) {
      request.selectedTechnicians.push({
        technician: techId, status: 'invited', invitedAt: new Date(),
      });

      // Update match status
      await TechnicianMatch.findOneAndUpdate(
        { repairRequest: request._id, technician: techId },
        { status: 'invited' }
      );

      // Notify technician
      await createNotification({
        userId: techId,
        type: NOTIFICATION_TYPES.QUOTATION_INVITATION,
        title: 'Quotation Invitation',
        message: `You've been invited to quote on a repair request.`,
        relatedEntityType: 'RepairRequest',
        relatedEntityId: request._id,
      });
    }
  }

  request.requestStatus = REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS;
  await request.save();

  return successResponse(res, { repairRequest: request }, 'Invitations sent');
});

module.exports = {
  createRepairRequest, getRepairRequests, getRepairRequestById, updateRepairRequest,
  analyzeRepairRequest, reviewAIAnalysis, submitClarificationAnswers, publishRepairRequest,
  cancelRepairRequest, getMatches, sendInvitations,
};

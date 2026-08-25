const { RepairRequest, Item, AIAnalysis, TechnicianMatch, ItemCategory, User, Notification, TechnicianProfile } = require('../models');
const { REPAIR_REQUEST_STATUS, REPAIR_STATUS_TRANSITIONS, NOTIFICATION_TYPES, ROLES } = require('../constants');
const { asyncHandler, successResponse, errorResponse, parsePagination, paginationMeta } = require('../utils/helpers');
const aiService = require('../services/ai');
const safetyService = require('../services/safetyService');
const matchingService = require('../services/matchingService');
const { createNotification, createBulkNotifications, getIO } = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * Statuses that are visible to technicians on the browse wall.
 * Drafts and internal review states are NEVER exposed to technicians.
 */
const TECHNICIAN_VISIBLE_STATUSES = [
  REPAIR_REQUEST_STATUS.PUBLISHED,
  REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS,
  REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS,
  REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED,
  REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED,
  REPAIR_REQUEST_STATUS.APPOINTMENT_SCHEDULED,
  REPAIR_REQUEST_STATUS.UNDER_INSPECTION,
  REPAIR_REQUEST_STATUS.AWAITING_OWNER_APPROVAL,
  REPAIR_REQUEST_STATUS.WAITING_FOR_PARTS,
  REPAIR_REQUEST_STATUS.REPAIR_IN_PROGRESS,
  REPAIR_REQUEST_STATUS.QUALITY_CHECK,
  REPAIR_REQUEST_STATUS.READY_FOR_COLLECTION,
  REPAIR_REQUEST_STATUS.COMPLETED,
  REPAIR_REQUEST_STATUS.REPAIR_UNSUCCESSFUL,
  REPAIR_REQUEST_STATUS.CANCELLED,
];

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
 *
 * Role-based filtering enforced server-side:
 * - Owner: sees only their own requests (including drafts)
 * - Technician: sees published/discoverable requests + ones they're assigned to; NEVER drafts
 * - Admin: sees all requests across all statuses
 */
/**
 * GET /repair-requests
 *
 * Role-based filtering enforced server-side:
 * - Owner tabs: Action Required, Active, Drafts, Completed, Cancelled
 * - Technician tabs: Available, Invited, Quoted, Assigned, In Progress, Completed (NEVER drafts)
 * - Admin tabs: All, Recently Published, Flagged, Unassigned, In Progress, Disputed, Completed
 */
const getRepairRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, tab, search } = req.query;
  const query = {};

  if (req.user.role === ROLES.OWNER) {
    // Owner sees only their own requests
    query.owner = req.user.userId;

    if (tab) {
      switch (tab) {
        case 'action_required':
          query.requestStatus = {
            $in: [
              REPAIR_REQUEST_STATUS.DRAFT,
              REPAIR_REQUEST_STATUS.AWAITING_OWNER_REVIEW,
              REPAIR_REQUEST_STATUS.AWAITING_CLARIFICATION,
              REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED,
              REPAIR_REQUEST_STATUS.AWAITING_OWNER_APPROVAL,
              REPAIR_REQUEST_STATUS.READY_FOR_COLLECTION,
            ],
          };
          break;
        case 'active':
          query.requestStatus = {
            $in: [
              REPAIR_REQUEST_STATUS.PUBLISHED,
              REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS,
              REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS,
              REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED,
              REPAIR_REQUEST_STATUS.APPOINTMENT_SCHEDULED,
              REPAIR_REQUEST_STATUS.UNDER_INSPECTION,
              REPAIR_REQUEST_STATUS.WAITING_FOR_PARTS,
              REPAIR_REQUEST_STATUS.REPAIR_IN_PROGRESS,
              REPAIR_REQUEST_STATUS.QUALITY_CHECK,
            ],
          };
          break;
        case 'drafts':
          query.requestStatus = {
            $in: [
              REPAIR_REQUEST_STATUS.DRAFT,
              REPAIR_REQUEST_STATUS.AWAITING_AI_ANALYSIS,
              REPAIR_REQUEST_STATUS.AWAITING_OWNER_REVIEW,
              REPAIR_REQUEST_STATUS.AWAITING_CLARIFICATION,
            ],
          };
          break;
        case 'completed':
          query.requestStatus = REPAIR_REQUEST_STATUS.COMPLETED;
          break;
        case 'cancelled':
          query.requestStatus = {
            $in: [
              REPAIR_REQUEST_STATUS.CANCELLED,
              REPAIR_REQUEST_STATUS.DISPUTED,
              REPAIR_REQUEST_STATUS.REPAIR_UNSUCCESSFUL,
            ],
          };
          break;
        default:
          break;
      }
    } else if (status) {
      query.requestStatus = status;
    }
  } else if (req.user.role === ROLES.TECHNICIAN) {
    const techUserId = req.user.userId;
    const { TechnicianProfile, Quotation } = require('../models');
    const { getMatchDetailsForTechnician } = require('../services/matchingService');

    const techProfile = await TechnicianProfile.findOne({ user: techUserId })
      .populate('skills')
      .populate('supportedCategories');

    if (tab) {
      switch (tab) {
        case 'recommended': {
          query.requestStatus = { $in: TECHNICIAN_VISIBLE_STATUSES };
          if (techProfile?.supportedCategories?.length > 0) {
            // Can match on category in item
          }
          break;
        }
        case 'nearby': {
          query.requestStatus = { $in: TECHNICIAN_VISIBLE_STATUSES };
          break;
        }
        case 'new':
        case 'available': {
          query.requestStatus = {
            $in: [
              REPAIR_REQUEST_STATUS.PUBLISHED,
              REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS,
              REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS,
            ],
          };
          break;
        }
        case 'invited': {
          query.requestStatus = { $in: TECHNICIAN_VISIBLE_STATUSES };
          query.selectedTechnicians = {
            $elemMatch: { technician: techUserId, status: 'invited' },
          };
          break;
        }
        case 'quoted': {
          const myQuotes = await Quotation.find({ technician: techUserId }).select('repairRequest').lean();
          const reqIds = myQuotes.map((q) => q.repairRequest);
          query._id = { $in: reqIds };
          query.requestStatus = { $in: TECHNICIAN_VISIBLE_STATUSES };
          break;
        }
        case 'saved': {
          query.requestStatus = { $in: TECHNICIAN_VISIBLE_STATUSES };
          break;
        }
        case 'assigned': {
          const acceptedQuotes = await Quotation.find({ technician: techUserId, status: 'accepted' }).select('repairRequest').lean();
          const reqIds = acceptedQuotes.map((q) => q.repairRequest);
          query._id = { $in: reqIds };
          query.requestStatus = { $in: TECHNICIAN_VISIBLE_STATUSES };
          break;
        }
        case 'in_progress': {
          const acceptedQuotes = await Quotation.find({ technician: techUserId, status: 'accepted' }).select('repairRequest').lean();
          const reqIds = acceptedQuotes.map((q) => q.repairRequest);
          query._id = { $in: reqIds };
          query.requestStatus = {
            $in: [
              REPAIR_REQUEST_STATUS.UNDER_INSPECTION,
              REPAIR_REQUEST_STATUS.AWAITING_OWNER_APPROVAL,
              REPAIR_REQUEST_STATUS.WAITING_FOR_PARTS,
              REPAIR_REQUEST_STATUS.REPAIR_IN_PROGRESS,
              REPAIR_REQUEST_STATUS.QUALITY_CHECK,
              REPAIR_REQUEST_STATUS.READY_FOR_COLLECTION,
            ],
          };
          break;
        }
        case 'completed': {
          const acceptedQuotes = await Quotation.find({ technician: techUserId, status: 'accepted' }).select('repairRequest').lean();
          const reqIds = acceptedQuotes.map((q) => q.repairRequest);
          query._id = { $in: reqIds };
          query.requestStatus = REPAIR_REQUEST_STATUS.COMPLETED;
          break;
        }
        default:
          query.$or = [
            { requestStatus: { $in: TECHNICIAN_VISIBLE_STATUSES } },
            { 'selectedTechnicians.technician': techUserId },
          ];
          break;
      }
    } else if (status) {
      if (status === REPAIR_REQUEST_STATUS.DRAFT) {
        // Technicians must never see drafts — return empty results immediately
        return successResponse(res, {
          repairRequests: [],
          pagination: paginationMeta(0, page, limit),
        });
      }
      query.$and = [
        {
          $or: [
            { requestStatus: { $in: TECHNICIAN_VISIBLE_STATUSES } },
            { 'selectedTechnicians.technician': techUserId },
          ],
        },
        { requestStatus: status },
      ];
    } else {
      query.$or = [
        { requestStatus: { $in: TECHNICIAN_VISIBLE_STATUSES } },
        { 'selectedTechnicians.technician': techUserId },
      ];
    }
  } else if (req.user.role === ROLES.ADMIN) {
    if (tab) {
      switch (tab) {
        case 'all':
          break;
        case 'recently_published':
          query.requestStatus = REPAIR_REQUEST_STATUS.PUBLISHED;
          break;
        case 'flagged':
          query['safetyFlags.0'] = { $exists: true };
          break;
        case 'unassigned':
          query.selectedQuotation = null;
          query.requestStatus = {
            $in: [
              REPAIR_REQUEST_STATUS.PUBLISHED,
              REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS,
              REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS,
              REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED,
            ],
          };
          break;
        case 'in_progress':
          query.requestStatus = {
            $in: [
              REPAIR_REQUEST_STATUS.UNDER_INSPECTION,
              REPAIR_REQUEST_STATUS.AWAITING_OWNER_APPROVAL,
              REPAIR_REQUEST_STATUS.WAITING_FOR_PARTS,
              REPAIR_REQUEST_STATUS.REPAIR_IN_PROGRESS,
              REPAIR_REQUEST_STATUS.QUALITY_CHECK,
            ],
          };
          break;
        case 'disputed':
          query.requestStatus = REPAIR_REQUEST_STATUS.DISPUTED;
          break;
        case 'completed':
          query.requestStatus = REPAIR_REQUEST_STATUS.COMPLETED;
          break;
        default:
          break;
      }
    } else if (status) {
      query.requestStatus = status;
    }
  }

  if (search) query.$text = { $search: search };

  const sortOption = req.user.role === ROLES.ADMIN && tab === 'recently_published'
    ? { publishedAt: -1, createdAt: -1 }
    : { createdAt: -1 };

  const [requests, total] = await Promise.all([
    RepairRequest.find(query)
      .populate({ path: 'item', populate: { path: 'category', select: 'name icon riskLevel' } })
      .populate('owner', 'fullName profileImage')
      .populate('selectedQuotation')
      .populate('selectedTechnicians.technician', 'fullName')
      .sort(sortOption)
      .skip(skip)
      .limit(limit),
    RepairRequest.countDocuments(query),
  ]);

  let sanitizedRequests = requests;

  if (req.user.role === ROLES.TECHNICIAN) {
    const { getMatchDetailsForTechnician } = require('../services/matchingService');
    const techProfile = await TechnicianProfile.findOne({ user: req.user.userId })
      .populate('skills')
      .populate('supportedCategories');

    sanitizedRequests = requests.map((r) => {
      const doc = r.toObject ? r.toObject() : r;
      // Redact private owner data
      if (doc.owner) {
        delete doc.owner.email;
        delete doc.owner.phone;
      }
      if (doc.item?.approximateLocation) {
        delete doc.item.approximateLocation.exactAddress;
      }

      // Calculate match score & explanation
      if (techProfile) {
        const matchData = getMatchDetailsForTechnician(doc, techProfile);
        doc.matchScore = matchData.totalScore;
        doc.matchExplanation = matchData.explanation;
        doc.matchBreakdown = matchData.breakdown;
      }

      return doc;
    });

    if (tab === 'recommended') {
      sanitizedRequests.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }
  }

  return successResponse(res, { repairRequests: sanitizedRequests, pagination: paginationMeta(total, page, limit) });
});

/**
 * GET /repair-requests/:id
 *
 * Authorization enforced per role:
 * - Owner: can view if they own it
 * - Technician: can view if status is NOT draft AND (discoverable OR assigned)
 * - Admin: can always view
 */
const getRepairRequestById = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findById(req.params.id)
    .populate({ path: 'item', populate: { path: 'category', select: 'name icon riskLevel' } })
    .populate('owner', 'fullName email')
    .populate('aiAnalysis')
    .populate('selectedQuotation')
    .populate('selectedTechnicians.technician', 'fullName');

  if (!request) return errorResponse(res, 'Repair request not found.', 404);

  const isOwner = request.owner._id.toString() === req.user.userId.toString();
  const isAdmin = req.user.role === ROLES.ADMIN;
  const isTechnicianRole = req.user.role === ROLES.TECHNICIAN;

  if (isOwner || isAdmin) {
    // Owner and admin always have access
    return successResponse(res, { repairRequest: request });
  }

  if (isTechnicianRole) {
    // Technicians must NEVER see drafts or internal review states
    if (
      request.requestStatus === REPAIR_REQUEST_STATUS.DRAFT ||
      request.requestStatus === REPAIR_REQUEST_STATUS.AWAITING_AI_ANALYSIS ||
      request.requestStatus === REPAIR_REQUEST_STATUS.AWAITING_OWNER_REVIEW ||
      request.requestStatus === REPAIR_REQUEST_STATUS.AWAITING_CLARIFICATION
    ) {
      return errorResponse(res, 'Access denied.', 403);
    }

    // Technician can view if discoverable OR assigned to them
    const isAssigned = request.selectedTechnicians.some(
      (t) => t.technician?._id?.toString() === req.user.userId.toString()
    );
    const isDiscoverable = TECHNICIAN_VISIBLE_STATUSES.includes(request.requestStatus);

    if (isAssigned || isDiscoverable) {
      const doc = request.toObject ? request.toObject() : request;
      
      // If not yet accepted, redact private contact information
      const isAcceptedTech = request.selectedQuotation && doc.selectedQuotation?.technician?.toString() === req.user.userId.toString();
      if (!isAcceptedTech) {
        if (doc.owner) {
          delete doc.owner.email;
          delete doc.owner.phone;
        }
        if (doc.item?.approximateLocation) {
          delete doc.item.approximateLocation.exactAddress;
        }
      }

      return successResponse(res, { repairRequest: doc });
    }
  }

  return errorResponse(res, 'Access denied.', 403);
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
 *
 * Publishes a repair request with idempotency:
 * - If already published (or beyond), returns success without side effects.
 * - Sets publishedAt, persists notifications for technicians and admins.
 * - Emits authenticated Socket.IO event 'repair-request:published'.
 * - Prevents duplicate notifications on re-publish.
 */
const publishRepairRequest = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!request) return errorResponse(res, 'Not found.', 404);

  // Idempotency: if already published or beyond, return success without duplicate side effects
  if (request.requestStatus !== REPAIR_REQUEST_STATUS.DRAFT &&
      request.requestStatus !== REPAIR_REQUEST_STATUS.AWAITING_AI_ANALYSIS &&
      request.requestStatus !== REPAIR_REQUEST_STATUS.AWAITING_OWNER_REVIEW &&
      request.requestStatus !== REPAIR_REQUEST_STATUS.AWAITING_CLARIFICATION) {
    return successResponse(res, { repairRequest: request }, 'Request is already published');
  }

  const { transitionRepairRequest } = require('../services/stateTransitionService');
  try {
    await transitionRepairRequest(request._id, REPAIR_REQUEST_STATUS.PUBLISHED, req.user, {
      reason: 'Owner published repair request',
      req,
    });
  } catch (err) {
    return errorResponse(res, err.message, 400);
  }

  // Populate for notifications and Socket.IO event
  const populatedRequest = await RepairRequest.findById(request._id)
    .populate({ path: 'item', populate: { path: 'category' } })
    .populate('owner', 'fullName')
    .populate('aiAnalysis');

  // Prevent duplicate notifications: check if we already notified for this request
  const existingNotification = await Notification.findOne({
    relatedEntityId: request._id,
    type: NOTIFICATION_TYPES.REPAIR_REQUEST_PUBLISHED,
  });

  if (!existingNotification) {
    // Find relevant technicians (all active technicians) and admins
    const [technicians, admins] = await Promise.all([
      User.find({ role: ROLES.TECHNICIAN, accountStatus: 'active' }).select('_id').lean(),
      User.find({ role: ROLES.ADMIN, accountStatus: 'active' }).select('_id').lean(),
    ]);

    const recipientIds = [
      ...technicians.map((t) => t._id),
      ...admins.map((a) => a._id),
    ];

    if (recipientIds.length > 0) {
      await createBulkNotifications(recipientIds, {
        type: NOTIFICATION_TYPES.REPAIR_REQUEST_PUBLISHED,
        title: 'New Repair Request Published',
        message: `A new repair request for "${populatedRequest.item?.title || 'an item'}" has been published.`,
        relatedEntityType: 'RepairRequest',
        relatedEntityId: request._id,
      });
    }
  }

  // Emit authenticated Socket.IO event
  const io = getIO();
  if (io) {
    io.emit('repair-request:published', {
      repairRequest: {
        _id: populatedRequest._id,
        item: populatedRequest.item,
        owner: populatedRequest.owner,
        requestStatus: populatedRequest.requestStatus,
        publishedAt: populatedRequest.publishedAt,
        problemDescription: populatedRequest.problemDescription,
      },
    });
  }

  // Trigger matching in background
  try {
    const matches = await matchingService.matchTechnicians(populatedRequest);
    if (matches.length > 0) {
      await matchingService.saveMatches(request._id, matches);
      await RepairRequest.findByIdAndUpdate(request._id, { requestStatus: REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS });
    }
  } catch (error) {
    logger.error('Matching failed:', error.message);
  }

  const finalRequest = await RepairRequest.findById(request._id);
  return successResponse(res, { repairRequest: finalRequest }, 'Request published');
});

/**
 * POST /repair-requests/:id/cancel
 */
const cancelRepairRequest = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!request) return errorResponse(res, 'Not found.', 404);

  const { transitionRepairRequest } = require('../services/stateTransitionService');
  try {
    await transitionRepairRequest(request._id, REPAIR_REQUEST_STATUS.CANCELLED, req.user, {
      reason: req.body.reason || 'Owner cancelled request',
      req,
    });
  } catch (err) {
    return errorResponse(res, err.message, 400);
  }

  const updatedRequest = await RepairRequest.findById(request._id);
  return successResponse(res, { repairRequest: updatedRequest }, 'Request cancelled');
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

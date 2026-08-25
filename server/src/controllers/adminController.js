const {
  User,
  RepairRequest,
  RepairJob,
  DonationOffer,
  Dispute,
  ImpactRecord,
  AIAnalysis,
  AuditLog,
  SafetyRule,
  TechnicianProfile,
  OrganizationProfile,
  ItemCategory,
  Skill,
  ReviewQueueItem,
} = require('../models');
const {
  ROLES,
  REPAIR_REQUEST_STATUS,
  REPAIR_JOB_STATUS,
  DISPUTE_STATUS,
  VERIFICATION_STATUS,
  REVIEW_QUEUE_TYPE,
  REVIEW_QUEUE_STATE,
  REVIEW_PRIORITY,
} = require('../constants');
const {
  asyncHandler,
  successResponse,
  errorResponse,
  parsePagination,
  paginationMeta,
} = require('../utils/helpers');
const reviewQueueService = require('../services/reviewQueueService');
const safetyService = require('../services/safetyService');
const backgroundJobService = require('../services/backgroundJobService');
const { createAuditLog } = require('../middleware/auditLog');

/**
 * 1. ADMIN COMMAND CENTER DASHBOARD
 * Prioritizes urgent work before general metrics.
 */
const getDashboard = asyncHandler(async (req, res) => {
  // Synchronize queue items in the background
  await reviewQueueService.syncReviewQueue();

  const now = new Date();

  // Fetch prioritized queue items & metrics in parallel
  const [
    urgentQueueItems,
    criticalSafetyFlags,
    highPriorityDisputes,
    pendingTechs,
    pendingOrgs,
    stalledRequests,
    totalUsers,
    totalOwners,
    totalTechnicians,
    totalOrganizations,
    totalAdmins,
    activeRequests,
    completedRepairs,
    totalImpact,
    aiAnalysesCount,
    monthlyActivity,
  ] = await Promise.all([
    ReviewQueueItem.find({
      reviewState: { $in: [REVIEW_QUEUE_STATE.PENDING, REVIEW_QUEUE_STATE.IN_REVIEW, REVIEW_QUEUE_STATE.ESCALATED] },
    })
      .sort({ priority: -1, submittedAt: 1 })
      .limit(10)
      .populate('assignedAdmin', 'fullName email')
      .populate('lock.lockedBy', 'fullName email'),
    RepairRequest.find({ 'safetyFlags.severity': 'critical', requestStatus: { $nin: ['completed', 'cancelled'] } })
      .populate('owner', 'fullName email')
      .populate('item', 'title')
      .limit(5),
    Dispute.find({ status: { $in: [DISPUTE_STATUS.OPEN, DISPUTE_STATUS.UNDER_REVIEW] } })
      .populate('openedBy', 'fullName')
      .populate('againstUser', 'fullName')
      .populate({ path: 'repairJob', populate: { path: 'repairRequest', populate: { path: 'item', select: 'title' } } })
      .limit(5),
    TechnicianProfile.countDocuments({ verificationStatus: VERIFICATION_STATUS.PENDING }),
    OrganizationProfile.countDocuments({ verificationStatus: VERIFICATION_STATUS.PENDING }),
    RepairRequest.find({
      requestStatus: REPAIR_REQUEST_STATUS.PUBLISHED,
      publishedAt: { $lt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
    }).limit(5),
    User.countDocuments(),
    User.countDocuments({ role: ROLES.OWNER }),
    User.countDocuments({ role: ROLES.TECHNICIAN }),
    User.countDocuments({ role: ROLES.ORGANIZATION }),
    User.countDocuments({ role: ROLES.ADMIN }),
    RepairRequest.countDocuments({ requestStatus: { $nin: ['completed', 'cancelled', 'draft'] } }),
    RepairJob.countDocuments({ currentStatus: REPAIR_JOB_STATUS.COMPLETED }),
    ImpactRecord.aggregate([
      {
        $group: {
          _id: null,
          totalWasteAvoided: { $sum: '$estimatedWasteAvoided' },
          totalCostSaved: { $sum: { $subtract: ['$estimatedReplacementCost', '$repairCost'] } },
        },
      },
    ]),
    AIAnalysis.countDocuments(),
    RepairRequest.aggregate([
      { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return successResponse(res, {
    urgentQueue: urgentQueueItems,
    criticalAlerts: {
      criticalSafetyFlags,
      highPriorityDisputes,
      pendingVerificationsCount: pendingTechs + pendingOrgs,
      stalledRequestsCount: stalledRequests.length,
    },
    systemHealth: {
      status: 'operational',
      database: 'connected',
      apiUptime: process.uptime(),
      failedPlatformOperationsCount: 0,
    },
    metrics: {
      users: { total: totalUsers, owners: totalOwners, technicians: totalTechnicians, organizations: totalOrganizations, admins: totalAdmins },
      repairs: { active: activeRequests, completed: completedRepairs },
      impact: totalImpact[0] || { totalWasteAvoided: 0, totalCostSaved: 0 },
      aiAnalysesCount,
    },
    monthlyActivity,
  });
});

/**
 * 2. UNIFIED ADMIN REVIEW QUEUE
 */
const getReviewQueue = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { tab, priority, reviewState, assignedAdmin, search } = req.query;

  // Always sync before listing
  await reviewQueueService.syncReviewQueue();

  const query = {};

  if (tab && tab !== 'all') {
    if (tab === 'critical') query.priority = REVIEW_PRIORITY.CRITICAL;
    else if (tab === 'safety') query.entityType = REVIEW_QUEUE_TYPE.SAFETY_FLAG;
    else if (tab === 'verifications') query.entityType = REVIEW_QUEUE_TYPE.VERIFICATION;
    else if (tab === 'disputes') query.entityType = REVIEW_QUEUE_TYPE.DISPUTE;
    else if (tab === 'users') query.entityType = REVIEW_QUEUE_TYPE.USER_APPEAL;
    else if (tab === 'requests') query.entityType = { $in: [REVIEW_QUEUE_TYPE.SAFETY_FLAG, REVIEW_QUEUE_TYPE.STALLED_REQUEST] };
    else if (tab === 'organizations') query.entityModel = 'OrganizationProfile';
  }

  if (priority) query.priority = priority;
  if (reviewState) query.reviewState = reviewState;
  if (assignedAdmin) query.assignedAdmin = assignedAdmin;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { reason: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    ReviewQueueItem.find(query)
      .sort({ priority: -1, slaDeadline: 1, submittedAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedAdmin', 'fullName email profileImage')
      .populate('lock.lockedBy', 'fullName email')
      .populate('internalNotes.admin', 'fullName'),
    ReviewQueueItem.countDocuments(query),
  ]);

  return successResponse(res, {
    items,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * Assign queue item
 */
const assignQueueItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body;

  const item = await ReviewQueueItem.findById(id);
  if (!item) return errorResponse(res, 'Queue item not found.', 404);

  item.assignedAdmin = adminId || req.user.userId;
  item.reviewState = REVIEW_QUEUE_STATE.IN_REVIEW;
  await item.save();

  await createAuditLog(
    {
      actor: req.user.userId,
      action: 'QUEUE_ITEM_ASSIGNED',
      targetType: 'ReviewQueueItem',
      targetId: id,
      metadata: { assignedTo: item.assignedAdmin },
    },
    req
  );

  return successResponse(res, { item }, 'Item assigned successfully');
});

/**
 * Acquire Review Lock
 */
const acquireQueueLock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lockResult = await reviewQueueService.acquireLock(id, req.user.userId);

  if (!lockResult.acquired) {
    return res.status(409).json({
      success: false,
      code: 'RESOURCE_LOCKED',
      message: `Item is currently being reviewed by ${lockResult.lockedBy?.fullName || 'another administrator'}.`,
      lockedBy: lockResult.lockedBy,
      expiresAt: lockResult.expiresAt,
    });
  }

  return successResponse(res, { item: lockResult.item }, 'Review lock acquired');
});

/**
 * Release Review Lock
 */
const releaseQueueLock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await reviewQueueService.releaseLock(id, req.user.userId);
  return successResponse(res, null, 'Review lock released');
});

/**
 * Takeover Review Lock
 */
const takeoverQueueLock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const item = await reviewQueueService.takeoverLock(id, req.user.userId, reason, req);
  return successResponse(res, { item }, 'Review lock taken over successfully');
});

/**
 * Update Queue Item Review State & Note
 */
const updateQueueItemState = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reviewState, snoozedUntil, note, expectedVersion } = req.body;

  const item = await ReviewQueueItem.findById(id);
  if (!item) return errorResponse(res, 'Queue item not found.', 404);

  // Optimistic concurrency check
  if (expectedVersion !== undefined && item.version !== expectedVersion) {
    return res.status(409).json({
      success: false,
      code: 'RESOURCE_VERSION_CONFLICT',
      message: 'This record was updated by another administrator.',
      latestVersion: item.version,
    });
  }

  if (reviewState) item.reviewState = reviewState;
  if (snoozedUntil) item.snoozedUntil = new Date(snoozedUntil);
  if (note) {
    item.internalNotes.push({
      admin: req.user.userId,
      note,
      createdAt: new Date(),
    });
  }

  item.version += 1;
  await item.save();

  return successResponse(res, { item }, 'Queue item updated');
});

/**
 * Add Internal Note to Queue Item
 */
const addQueueInternalNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  if (!note?.trim()) return errorResponse(res, 'Note content is required.', 400);

  const item = await ReviewQueueItem.findById(id);
  if (!item) return errorResponse(res, 'Queue item not found.', 404);

  item.internalNotes.push({
    admin: req.user.userId,
    note: note.trim(),
    createdAt: new Date(),
  });
  await item.save();

  return successResponse(res, { internalNotes: item.internalNotes }, 'Note added');
});

/**
 * Safe Bulk Queue Actions
 */
const bulkUpdateQueueItems = asyncHandler(async (req, res) => {
  const { itemIds, action, snoozedUntil } = req.body;
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return errorResponse(res, 'Please provide an array of item IDs.', 400);
  }

  // Safety block: Never bulk approve verifications, cancel hazardous requests, or resolve disputes
  if (['approve_verification', 'resolve_dispute', 'dismiss_critical_flag', 'suspend_user'].includes(action)) {
    return errorResponse(res, 'High-risk and critical governance actions cannot be performed in bulk.', 403);
  }

  const update = {};
  if (action === 'assign_to_me') {
    update.assignedAdmin = req.user.userId;
    update.reviewState = REVIEW_QUEUE_STATE.IN_REVIEW;
  } else if (action === 'snooze' && snoozedUntil) {
    update.reviewState = REVIEW_QUEUE_STATE.SNOOZED;
    update.snoozedUntil = new Date(snoozedUntil);
  } else if (action === 'mark_pending') {
    update.reviewState = REVIEW_QUEUE_STATE.PENDING;
  }

  await ReviewQueueItem.updateMany({ _id: { $in: itemIds } }, { $set: update, $inc: { version: 1 } });

  await createAuditLog(
    {
      actor: req.user.userId,
      action: 'QUEUE_BULK_UPDATE',
      targetType: 'ReviewQueueItem',
      metadata: { count: itemIds.length, action },
    },
    req
  );

  return successResponse(res, { updatedCount: itemIds.length }, 'Bulk update applied');
});

/**
 * 3. SAFETY GOVERNANCE & RULES
 */
const getSafetyRules = asyncHandler(async (req, res) => {
  const rules = await SafetyRule.find().sort({ severity: -1, createdAt: -1 });
  return successResponse(res, { rules });
});

const createSafetyRule = asyncHandler(async (req, res) => {
  const { name, patternType, regexPattern, keywords, riskType, severity, warningMessage, technicianWarningMessage, blockAIAdvice, testCases, changeReason } = req.body;

  if (patternType === 'regex' && regexPattern) {
    const val = safetyService.validateRegexPattern(regexPattern);
    if (!val.valid) return errorResponse(res, val.message, 400);
  }

  const rule = await SafetyRule.create({
    name,
    patternType: patternType || 'keyword',
    regexPattern: regexPattern || '',
    keywords: keywords || [],
    riskType,
    severity,
    warningMessage,
    technicianWarningMessage: technicianWarningMessage || '',
    blockAIAdvice: blockAIAdvice !== undefined ? blockAIAdvice : true,
    testCases: testCases || [],
    version: 1,
    versionHistory: [
      {
        version: 1,
        changedBy: req.user.userId,
        snapshot: req.body,
        changeReason: changeReason || 'Initial rule creation',
        createdAt: new Date(),
      },
    ],
  });

  await createAuditLog(
    {
      actor: req.user.userId,
      action: 'SAFETY_RULE_CREATED',
      targetType: 'SafetyRule',
      targetId: rule._id,
      metadata: { riskType, severity, patternType },
    },
    req
  );

  return successResponse(res, { rule }, 'Safety rule created', 201);
});

const updateSafetyRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { patternType, regexPattern, changeReason, expectedVersion } = req.body;

  const rule = await SafetyRule.findById(id);
  if (!rule) return errorResponse(res, 'Safety rule not found.', 404);

  // Optimistic concurrency
  if (expectedVersion !== undefined && rule.version !== expectedVersion) {
    return res.status(409).json({
      success: false,
      code: 'RESOURCE_VERSION_CONFLICT',
      message: 'This safety rule was updated by another administrator.',
      latestVersion: rule.version,
    });
  }

  if (patternType === 'regex' && regexPattern) {
    const val = safetyService.validateRegexPattern(regexPattern);
    if (!val.valid) return errorResponse(res, val.message, 400);
  }

  // Record version history snapshot
  rule.versionHistory.push({
    version: rule.version,
    changedBy: req.user.userId,
    snapshot: rule.toObject(),
    changeReason: changeReason || 'Rule parameters updated',
    createdAt: new Date(),
  });

  Object.assign(rule, req.body);
  rule.version += 1;
  await rule.save();

  await createAuditLog(
    {
      actor: req.user.userId,
      action: 'SAFETY_RULE_UPDATED',
      targetType: 'SafetyRule',
      targetId: rule._id,
      metadata: { changeReason, version: rule.version },
    },
    req
  );

  return successResponse(res, { rule }, 'Safety rule updated');
});

const deleteSafetyRule = asyncHandler(async (req, res) => {
  await SafetyRule.findByIdAndUpdate(req.params.id, { active: false });
  await createAuditLog(
    {
      actor: req.user.userId,
      action: 'SAFETY_RULE_DEACTIVATED',
      targetType: 'SafetyRule',
      targetId: req.params.id,
    },
    req
  );
  return successResponse(res, null, 'Safety rule deactivated');
});

const testSafetyRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const testResults = await safetyService.runRuleTestCases(id);
  return successResponse(res, testResults, 'Test cases executed');
});

const rollbackSafetyRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { targetVersion, reason } = req.body;

  const rule = await SafetyRule.findById(id);
  if (!rule) return errorResponse(res, 'Safety rule not found.', 404);

  const historyEntry = rule.versionHistory.find((vh) => vh.version === targetVersion);
  if (!historyEntry || !historyEntry.snapshot) {
    return errorResponse(res, `Version ${targetVersion} snapshot not found.`, 404);
  }

  const previousSnapshot = historyEntry.snapshot;
  delete previousSnapshot._id;
  delete previousSnapshot.createdAt;
  delete previousSnapshot.updatedAt;

  Object.assign(rule, previousSnapshot);
  rule.version += 1;
  rule.versionHistory.push({
    version: rule.version,
    changedBy: req.user.userId,
    snapshot: rule.toObject(),
    changeReason: `Rollback to version ${targetVersion}: ${reason || 'Administrator revert'}`,
    createdAt: new Date(),
  });

  await rule.save();

  await createAuditLog(
    {
      actor: req.user.userId,
      action: 'SAFETY_RULE_ROLLBACK',
      targetType: 'SafetyRule',
      targetId: rule._id,
      metadata: { targetVersion, reason },
    },
    req
  );

  return successResponse(res, { rule }, `Safety rule rolled back to version ${targetVersion}`);
});

/**
 * 4. FLAGGED LISTINGS GOVERNANCE
 */
const getFlaggedListings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [listings, total] = await Promise.all([
    RepairRequest.find({ 'safetyFlags.0': { $exists: true } })
      .populate('owner', 'fullName email')
      .populate('item', 'title category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RepairRequest.countDocuments({ 'safetyFlags.0': { $exists: true } }),
  ]);
  return successResponse(res, { listings, pagination: paginationMeta(total, page, limit) });
});

const updateFlaggedListing = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findById(req.params.id);
  if (!request) return errorResponse(res, 'Listing not found.', 404);

  const { action, note, reason } = req.body;

  if (action === 'dismiss') {
    // Dismiss false positive
    request.safetyFlags = [];
  } else if (action === 'cancel') {
    // Safely cancel hazardous listing
    request.requestStatus = REPAIR_REQUEST_STATUS.CANCELLED;
  } else if (action === 'restrict_technicians') {
    request.technicianVisibilityRestricted = true;
  }

  await request.save();

  // Mark corresponding review queue item resolved
  await ReviewQueueItem.findOneAndUpdate(
    { entityType: REVIEW_QUEUE_TYPE.SAFETY_FLAG, entityId: request._id },
    { reviewState: REVIEW_QUEUE_STATE.RESOLVED }
  );

  await createAuditLog(
    {
      actor: req.user.userId,
      action: `FLAGGED_LISTING_${action.toUpperCase()}`,
      targetType: 'RepairRequest',
      targetId: request._id,
      metadata: { action, note, reason },
    },
    req
  );

  return successResponse(res, { repairRequest: request }, 'Listing moderation completed');
});

/**
 * 5. IMMUTABLE AUDIT LOGS WITH REDACTION
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { action, actor, targetType, severity, success, startDate, endDate, correlationId } = req.query;

  const query = {};
  if (action) query.action = action;
  if (actor) query.actor = actor;
  if (targetType) query.targetType = targetType;
  if (severity) query.severity = severity;
  if (success !== undefined) query.success = success === 'true';
  if (correlationId) query.correlationId = correlationId;

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actor', 'fullName email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(query),
  ]);

  // Sanitize / redact any sensitive credential tokens
  const sanitizedLogs = logs.map((l) => {
    const doc = l.toObject();
    if (doc.metadata) {
      delete doc.metadata.password;
      delete doc.metadata.token;
      delete doc.metadata.refreshToken;
      delete doc.metadata.apiKey;
    }
    return doc;
  });

  return successResponse(res, {
    auditLogs: sanitizedLogs,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * 6. AI ANALYTICS & PROVIDER GOVERNANCE
 */
const getAIAnalytics = asyncHandler(async (req, res) => {
  const [total, byProvider, avgProcessingTime, correctionRate] = await Promise.all([
    AIAnalysis.countDocuments(),
    AIAnalysis.aggregate([{ $group: { _id: '$provider', count: { $sum: 1 } } }]),
    AIAnalysis.aggregate([{ $group: { _id: null, avgTime: { $avg: '$processingTime' } } }]),
    AIAnalysis.countDocuments({
      $or: [{ 'ownerCorrections.categoryChanged': true }, { 'ownerCorrections.symptomsModified': true }],
    }),
  ]);

  return successResponse(res, {
    totalAnalyses: total,
    byProvider,
    averageProcessingTime: avgProcessingTime[0]?.avgTime || 0,
    correctionCount: correctionRate,
    correctionRate: total > 0 ? Math.round((correctionRate / total) * 100) : 0,
  });
});

/**
 * 7. BACKGROUND JOBS DISPATCHER & STATUS
 */
const createAdminBackgroundJob = asyncHandler(async (req, res) => {
  const { type, payload } = req.body;
  const job = backgroundJobService.createJob(type, payload, req.user.userId);
  return successResponse(res, { job }, 'Background job queued', 202);
});

const getAdminBackgroundJobStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = backgroundJobService.getJobStatus(jobId);
  if (!job) return errorResponse(res, 'Job not found.', 404);
  return successResponse(res, { job });
});

const getImpactStats = asyncHandler(async (req, res) => {
  const [byOutcome, totals] = await Promise.all([
    ImpactRecord.aggregate([
      {
        $group: {
          _id: '$outcome',
          count: { $sum: 1 },
          totalWeight: { $sum: '$estimatedWeight' },
          totalWasteAvoided: { $sum: '$estimatedWasteAvoided' },
          totalCostSaved: { $sum: { $subtract: ['$estimatedReplacementCost', '$repairCost'] } },
        },
      },
    ]),
    ImpactRecord.aggregate([
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalWeight: { $sum: '$estimatedWeight' },
          totalWasteAvoided: { $sum: '$estimatedWasteAvoided' },
        },
      },
    ]),
  ]);
  return successResponse(res, { byOutcome, totals: totals[0] || {} });
});

module.exports = {
  getDashboard,
  getReviewQueue,
  assignQueueItem,
  acquireQueueLock,
  releaseQueueLock,
  takeoverQueueLock,
  updateQueueItemState,
  addQueueInternalNote,
  bulkUpdateQueueItems,
  getSafetyRules,
  createSafetyRule,
  updateSafetyRule,
  deleteSafetyRule,
  testSafetyRule,
  rollbackSafetyRule,
  getFlaggedListings,
  updateFlaggedListing,
  getAuditLogs,
  getAIAnalytics,
  getImpactStats,
  createAdminBackgroundJob,
  getAdminBackgroundJobStatus,
};

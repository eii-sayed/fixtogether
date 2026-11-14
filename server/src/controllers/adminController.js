const mongoose = require('mongoose');
const config = require('../config');
const { User, RepairRequest, RepairJob, Dispute, ImpactRecord, AIAnalysis, AuditLog, SafetyRule, TechnicianProfile, OrganizationProfile, ReviewQueueItem } = require('../models');
const {
  ROLES,
  REPAIR_REQUEST_STATUS,
  REPAIR_JOB_STATUS,
  DISPUTE_STATUS,
  VERIFICATION_STATUS,
  REVIEW_QUEUE_TYPE,
  REVIEW_QUEUE_STATE,
  REVIEW_PRIORITY,
  ADMIN_PERMISSIONS,
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
const { hasAdminPermission, queuePermissionForType } = require('../middleware/authorize');

const adminHasScope = (user, permission) => hasAdminPermission(user, permission);
const queueTypesForAdmin = (user) => {
  const allTypes = Object.values(REVIEW_QUEUE_TYPE);
  if (user.adminPermissions?.includes(ADMIN_PERMISSIONS.SUPER_ADMIN)) return allTypes;
  return allTypes.filter((type) => {
    const permission = queuePermissionForType(type);
    return permission && adminHasScope(user, permission);
  });
};

/**
 * 1. ADMIN COMMAND CENTER DASHBOARD
 * Prioritizes urgent work before general metrics.
 */
const getDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const allowedQueueTypes = queueTypesForAdmin(req.user);
  const queueQuery = {
    reviewState: { $in: [REVIEW_QUEUE_STATE.PENDING, REVIEW_QUEUE_STATE.IN_REVIEW, REVIEW_QUEUE_STATE.ESCALATED] },
    entityType: { $in: allowedQueueTypes },
  };
  const canSafety = adminHasScope(req.user, ADMIN_PERMISSIONS.SAFETY);
  const canDisputes = adminHasScope(req.user, ADMIN_PERMISSIONS.DISPUTES);
  const canSupport = adminHasScope(req.user, ADMIN_PERMISSIONS.SUPPORT);

  const [
    urgentQueueItems,
    urgentQueueCount,
    criticalSafetyFlags,
    criticalSafetyFlagsCount,
    highPriorityDisputes,
    pendingTechs,
    pendingOrgs,
    stalledRequests,
    stalledRequestsCount,
    highPriorityDisputesCount,
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
    ReviewQueueItem.find(queueQuery)
      .sort({ priority: -1, submittedAt: 1 })
      .limit(10)
      .populate('assignedAdmin', 'fullName email')
      .populate('lock.lockedBy', 'fullName email'),
    ReviewQueueItem.countDocuments(queueQuery),
    canSafety ? RepairRequest.find({ 'safetyFlags.severity': 'critical', requestStatus: { $nin: ['completed', 'cancelled'] } })
      .populate('owner', 'fullName email')
      .populate('item', 'title')
      .limit(5) : [],
    canSafety ? RepairRequest.countDocuments({ 'safetyFlags.severity': 'critical', requestStatus: { $nin: ['completed', 'cancelled'] } }) : 0,
    canDisputes ? Dispute.find({ status: { $in: [DISPUTE_STATUS.OPEN, DISPUTE_STATUS.UNDER_REVIEW, DISPUTE_STATUS.AWAITING_RESPONSE] } })
      .populate('openedBy', 'fullName')
      .populate('againstUser', 'fullName')
      .populate({ path: 'repairJob', populate: { path: 'repairRequest', populate: { path: 'item', select: 'title' } } })
      .limit(5) : [],
    adminHasScope(req.user, ADMIN_PERMISSIONS.VERIFICATION) ? TechnicianProfile.countDocuments({ verificationStatus: VERIFICATION_STATUS.PENDING }) : 0,
    adminHasScope(req.user, ADMIN_PERMISSIONS.VERIFICATION) ? OrganizationProfile.countDocuments({ verificationStatus: VERIFICATION_STATUS.PENDING }) : 0,
    canSupport ? RepairRequest.find({
      requestStatus: REPAIR_REQUEST_STATUS.PUBLISHED,
      publishedAt: { $lt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
    }).limit(5) : [],
    canSupport ? RepairRequest.countDocuments({
      requestStatus: REPAIR_REQUEST_STATUS.PUBLISHED,
      publishedAt: { $lt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
    }) : 0,
    canDisputes ? Dispute.countDocuments({ status: { $in: [DISPUTE_STATUS.OPEN, DISPUTE_STATUS.UNDER_REVIEW, DISPUTE_STATUS.AWAITING_RESPONSE] } }) : 0,
    canSupport ? User.countDocuments() : 0,
    canSupport ? User.countDocuments({ role: ROLES.OWNER }) : 0,
    canSupport ? User.countDocuments({ role: ROLES.TECHNICIAN }) : 0,
    canSupport ? User.countDocuments({ role: ROLES.ORGANIZATION }) : 0,
    canSupport ? User.countDocuments({ role: ROLES.ADMIN }) : 0,
    canSupport ? RepairRequest.countDocuments({ requestStatus: { $nin: ['completed', 'cancelled', 'draft'] } }) : 0,
    canSupport ? RepairJob.countDocuments({ currentStatus: REPAIR_JOB_STATUS.COMPLETED }) : 0,
    adminHasScope(req.user, ADMIN_PERMISSIONS.AUDIT) ? ImpactRecord.aggregate([
      {
        $group: {
          _id: null,
          totalWasteAvoided: { $sum: '$estimatedWasteAvoided' },
          totalCostSaved: { $sum: { $subtract: ['$estimatedReplacementCost', '$repairCost'] } },
        },
      },
    ]) : [],
    adminHasScope(req.user, ADMIN_PERMISSIONS.AUDIT) ? AIAnalysis.countDocuments() : 0,
    canSupport ? RepairRequest.aggregate([
      { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]) : [],
  ]);

  return successResponse(res, {
    urgentQueue: urgentQueueItems,
    urgentQueueCount,
    criticalAlerts: {
      criticalSafetyFlags,
      criticalSafetyFlagsCount,
      highPriorityDisputes,
      pendingVerificationsCount: pendingTechs + pendingOrgs,
      stalledRequestsCount,
      highPriorityDisputesCount,
    },
    systemHealth: {
      status: mongoose.connection.readyState === 1 ? 'operational' : 'degraded',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      apiUptime: process.uptime(),
      environment: config.env,
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
  const allowedQueueTypes = queueTypesForAdmin(req.user);
  const query = { entityType: { $in: allowedQueueTypes } };

  const setTabTypes = (types) => {
    query.entityType = { $in: allowedQueueTypes.filter((type) => types.includes(type)) };
  };

  if (tab && tab !== 'all') {
    if (tab === 'critical') query.priority = REVIEW_PRIORITY.CRITICAL;
    else if (tab === 'safety') setTabTypes([REVIEW_QUEUE_TYPE.SAFETY_FLAG]);
    else if (tab === 'verifications') setTabTypes([REVIEW_QUEUE_TYPE.VERIFICATION]);
    else if (tab === 'disputes') setTabTypes([REVIEW_QUEUE_TYPE.DISPUTE]);
    else if (tab === 'users') setTabTypes([REVIEW_QUEUE_TYPE.USER_APPEAL]);
    else if (tab === 'requests') setTabTypes([REVIEW_QUEUE_TYPE.SAFETY_FLAG, REVIEW_QUEUE_TYPE.STALLED_REQUEST]);
    else if (tab === 'organizations') {
      setTabTypes([REVIEW_QUEUE_TYPE.VERIFICATION]);
      query.entityModel = 'OrganizationProfile';
    }
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
  const now = new Date();
  if (item.lock?.lockedBy && item.lock.lockedBy.toString() !== req.user.userId.toString() && item.lock.expiresAt > now) {
    return res.status(409).json({ success: false, code: 'RESOURCE_LOCKED', message: 'This item is locked by another administrator.' });
  }
  const targetId = adminId || req.user.userId;
  if (!mongoose.Types.ObjectId.isValid(targetId)) return errorResponse(res, 'Invalid administrator ID.', 400);
  const targetAdmin = await User.findById(targetId).select('role accountStatus adminPermissions');
  const requiredScope = queuePermissionForType(item.entityType);
  if (!targetAdmin || targetAdmin.role !== ROLES.ADMIN || targetAdmin.accountStatus !== 'active' || !hasAdminPermission(targetAdmin, requiredScope)) {
    return errorResponse(res, 'Choose an active administrator with access to this queue.', 400);
  }

  const updated = await ReviewQueueItem.findOneAndUpdate(
    { _id: id, version: item.version },
    { $set: { assignedAdmin: targetId, reviewState: REVIEW_QUEUE_STATE.IN_REVIEW }, $inc: { version: 1 } },
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(409).json({ success: false, code: 'RESOURCE_VERSION_CONFLICT', message: 'This item changed. Reload and try again.' });

  await createAuditLog(
    {
      actor: req.user.userId,
      action: 'QUEUE_ITEM_ASSIGNED',
      targetType: 'ReviewQueueItem',
      targetId: id,
      metadata: { assignedTo: updated.assignedAdmin },
    },
    req
  );

  return successResponse(res, { item: updated }, 'Item assigned successfully');
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

  await createAuditLog({ actor: req.user.userId, action: 'QUEUE_LOCK_ACQUIRED', targetType: 'ReviewQueueItem', targetId: id }, req);

  return successResponse(res, { item: lockResult.item }, 'Review lock acquired');
});

/**
 * Release Review Lock
 */
const releaseQueueLock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const released = await reviewQueueService.releaseLock(id, req.user.userId);
  if (!released) return res.status(409).json({ success: false, code: 'LOCK_NOT_OWNED', message: 'This review lock is no longer held by you.' });
  await createAuditLog({ actor: req.user.userId, action: 'QUEUE_LOCK_RELEASED', targetType: 'ReviewQueueItem', targetId: id }, req);
  return successResponse(res, null, 'Review lock released');
});

/**
 * Takeover Review Lock
 */
const takeoverQueueLock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) return errorResponse(res, 'Provide a takeover reason of 500 characters or fewer.', 400);
  const item = await reviewQueueService.takeoverLock(id, req.user.userId, reason.trim(), req);
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

  if (reviewState && !Object.values(REVIEW_QUEUE_STATE).includes(reviewState)) {
    return errorResponse(res, 'Invalid review state.', 400);
  }
  if (reviewState === REVIEW_QUEUE_STATE.RESOLVED) {
    return errorResponse(res, 'Resolve the underlying verification, safety flag, or dispute in its workflow.', 400);
  }
  if (note !== undefined && (typeof note !== 'string' || note.trim().length > 2000)) {
    return errorResponse(res, 'Notes must be 2,000 characters or fewer.', 400);
  }
  if (!reviewState && !note?.trim()) return errorResponse(res, 'Provide a state change or an internal note.', 400);
  const now = new Date();
  if (item.lock?.lockedBy && item.lock.lockedBy.toString() !== req.user.userId.toString() && item.lock.expiresAt > now) {
    return res.status(409).json({ success: false, code: 'RESOURCE_LOCKED', message: 'This item is locked by another administrator.', expiresAt: item.lock.expiresAt });
  }
  let snoozeDate;
  if (reviewState === REVIEW_QUEUE_STATE.SNOOZED) {
    snoozeDate = new Date(snoozedUntil);
    if (!snoozedUntil || !Number.isFinite(snoozeDate.getTime()) || snoozeDate <= now || snoozeDate > new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
      return errorResponse(res, 'Choose a snooze time within the next 30 days.', 400);
    }
  }
  const set = {};
  if (reviewState) set.reviewState = reviewState;
  if (reviewState === REVIEW_QUEUE_STATE.SNOOZED) set.snoozedUntil = snoozeDate;
  else if (reviewState) set.snoozedUntil = null;
  const update = { $inc: { version: 1 } };
  if (Object.keys(set).length) update.$set = set;
  if (note?.trim()) update.$push = { internalNotes: { admin: req.user.userId, note: note.trim(), createdAt: now } };
  const updated = await ReviewQueueItem.findOneAndUpdate(
    { _id: id, version: item.version, $or: [{ 'lock.lockedBy': null }, { 'lock.expiresAt': { $lte: now } }, { 'lock.lockedBy': req.user.userId }] },
    update,
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(409).json({ success: false, code: 'RESOURCE_VERSION_CONFLICT', message: 'This item changed while you were editing it. Reload and try again.' });
  await createAuditLog({ actor: req.user.userId, action: 'QUEUE_ITEM_UPDATED', targetType: 'ReviewQueueItem', targetId: id, metadata: { reviewState, snoozedUntil: snoozeDate, noteAdded: Boolean(note?.trim()) } }, req);
  return successResponse(res, { item: updated }, 'Queue item updated');
});

/**
 * Add Internal Note to Queue Item
 */
const addQueueInternalNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  if (typeof note !== 'string' || !note.trim() || note.trim().length > 2000) return errorResponse(res, 'Provide a note of 2,000 characters or fewer.', 400);

  const item = await ReviewQueueItem.findById(id);
  if (!item) return errorResponse(res, 'Queue item not found.', 404);
  const now = new Date();
  if (item.lock?.lockedBy && item.lock.lockedBy.toString() !== req.user.userId.toString() && item.lock.expiresAt > now) {
    return res.status(409).json({ success: false, code: 'RESOURCE_LOCKED', message: 'This item is locked by another administrator.' });
  }

  const updated = await ReviewQueueItem.findOneAndUpdate(
    { _id: id, version: item.version, $or: [{ 'lock.lockedBy': null }, { 'lock.expiresAt': { $lte: now } }, { 'lock.lockedBy': req.user.userId }] },
    { $push: { internalNotes: { admin: req.user.userId, note: note.trim(), createdAt: now } }, $inc: { version: 1 } },
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(409).json({ success: false, code: 'RESOURCE_VERSION_CONFLICT', message: 'This item changed. Reload and try again.' });
  await createAuditLog({ actor: req.user.userId, action: 'QUEUE_INTERNAL_NOTE_ADDED', targetType: 'ReviewQueueItem', targetId: id }, req);

  return successResponse(res, { internalNotes: updated.internalNotes }, 'Note added');
});

/**
 * Safe Bulk Queue Actions
 */
const bulkUpdateQueueItems = asyncHandler(async (req, res) => {
  const { itemIds, action, snoozedUntil } = req.body;

  // Safety block: Never bulk approve verifications, cancel hazardous requests, or resolve disputes
  if (['approve_verification', 'resolve_dispute', 'dismiss_critical_flag', 'suspend_user'].includes(action)) {
    return errorResponse(res, 'High-risk and critical governance actions cannot be performed in bulk.', 403);
  }

  const update = {};
  if (action === 'assign_to_me') {
    update.assignedAdmin = req.user.userId;
    update.reviewState = REVIEW_QUEUE_STATE.IN_REVIEW;
  } else if (action === 'snooze') {
    const date = new Date(snoozedUntil);
    const now = new Date();
    if (!snoozedUntil || !Number.isFinite(date.getTime()) || date <= now || date > new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
      return errorResponse(res, 'Choose a snooze time within the next 30 days.', 400);
    }
    update.reviewState = REVIEW_QUEUE_STATE.SNOOZED;
    update.snoozedUntil = date;
  } else if (action === 'mark_pending') {
    update.reviewState = REVIEW_QUEUE_STATE.PENDING;
    update.snoozedUntil = null;
  } else {
    return errorResponse(res, 'Invalid bulk queue action.', 400);
  }

  const now = new Date();
  const result = await ReviewQueueItem.updateMany(
    { _id: { $in: itemIds }, $or: [{ 'lock.lockedBy': null }, { 'lock.expiresAt': { $lte: now } }, { 'lock.lockedBy': req.user.userId }] },
    { $set: update, $inc: { version: 1 } },
    { runValidators: true }
  );

  await createAuditLog(
    {
      actor: req.user.userId,
      action: 'QUEUE_BULK_UPDATE',
      targetType: 'ReviewQueueItem',
      metadata: { count: result.modifiedCount, action },
    },
    req
  );

  return successResponse(res, { updatedCount: result.modifiedCount, skippedLockedCount: itemIds.length - result.modifiedCount }, 'Bulk update applied');
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
  const [total, byProvider, avgProcessingTime, correctionCount, safetyFlaggedCount, fallbackCount] = await Promise.all([
    AIAnalysis.countDocuments(),
    AIAnalysis.aggregate([{ $group: { _id: '$provider', count: { $sum: 1 } } }]),
    AIAnalysis.aggregate([{ $group: { _id: null, avgTime: { $avg: '$processingTime' } } }]),
    AIAnalysis.countDocuments({
      $or: [{ 'ownerCorrections.categoryChanged': true }, { 'ownerCorrections.symptomsModified': true }],
    }),
    AIAnalysis.countDocuments({ 'safetyFlags.0': { $exists: true } }),
    AIAnalysis.countDocuments({ fallbackUsed: true }),
  ]);

  return successResponse(res, {
    totalAnalyses: total,
    byProvider,
    averageProcessingTime: avgProcessingTime[0]?.avgTime || 0,
    correctionCount,
    correctionRate: total > 0 ? Math.round((correctionCount / total) * 100) : 0,
    safetyFlaggedCount,
    safetyFlagRate: total > 0 ? Math.round((safetyFlaggedCount / total) * 100) : 0,
    fallbackCount,
    fallbackRate: total > 0 ? Math.round((fallbackCount / total) * 100) : 0,
  });
});

/**
 * 7. BACKGROUND JOBS DISPATCHER & STATUS
 */
const createAdminBackgroundJob = asyncHandler(async (req, res) => {
  const { type, payload } = req.body;
  const scopeByType = {
    EXPORT_AUDIT_LOGS: ADMIN_PERMISSIONS.AUDIT,
    AGGREGATE_IMPACT: ADMIN_PERMISSIONS.AUDIT,
    SCAN_EXPIRED_VERIFICATIONS: ADMIN_PERMISSIONS.VERIFICATION,
  };
  const requiredScope = scopeByType[type];
  if (!requiredScope) return errorResponse(res, 'Unsupported background job type.', 400);
  if (!hasAdminPermission(req.user, requiredScope)) {
    return res.status(403).json({ success: false, code: 'PERMISSION_SCOPE_DENIED', message: `The ${type} job requires the ${requiredScope} permission.` });
  }

  let safePayload = payload && typeof payload === 'object' && !Array.isArray(payload) ? { ...payload } : {};
  if (type === 'EXPORT_AUDIT_LOGS') {
    const input = safePayload.query && typeof safePayload.query === 'object' && !Array.isArray(safePayload.query) ? safePayload.query : {};
    const query = {};
    if (typeof input.action === 'string' && input.action.length <= 100) query.action = input.action;
    if (typeof input.targetType === 'string' && input.targetType.length <= 100) query.targetType = input.targetType;
    if (['info', 'warning', 'critical'].includes(input.severity)) query.severity = input.severity;
    if (typeof input.success === 'boolean') query.success = input.success;
    if (input.startDate || input.endDate) {
      const start = input.startDate ? new Date(input.startDate) : null;
      const end = input.endDate ? new Date(input.endDate) : null;
      if ((start && !Number.isFinite(start.getTime())) || (end && !Number.isFinite(end.getTime())) || (start && end && start > end)) {
        return errorResponse(res, 'Provide a valid audit export date range.', 400);
      }
      query.timestamp = {};
      if (start) query.timestamp.$gte = start;
      if (end) query.timestamp.$lte = end;
    }
    safePayload = { query };
  } else {
    safePayload = {};
  }
  const job = backgroundJobService.createJob(type, safePayload, req.user.userId);
  return successResponse(res, { job }, 'Background job queued', 202);
});

const getAdminBackgroundJobStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = backgroundJobService.getJobStatus(jobId);
  if (!job) return errorResponse(res, 'Job not found.', 404);
  const isOwner = job.userId?.toString() === req.user.userId.toString();
  const isAuditAdmin = hasAdminPermission(req.user, ADMIN_PERMISSIONS.AUDIT);
  if (!isOwner && !isAuditAdmin) return res.status(403).json({ success: false, code: 'PERMISSION_DENIED', message: 'You cannot view this background job.' });
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

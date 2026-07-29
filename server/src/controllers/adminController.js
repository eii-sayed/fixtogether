const { User, RepairRequest, RepairJob, DonationOffer, Dispute, ImpactRecord, AIAnalysis,
  AuditLog, SafetyRule, TechnicianProfile, OrganizationProfile, ItemCategory } = require('../models');
const { ROLES, REPAIR_REQUEST_STATUS, REPAIR_JOB_STATUS, DISPUTE_STATUS, VERIFICATION_STATUS } = require('../constants');
const { asyncHandler, successResponse, errorResponse, parsePagination, paginationMeta } = require('../utils/helpers');

const getDashboard = asyncHandler(async (req, res) => {
  const [
    totalUsers, totalOwners, totalTechnicians, totalOrganizations, totalAdmins,
    pendingTechVerifications, pendingOrgVerifications,
    activeRequests, completedRepairs, completedDonations,
    openDisputes, totalImpact, aiAnalysesCount,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: ROLES.OWNER }),
    User.countDocuments({ role: ROLES.TECHNICIAN }),
    User.countDocuments({ role: ROLES.ORGANIZATION }),
    User.countDocuments({ role: ROLES.ADMIN }),
    TechnicianProfile.countDocuments({ verificationStatus: VERIFICATION_STATUS.PENDING }),
    OrganizationProfile.countDocuments({ verificationStatus: VERIFICATION_STATUS.PENDING }),
    RepairRequest.countDocuments({ requestStatus: { $nin: ['completed', 'cancelled', 'draft'] } }),
    RepairJob.countDocuments({ currentStatus: REPAIR_JOB_STATUS.COMPLETED }),
    DonationOffer.countDocuments({ status: 'completed' }),
    Dispute.countDocuments({ status: { $in: [DISPUTE_STATUS.OPEN, DISPUTE_STATUS.UNDER_REVIEW] } }),
    ImpactRecord.aggregate([
      { $group: { _id: null, totalWasteAvoided: { $sum: '$estimatedWasteAvoided' }, totalCostSaved: { $sum: { $subtract: ['$estimatedReplacementCost', '$repairCost'] } } } },
    ]),
    AIAnalysis.countDocuments(),
  ]);

  // Monthly activity (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthlyActivity = await RepairRequest.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // Top categories
  const topCategories = await RepairRequest.aggregate([
    { $lookup: { from: 'items', localField: 'item', foreignField: '_id', as: 'itemData' } },
    { $unwind: '$itemData' },
    { $group: { _id: '$itemData.category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'itemcategories', localField: '_id', foreignField: '_id', as: 'catData' } },
    { $unwind: { path: '$catData', preserveNullAndEmptyArrays: true } },
    { $project: { categoryName: '$catData.name', count: 1 } },
  ]);

  // AI correction rate
  const aiCorrectionCount = await AIAnalysis.countDocuments({
    $or: [{ 'ownerCorrections.categoryChanged': true }, { 'ownerCorrections.symptomsModified': true }],
  });

  // Safety flagged
  const safetyFlagged = await RepairRequest.countDocuments({ 'safetyFlags.0': { $exists: true } });

  return successResponse(res, {
    users: { total: totalUsers, owners: totalOwners, technicians: totalTechnicians, organizations: totalOrganizations, admins: totalAdmins },
    pendingVerifications: { technicians: pendingTechVerifications, organizations: pendingOrgVerifications },
    repairRequests: { active: activeRequests, completed: completedRepairs },
    donations: { completed: completedDonations },
    disputes: { open: openDisputes },
    impact: totalImpact[0] || { totalWasteAvoided: 0, totalCostSaved: 0 },
    ai: { totalAnalyses: aiAnalysesCount, correctionRate: aiAnalysesCount > 0 ? Math.round((aiCorrectionCount / aiAnalysesCount) * 100) : 0 },
    safetyFlagged,
    monthlyActivity,
    topCategories,
  });
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { action, actor } = req.query;
  const query = {};
  if (action) query.action = action;
  if (actor) query.actor = actor;

  const [logs, total] = await Promise.all([
    AuditLog.find(query).populate('actor', 'fullName email').sort({ timestamp: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(query),
  ]);
  return successResponse(res, { auditLogs: logs, pagination: paginationMeta(total, page, limit) });
});

const getImpactStats = asyncHandler(async (req, res) => {
  const [byOutcome, totals] = await Promise.all([
    ImpactRecord.aggregate([
      { $group: { _id: '$outcome', count: { $sum: 1 }, totalWeight: { $sum: '$estimatedWeight' },
        totalWasteAvoided: { $sum: '$estimatedWasteAvoided' }, totalCostSaved: { $sum: { $subtract: ['$estimatedReplacementCost', '$repairCost'] } } } },
    ]),
    ImpactRecord.aggregate([
      { $group: { _id: null, totalRecords: { $sum: 1 }, totalWeight: { $sum: '$estimatedWeight' },
        totalWasteAvoided: { $sum: '$estimatedWasteAvoided' } } },
    ]),
  ]);
  return successResponse(res, { byOutcome, totals: totals[0] || {} });
});

const getAIAnalytics = asyncHandler(async (req, res) => {
  const [total, byProvider, avgProcessingTime, correctionRate] = await Promise.all([
    AIAnalysis.countDocuments(),
    AIAnalysis.aggregate([{ $group: { _id: '$provider', count: { $sum: 1 } } }]),
    AIAnalysis.aggregate([{ $group: { _id: null, avgTime: { $avg: '$processingTime' } } }]),
    AIAnalysis.countDocuments({ $or: [{ 'ownerCorrections.categoryChanged': true }, { 'ownerCorrections.symptomsModified': true }] }),
  ]);
  return successResponse(res, {
    totalAnalyses: total, byProvider,
    averageProcessingTime: avgProcessingTime[0]?.avgTime || 0,
    correctionCount: correctionRate,
    correctionRate: total > 0 ? Math.round((correctionRate / total) * 100) : 0,
  });
});

const getFlaggedListings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [listings, total] = await Promise.all([
    RepairRequest.find({ 'safetyFlags.0': { $exists: true } })
      .populate('owner', 'fullName email').populate('item', 'title category')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    RepairRequest.countDocuments({ 'safetyFlags.0': { $exists: true } }),
  ]);
  return successResponse(res, { listings, pagination: paginationMeta(total, page, limit) });
});

const updateFlaggedListing = asyncHandler(async (req, res) => {
  const request = await RepairRequest.findById(req.params.id);
  if (!request) return errorResponse(res, 'Not found.', 404);
  const { action, note } = req.body;
  if (action === 'dismiss') request.safetyFlags = [];
  if (action === 'cancel') request.requestStatus = REPAIR_REQUEST_STATUS.CANCELLED;
  await request.save();
  return successResponse(res, { repairRequest: request }, 'Listing updated');
});

// Safety rules
const getSafetyRules = asyncHandler(async (req, res) => {
  const rules = await SafetyRule.find().sort({ severity: -1 });
  return successResponse(res, { rules });
});

const createSafetyRule = asyncHandler(async (req, res) => {
  const rule = await SafetyRule.create(req.body);
  return successResponse(res, { rule }, 'Rule created', 201);
});

const updateSafetyRule = asyncHandler(async (req, res) => {
  const rule = await SafetyRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!rule) return errorResponse(res, 'Not found.', 404);
  return successResponse(res, { rule }, 'Rule updated');
});

const deleteSafetyRule = asyncHandler(async (req, res) => {
  await SafetyRule.findByIdAndUpdate(req.params.id, { active: false });
  return successResponse(res, null, 'Rule deactivated');
});

module.exports = {
  getDashboard, getAuditLogs, getImpactStats, getAIAnalytics,
  getFlaggedListings, updateFlaggedListing,
  getSafetyRules, createSafetyRule, updateSafetyRule, deleteSafetyRule,
};

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

  const inspection = await Inspection.create({
    repairRequest: job.repairRequest, technician: req.user.userId, ...req.body,
  });
  job.inspection = inspection._id;
  job.currentStatus = REPAIR_JOB_STATUS.INSPECTING;
  await job.save();

  // Update repair request status
  await RepairRequest.findByIdAndUpdate(job.repairRequest, { requestStatus: REPAIR_REQUEST_STATUS.UNDER_INSPECTION });

  await RepairStatusHistory.create({
    repairJob: job._id, previousStatus: REPAIR_JOB_STATUS.PENDING_INSPECTION,
    newStatus: REPAIR_JOB_STATUS.INSPECTING, changedBy: req.user.userId,
  });

  if (inspection.repairFeasible === 'no') {
    await createNotification({
      userId: job.owner.toString(), type: NOTIFICATION_TYPES.REPAIR_STATUS_UPDATED,
      title: 'Inspection Complete', message: 'Technician assessment: repair may not be feasible.',
      relatedEntityType: 'RepairJob', relatedEntityId: job._id,
    });
  } else {
    await createNotification({
      userId: job.owner.toString(), type: NOTIFICATION_TYPES.REPAIR_STATUS_UPDATED,
      title: 'Inspection Complete', message: 'Technician has completed the inspection.',
      relatedEntityType: 'RepairJob', relatedEntityId: job._id,
    });
  }

  return successResponse(res, { inspection }, 'Inspection recorded', 201);
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
    job.currentStatus = REPAIR_JOB_STATUS.IN_PROGRESS;
    await job.save();
    await RepairRequest.findByIdAndUpdate(job.repairRequest, { requestStatus: REPAIR_REQUEST_STATUS.REPAIR_IN_PROGRESS });
  }

  return successResponse(res, { inspection }, 'Decision recorded');
});

// ===== REPAIR JOB =====
const getRepairJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (req.user.role === 'owner') query.owner = req.user.userId;
  else if (req.user.role === 'technician') query.technician = req.user.userId;
  if (req.query.status) query.currentStatus = req.query.status;

  const [jobs, total] = await Promise.all([
    RepairJob.find(query).populate('repairRequest', 'item problemDescription')
      .populate('owner', 'fullName').populate('technician', 'fullName')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    RepairJob.countDocuments(query),
  ]);
  return successResponse(res, { repairJobs: jobs, pagination: paginationMeta(total, page, limit) });
});

const getRepairJobById = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id)
    .populate({ path: 'repairRequest', populate: { path: 'item', populate: { path: 'category' } } })
    .populate('owner', 'fullName email').populate('technician', 'fullName email')
    .populate('acceptedQuotation').populate('inspection');
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
  const prevStatus = job.currentStatus;
  job.currentStatus = status;
  await job.save();

  await RepairStatusHistory.create({
    repairJob: job._id, previousStatus: prevStatus, newStatus: status,
    changedBy: req.user.userId, note: note || '',
  });

  // Map repair job status to request status
  const statusMap = {
    [REPAIR_JOB_STATUS.WAITING_FOR_PARTS]: REPAIR_REQUEST_STATUS.WAITING_FOR_PARTS,
    [REPAIR_JOB_STATUS.IN_PROGRESS]: REPAIR_REQUEST_STATUS.REPAIR_IN_PROGRESS,
    [REPAIR_JOB_STATUS.QUALITY_CHECK]: REPAIR_REQUEST_STATUS.QUALITY_CHECK,
    [REPAIR_JOB_STATUS.COMPLETED]: REPAIR_REQUEST_STATUS.READY_FOR_COLLECTION,
    [REPAIR_JOB_STATUS.UNSUCCESSFUL]: REPAIR_REQUEST_STATUS.REPAIR_UNSUCCESSFUL,
  };
  if (statusMap[status]) {
    await RepairRequest.findByIdAndUpdate(job.repairRequest, { requestStatus: statusMap[status] });
  }

  await createNotification({
    userId: job.owner.toString(), type: NOTIFICATION_TYPES.REPAIR_STATUS_UPDATED,
    title: 'Repair Status Updated', message: `Status changed to: ${status.replace(/_/g, ' ')}`,
    relatedEntityType: 'RepairJob', relatedEntityId: job._id,
  });
  return successResponse(res, { repairJob: job }, 'Status updated');
});

const addParts = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Not found.', 404);
  if (job.technician.toString() !== req.user.userId.toString()) return errorResponse(res, 'Access denied.', 403);
  job.requiredParts.push(...(req.body.parts || []));
  await job.save();
  return successResponse(res, { repairJob: job }, 'Parts added');
});

const submitCompletion = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Not found.', 404);
  if (job.technician.toString() !== req.user.userId.toString()) return errorResponse(res, 'Access denied.', 403);

  const { completionReport, finalLaborCost, finalPartsCost, replacedParts, paymentMethod } = req.body;
  job.completionReport = completionReport || '';
  job.finalLaborCost = finalLaborCost || 0;
  job.finalPartsCost = finalPartsCost || 0;
  job.finalTotalCost = (finalLaborCost || 0) + (finalPartsCost || 0);
  if (replacedParts) job.replacedParts = replacedParts;
  if (paymentMethod) job.paymentMethod = paymentMethod;
  job.technicianConfirmedCompletion = true;

  if (req.files?.length > 0) {
    const uploaded = await uploadService.uploadMultiple(req.files, { folder: 'fixtogether/completions' });
    job.completionImages = uploaded.map((u) => ({ url: u.url, publicId: u.publicId }));
  }

  job.currentStatus = REPAIR_JOB_STATUS.COMPLETED;
  await job.save();

  await createNotification({
    userId: job.owner.toString(), type: NOTIFICATION_TYPES.REPAIR_COMPLETED,
    title: 'Repair Completed', message: 'The technician has marked your repair as complete. Please confirm.',
    relatedEntityType: 'RepairJob', relatedEntityId: job._id,
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
  await job.save();

  await RepairRequest.findByIdAndUpdate(job.repairRequest, { requestStatus: REPAIR_REQUEST_STATUS.COMPLETED });

  // Create warranty
  const quotation = await Quotation.findById(job.acceptedQuotation);
  const warrantyDays = quotation?.warrantyDays || 30;
  await Warranty.create({
    repairJob: job._id, technician: job.technician, owner: job.owner,
    startDate: new Date(), endDate: new Date(Date.now() + warrantyDays * 86400000),
    coveredProblem: job.completionReport, status: WARRANTY_STATUS.ACTIVE,
  });

  // Create impact record
  const request = await RepairRequest.findById(job.repairRequest).populate('item');
  if (request?.item) {
    await ImpactRecord.create({
      item: request.item._id, outcome: 'repaired',
      repairCost: job.finalTotalCost, verified: true,
    });
  }

  await createNotification({
    userId: job.technician.toString(), type: NOTIFICATION_TYPES.WARRANTY_CREATED,
    title: 'Repair Confirmed', message: 'Owner confirmed completion. Warranty created.',
    relatedEntityType: 'RepairJob', relatedEntityId: job._id,
  });
  return successResponse(res, { repairJob: job }, 'Completion confirmed');
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

const resolveDispute = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) return errorResponse(res, 'Not found.', 404);
  dispute.status = 'resolved';
  dispute.resolution = { decision: req.body.decision, notes: req.body.notes, resolvedBy: req.user.userId };
  dispute.resolvedAt = new Date();
  await dispute.save();

  await createNotification({
    userId: dispute.openedBy.toString(), type: NOTIFICATION_TYPES.DISPUTE_RESOLVED,
    title: 'Dispute Resolved', message: `Your dispute has been resolved.`,
    relatedEntityType: 'Dispute', relatedEntityId: dispute._id,
  });

  await createAuditLog({
    actor: req.user.userId, action: 'DISPUTE_RESOLVED',
    targetType: 'Dispute', targetId: dispute._id,
    metadata: { decision: req.body.decision },
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
  createInspection, getInspection, ownerInspectionDecision,
  getRepairJobs, getRepairJobById, updateRepairJobStatus, addParts, submitCompletion, ownerConfirmCompletion,
  createReview, getTechnicianReviews, updateReview, deleteReview,
  createDispute, getDisputes, getDisputeById, addDisputeResponse, resolveDispute,
  getWarranties, getWarrantyById, submitWarrantyClaim, updateWarrantyClaimStatus,
  createDonation, getDonations, getDonationById, getDonationMatches, acceptDonation, rejectDonation,
  scheduleDonationPickup, confirmHandover,
  createPart, getParts, getPartById, updatePart, reservePart,
  getNotifications, markNotificationRead, markAllNotificationsRead,
};

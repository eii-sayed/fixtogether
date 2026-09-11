const mongoose = require('mongoose');
const { TechnicianProfile, User } = require('../models');
const {
  asyncHandler,
  successResponse,
  errorResponse,
  parsePagination,
  paginationMeta,
} = require('../utils/helpers');
const { VERIFICATION_STATUS, ROLES, NOTIFICATION_TYPES, REPAIR_REQUEST_STATUS, QUOTATION_STATUS } = require('../constants');
const uploadService = require('../services/uploadService');
const { createAuditLog } = require('../middleware/auditLog');
const { createNotification } = require('../services/notificationService');

/**
 * GET /technicians
 */
const getTechnicians = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { skill, category, minRating, search, availability } = req.query;

  const query = { activeStatus: true };

  if (skill) query.skills = skill;
  if (category) query.supportedCategories = category;
  if (minRating) query.averageRating = { $gte: parseFloat(minRating) };
  if (availability) query.availabilityStatus = availability;

  const [profiles, total] = await Promise.all([
    TechnicianProfile.find(query)
      .populate('user', 'fullName email profileImage city serviceArea privacySettings')
      .populate('skills', 'name')
      .populate('supportedCategories', 'name icon')
      .sort({ averageRating: -1, completedRepairCount: -1 })
      .skip(skip)
      .limit(limit),
    TechnicianProfile.countDocuments(query),
  ]);

  // Sanitize public listing DTO
  const sanitizedTechnicians = profiles.map((p) => {
    const userObj = p.user ? p.user.toObject() : {};
    const privacy = userObj.privacySettings || {};

    return {
      _id: p._id,
      userId: userObj._id,
      fullName: userObj.fullName,
      profileImage: userObj.profileImage,
      professionalName: p.professionalName || userObj.fullName,
      email: privacy.showEmailPublicly ? userObj.email : undefined,
      city: userObj.city,
      serviceArea: userObj.serviceArea,
      verificationStatus: p.verificationStatus,
      averageRating: p.averageRating,
      reviewCount: p.reviewCount,
      completedRepairCount: p.completedRepairCount,
      skills: p.skills,
      supportedCategories: p.supportedCategories,
      serviceMethods: p.serviceMethods,
      availabilityStatus: p.availabilityStatus || 'available',
      priceRange: p.priceRange,
      warrantyPolicy: p.warrantyPolicy,
      minimumServiceCharge: p.minimumServiceCharge,
      languages: p.languages,
    };
  });

  return successResponse(res, {
    technicians: sanitizedTechnicians,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * GET /technicians/:id
 * Public technician profile DTO
 */
const getTechnicianById = asyncHandler(async (req, res) => {
  let { id } = req.params;

  // Handle 'profile' or 'me' aliases
  if (id === 'profile' || id === 'me') {
    if (req.user?.userId) {
      id = req.user.userId;
    } else {
      return errorResponse(res, 'Please provide a valid technician ID.', 400);
    }
  }

  let query = {};
  if (mongoose.Types.ObjectId.isValid(id)) {
    query = { $or: [{ _id: id }, { user: id }] };
  } else {
    return errorResponse(res, 'Invalid technician ID format.', 400);
  }

  const profile = await TechnicianProfile.findOne(query)
    .populate('user', 'fullName email phone profileImage city serviceArea bio createdAt privacySettings')
    .populate('skills', 'name description')
    .populate('supportedCategories', 'name icon')
    .populate('portfolio.category', 'name icon');

  if (!profile) return errorResponse(res, 'Technician not found.', 404);

  const user = profile.user ? profile.user.toObject() : {};
  const privacy = user.privacySettings || {};

  // Build sanitized public DTO - never leak private verification docs, notes, or residential address
  const publicTechnician = {
    _id: profile._id,
    userId: user._id,
    fullName: user.fullName,
    professionalName: profile.professionalName || user.fullName,
    profileImage: user.profileImage,
    email: privacy.showEmailPublicly ? user.email : undefined,
    phone: privacy.showPhonePublicly ? user.phone : undefined,
    city: privacy.showLocationPublicly ? user.city : undefined,
    serviceArea: privacy.showLocationPublicly ? user.serviceArea : undefined,
    bio: profile.biography || user.bio,
    memberSince: user.createdAt,
    verificationStatus: profile.verificationStatus,
    yearsOfExperience: profile.yearsOfExperience,
    skills: profile.skills || [],
    supportedCategories: profile.supportedCategories || [],
    serviceMethods: profile.serviceMethods || [],
    maximumServiceDistance: profile.maximumServiceDistance,
    workingHours: profile.workingHours,
    priceRange: profile.priceRange,
    warrantyPolicy: profile.warrantyPolicy,
    minimumServiceCharge: profile.minimumServiceCharge,
    languages: profile.languages || ['English'],
    availabilityStatus: profile.availabilityStatus || 'available',
    averageRating: profile.averageRating,
    reviewCount: profile.reviewCount,
    completedRepairCount: profile.completedRepairCount,
    completionRate: profile.completionRate,
    averageResponseTime: profile.averageResponseTime,
    portfolio: (profile.portfolio || []).map((item) => ({
      _id: item._id,
      title: item.title,
      description: item.description,
      category: item.category,
      beforeImage: item.beforeImage,
      afterImage: item.afterImage,
      completedAt: item.completedAt,
    })),
  };

  return successResponse(res, { technician: publicTechnician });
});

/**
 * GET /technicians/me/profile
 * Private technician profile
 */
const getMyTechnicianProfile = asyncHandler(async (req, res) => {
  let profile = await TechnicianProfile.findOne({ user: req.user.userId })
    .populate('skills', 'name description')
    .populate('supportedCategories', 'name icon')
    .populate('portfolio.category', 'name icon');

  if (!profile) {
    profile = await TechnicianProfile.create({ user: req.user.userId });
  }

  return successResponse(res, { profile });
});

/**
 * PUT /technicians/me/profile
 * Update private technician details
 */
const updateMyTechnicianProfile = asyncHandler(async (req, res) => {
  const {
    professionalName,
    biography,
    skills,
    supportedCategories,
    yearsOfExperience,
    serviceMethods,
    serviceArea,
    maximumServiceDistance,
    workingHours,
    priceRange,
    warrantyPolicy,
    minimumServiceCharge,
    languages,
    availabilityStatus,
    activeStatus,
  } = req.body;

  const updates = {};
  if (professionalName !== undefined) updates.professionalName = professionalName;
  if (biography !== undefined) updates.biography = biography;
  if (skills) updates.skills = skills;
  if (supportedCategories) updates.supportedCategories = supportedCategories;
  if (yearsOfExperience !== undefined) updates.yearsOfExperience = yearsOfExperience;
  if (serviceMethods) updates.serviceMethods = serviceMethods;
  if (serviceArea) updates.serviceArea = serviceArea;
  if (maximumServiceDistance !== undefined) updates.maximumServiceDistance = maximumServiceDistance;
  if (workingHours) updates.workingHours = workingHours;
  if (priceRange) updates.priceRange = priceRange;
  if (warrantyPolicy !== undefined) updates.warrantyPolicy = warrantyPolicy;
  if (minimumServiceCharge !== undefined) updates.minimumServiceCharge = minimumServiceCharge;
  if (languages) updates.languages = languages;
  if (availabilityStatus) updates.availabilityStatus = availabilityStatus;
  if (activeStatus !== undefined) updates.activeStatus = activeStatus;

  const profile = await TechnicianProfile.findOneAndUpdate(
    { user: req.user.userId },
    { $set: updates },
    { new: true, runValidators: true, upsert: true }
  )
    .populate('skills', 'name')
    .populate('supportedCategories', 'name icon')
    .populate('portfolio.category', 'name icon');

  return successResponse(res, { profile }, 'Technician profile updated successfully');
});

/**
 * GET /technicians/me/workspace
 * Unified Technician Operational Workspace
 */
const getMyTechnicianWorkspace = asyncHandler(async (req, res) => {
  const {
    RepairJob,
    RepairRequest,
    Quotation,
    Warranty,
    Appointment,
    Conversation,
    Message,
  } = require('../models');
  const { getMatchDetailsForTechnician } = require('../services/matchingService');

  let profile = await TechnicianProfile.findOne({ user: req.user.userId })
    .populate('skills', 'name description')
    .populate('supportedCategories', 'name icon')
    .populate('portfolio.category', 'name icon');

  if (!profile) {
    profile = await TechnicianProfile.create({ user: req.user.userId });
  }

  const activeJobStatuses = [
    'pending_inspection',
    'inspecting',
    'awaiting_approval',
    'waiting_for_parts',
    'in_progress',
    'quality_check',
    'ready_for_collection',
  ];

  // 1. Fetch active jobs & count
  const [activeJobs, activeJobsCount, completedCount] = await Promise.all([
    RepairJob.find({
      technician: req.user.userId,
      currentStatus: { $in: activeJobStatuses },
    })
      .populate({
        path: 'repairRequest',
        select: 'problemDescription preferredServiceMethod urgency budget',
        populate: { path: 'item', select: 'title category brand model images' },
      })
      .populate('owner', 'fullName email')
      .populate('acceptedQuotation')
      .sort({ updatedAt: -1 })
      .limit(10),
    RepairJob.countDocuments({
      technician: req.user.userId,
      currentStatus: { $in: activeJobStatuses },
    }),
    RepairJob.countDocuments({
      technician: req.user.userId,
      currentStatus: 'completed',
    }),
  ]);

  // 2. Fetch direct invitations
  const pendingInvitations = await RepairRequest.find({
    'selectedTechnicians.technician': req.user.userId,
    'selectedTechnicians.status': 'invited',
    requestStatus: {
      $in: [
        REPAIR_REQUEST_STATUS.PUBLISHED,
        REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS,
        REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS,
      ],
    },
  })
    .populate('item', 'title category images approximateLocation')
    .populate('owner', 'fullName')
    .sort({ createdAt: -1 })
    .limit(5);

  // 3. Fetch quotations awaiting owner decision
  const myPendingQuotes = await Quotation.find({
    technician: req.user.userId,
    status: { $in: [QUOTATION_STATUS.SUBMITTED, QUOTATION_STATUS.REVISED] },
  })
    .populate({
      path: 'repairRequest',
      select: 'problemDescription requestStatus budget',
      populate: { path: 'item', select: 'title category images' },
    })
    .sort({ createdAt: -1 })
    .limit(5);

  // 4. Fetch upcoming appointments
  let upcomingAppointments = [];
  try {
    if (Appointment) {
      upcomingAppointments = await Appointment.find({
        technician: req.user.userId,
        status: { $in: ['scheduled', 'confirmed'] },
      })
        .populate('owner', 'fullName')
        .populate({
          path: 'repairRequest',
          select: 'problemDescription',
          populate: { path: 'item', select: 'title' },
        })
        .sort({ appointmentDate: 1 })
        .limit(5);
    }
  } catch (err) {
    upcomingAppointments = [];
  }

  // 5. Fetch warranty claims needing attention
  const activeWarrantyClaims = await Warranty.find({
    technician: req.user.userId,
    status: 'claimed',
  })
    .populate({
      path: 'repairJob',
      populate: { path: 'repairRequest', select: 'item problemDescription' },
    })
    .populate('owner', 'fullName')
    .limit(5);

  // 6. Build Urgent Action Queue
  const urgentActions = [];

  // Invitations
  pendingInvitations.forEach((inv) => {
    urgentActions.push({
      id: `inv-${inv._id}`,
      type: 'invitation',
      priority: 'high',
      title: `Direct Repair Invitation: ${inv.item?.title || 'Repair Item'}`,
      description: `Owner invited you directly for ${inv.preferredServiceMethod || 'repair'}.`,
      waitingTime: inv.createdAt,
      link: `/repair-requests/${inv._id}`,
      primaryAction: { label: 'Submit Quote', action: 'quote' },
      secondaryAction: { label: 'View Details', action: 'view' },
      requestId: inv._id,
    });
  });

  // Pending cost approvals
  activeJobs.forEach((job) => {
    if (job.costApprovalRequest && job.costApprovalRequest.status === 'pending') {
      urgentActions.push({
        id: `cost-${job._id}`,
        type: 'cost_approval',
        priority: 'high',
        title: `Cost Revision Pending Owner Decision: ${job.repairRequest?.item?.title || 'Job #' + job._id.slice(-6)}`,
        description: `Owner review pending for revised total ৳${job.costApprovalRequest.revisedTotal}.`,
        waitingTime: job.costApprovalRequest.requestedAt || job.updatedAt,
        link: `/repair-requests/${job.repairRequest?._id || job._id}`,
        primaryAction: { label: 'Message Owner', action: 'chat' },
        secondaryAction: { label: 'View Job', action: 'view' },
        jobId: job._id,
      });
    } else if (job.currentStatus === 'pending_inspection') {
      urgentActions.push({
        id: `inspect-${job._id}`,
        type: 'inspection_needed',
        priority: 'medium',
        title: `Physical Inspection Needed: ${job.repairRequest?.item?.title || 'Job #' + job._id.slice(-6)}`,
        description: 'Item received. Record diagnostic checklist & confirmed repairability.',
        waitingTime: job.createdAt,
        link: `/repair-requests/${job.repairRequest?._id || job._id}`,
        primaryAction: { label: 'Start Inspection', action: 'inspect' },
        secondaryAction: { label: 'Open Chat', action: 'chat' },
        jobId: job._id,
      });
    } else if (job.currentStatus === 'quality_check') {
      urgentActions.push({
        id: `qa-${job._id}`,
        type: 'quality_check',
        priority: 'medium',
        title: `Quality Testing Required: ${job.repairRequest?.item?.title || 'Job #' + job._id.slice(-6)}`,
        description: 'Repair completed. Run mandatory post-repair verification check.',
        waitingTime: job.updatedAt,
        link: `/repair-requests/${job.repairRequest?._id || job._id}`,
        primaryAction: { label: 'Run QA Checklist', action: 'qa' },
        secondaryAction: { label: 'View Job', action: 'view' },
        jobId: job._id,
      });
    }
  });

  // Warranty claims
  activeWarrantyClaims.forEach((w) => {
    urgentActions.push({
      id: `war-${w._id}`,
      type: 'warranty_claim',
      priority: 'high',
      title: `Active Warranty Claim: ${w.owner?.fullName || 'Customer'}`,
      description: 'A warranty claim was reported for a previously completed repair.',
      waitingTime: w.updatedAt,
      link: `/repair-jobs/${w.repairJob?._id || ''}`,
      primaryAction: { label: 'Review Claim', action: 'warranty' },
      secondaryAction: null,
    });
  });

  // Sort urgent actions by priority (high > medium > low) and oldest waiting time
  const priorityRank = { high: 1, medium: 2, low: 3 };
  urgentActions.sort((a, b) => {
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }
    return new Date(a.waitingTime) - new Date(b.waitingTime);
  });

  // 7. Matching Repair Opportunities
  const categoryFilter = profile.supportedCategories?.length > 0
    ? { category: { $in: profile.supportedCategories.map((c) => c._id || c) } }
    : {};

  const openRequests = await RepairRequest.find({
    requestStatus: {
      $in: [
        REPAIR_REQUEST_STATUS.PUBLISHED,
        REPAIR_REQUEST_STATUS.MATCHING_TECHNICIANS,
        REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS,
      ],
    },
  })
    .populate({
      path: 'item',
      match: categoryFilter,
      select: 'title category brand model images approximateLocation',
      populate: { path: 'category', select: 'name icon' },
    })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(15);

  const matchedOpportunities = openRequests
    .filter((r) => r.item)
    .slice(0, 6)
    .map((r) => {
      const matchDetails = getMatchDetailsForTechnician(r, profile);
      return {
        _id: r._id,
        title: r.item.title,
        problemDescription: r.problemDescription,
        category: r.item.category,
        budget: r.budget,
        urgency: r.urgency,
        preferredServiceMethod: r.preferredServiceMethod,
        safetyLevel: r.safetyScreening?.riskLevel || 'low',
        matchScore: matchDetails.totalScore,
        matchExplanation: matchDetails.explanation,
        matchBreakdown: matchDetails.breakdown,
        quotationCount: r.quotationCount || 0,
        publishedAt: r.publishedAt || r.createdAt,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const maxCapacity = profile.maxConcurrentJobs || 5;
  const capacityUtilization = Math.round((activeJobsCount / maxCapacity) * 100);

  return successResponse(res, {
    profile: {
      _id: profile._id,
      professionalName: profile.professionalName || req.user.fullName,
      availabilityStatus: profile.availabilityStatus || 'available',
      vacationMode: Boolean(profile.vacationMode),
      vacationUntil: profile.vacationUntil,
      verificationStatus: profile.verificationStatus,
      verificationStage: profile.verificationStage,
      averageRating: profile.averageRating,
      reviewCount: profile.reviewCount,
      completedRepairCount: completedCount,
      completionRate: profile.completionRate,
      maxConcurrentJobs: maxCapacity,
      activeJobsCount,
      capacityUtilization,
      isAtCapacity: activeJobsCount >= maxCapacity,
    },
    urgentActions,
    activeJobs,
    matchingOpportunities: matchedOpportunities,
    pendingInvitations,
    myPendingQuotes,
    upcomingAppointments,
  });
});

/**
 * GET /technicians/requests/:requestId/match-details
 * Returns "Why this matches" breakdown and improvement tips
 */
const getRepairRequestMatchDetails = asyncHandler(async (req, res) => {
  const { RepairRequest } = require('../models');
  const { getMatchDetailsForTechnician } = require('../services/matchingService');

  const profile = await TechnicianProfile.findOne({ user: req.user.userId })
    .populate('skills')
    .populate('supportedCategories');

  if (!profile) return errorResponse(res, 'Technician profile not found.', 404);

  const request = await RepairRequest.findById(req.params.requestId)
    .populate({ path: 'item', populate: { path: 'category' } });

  if (!request) return errorResponse(res, 'Repair request not found.', 404);

  const matchData = getMatchDetailsForTechnician(request, profile);

  return successResponse(res, {
    requestId: request._id,
    matchDetails: matchData,
  });
});

/**
 * PATCH /technicians/me/availability
 * Quick availability switch and workload settings
 */
const updateAvailability = asyncHandler(async (req, res) => {
  const {
    availabilityStatus,
    vacationMode,
    vacationUntil,
    maxConcurrentJobs,
    workingHours,
    categoryAvailability,
  } = req.body;

  const updates = {};
  if (availabilityStatus !== undefined) updates.availabilityStatus = availabilityStatus;
  if (vacationMode !== undefined) updates.vacationMode = vacationMode;
  if (vacationUntil !== undefined) updates.vacationUntil = vacationUntil;
  if (maxConcurrentJobs !== undefined) updates.maxConcurrentJobs = maxConcurrentJobs;
  if (workingHours !== undefined) updates.workingHours = workingHours;
  if (categoryAvailability !== undefined) updates.categoryAvailability = categoryAvailability;

  const profile = await TechnicianProfile.findOneAndUpdate(
    { user: req.user.userId },
    { $set: updates },
    { new: true, upsert: true }
  );

  return successResponse(
    res,
    { profile, availabilityStatus: profile.availabilityStatus },
    `Availability updated to ${profile.availabilityStatus}`
  );
});

/**
 * POST /technicians/me/portfolio
 * Add a portfolio project with before/after photos
 */
const addPortfolioItem = asyncHandler(async (req, res) => {
  const { title, description, category, completedAt } = req.body;

  const profile = await TechnicianProfile.findOne({ user: req.user.userId });
  if (!profile) return errorResponse(res, 'Technician profile not found.', 404);

  const portfolioItem = {
    title,
    description: description || '',
    category: category || undefined,
    completedAt: completedAt || new Date(),
    beforeImage: { url: '', publicId: '' },
    afterImage: { url: '', publicId: '' },
  };

  // Process uploaded files for before and after images
  if (req.files && req.files.length > 0) {
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const uploaded = await uploadService.uploadFile(file.path, {
        folder: 'fixtogether/portfolio',
      });
      if (i === 0) {
        portfolioItem.beforeImage = { url: uploaded.url, publicId: uploaded.publicId };
      } else if (i === 1) {
        portfolioItem.afterImage = { url: uploaded.url, publicId: uploaded.publicId };
      }
    }
  }

  profile.portfolio.push(portfolioItem);
  await profile.save();

  const populated = await TechnicianProfile.findById(profile._id).populate('portfolio.category', 'name icon');
  return successResponse(res, { portfolio: populated.portfolio }, 'Portfolio item added');
});

/**
 * DELETE /technicians/me/portfolio/:itemId
 * Delete a portfolio item
 */
const deletePortfolioItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const profile = await TechnicianProfile.findOne({ user: req.user.userId });
  if (!profile) return errorResponse(res, 'Technician profile not found.', 404);

  const itemIndex = profile.portfolio.findIndex((p) => p._id.toString() === itemId);
  if (itemIndex === -1) return errorResponse(res, 'Portfolio item not found.', 404);

  const item = profile.portfolio[itemIndex];
  if (item.beforeImage?.publicId) await uploadService.deleteFile(item.beforeImage.publicId);
  if (item.afterImage?.publicId) await uploadService.deleteFile(item.afterImage.publicId);

  profile.portfolio.splice(itemIndex, 1);
  await profile.save();

  return successResponse(res, { portfolio: profile.portfolio }, 'Portfolio item removed');
});

/**
 * POST /technicians/me/verification
 */
const submitVerification = asyncHandler(async (req, res) => {
  const profile = await TechnicianProfile.findOne({ user: req.user.userId });
  if (!profile) return errorResponse(res, 'Profile not found.', 404);

  const documents = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const uploaded = await uploadService.uploadFile(file.path, { folder: 'fixtogether/verification' });
      documents.push({
        type: 'verification_document',
        url: uploaded.url,
        publicId: uploaded.publicId,
        uploadedAt: new Date(),
      });
    }
  }

  profile.verificationDocuments.push(...documents);
  profile.verificationStatus = VERIFICATION_STATUS.PENDING;
  await profile.save();

  return successResponse(res, { profile }, 'Verification documents submitted');
});

/**
 * GET /admin/technicians/pending
 */
const getPendingTechnicians = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [profiles, total] = await Promise.all([
    TechnicianProfile.find({ verificationStatus: VERIFICATION_STATUS.PENDING })
      .populate('user', 'fullName email phone createdAt')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    TechnicianProfile.countDocuments({ verificationStatus: VERIFICATION_STATUS.PENDING }),
  ]);

  return successResponse(res, {
    technicians: profiles,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * PATCH /admin/technicians/:id/verification
 */
const updateVerificationStatus = asyncHandler(async (req, res) => {
  const { verificationStatus, verificationNote } = req.body;
  const profile = await TechnicianProfile.findOne({ user: req.params.id });

  if (!profile) return errorResponse(res, 'Technician not found.', 404);

  profile.verificationStatus = verificationStatus;
  if (verificationNote) profile.verificationNote = verificationNote;
  await profile.save();

  const notifType =
    verificationStatus === VERIFICATION_STATUS.APPROVED
      ? NOTIFICATION_TYPES.ACCOUNT_VERIFIED
      : NOTIFICATION_TYPES.ACCOUNT_REJECTED;

  await createNotification({
    userId: req.params.id,
    type: notifType,
    title: verificationStatus === VERIFICATION_STATUS.APPROVED ? 'Verification Approved' : 'Verification Update',
    message:
      verificationStatus === VERIFICATION_STATUS.APPROVED
        ? 'Your technician profile has been verified. You can now receive repair requests.'
        : `Verification status: ${verificationStatus}. ${verificationNote || ''}`,
    relatedEntityType: 'TechnicianProfile',
    relatedEntityId: profile._id,
  });

  await createAuditLog(
    {
      actor: req.user.userId,
      action: 'TECHNICIAN_VERIFICATION_UPDATED',
      targetType: 'TechnicianProfile',
      targetId: profile._id,
      metadata: { verificationStatus, verificationNote },
    },
    req
  );

  return successResponse(res, { profile }, 'Verification status updated');
});

module.exports = {
  getTechnicians,
  getTechnicianById,
  getMyTechnicianProfile,
  updateMyTechnicianProfile,
  updateAvailability,
  getMyTechnicianWorkspace,
  getRepairRequestMatchDetails,
  addPortfolioItem,
  deletePortfolioItem,
  submitVerification,
  getPendingTechnicians,
  updateVerificationStatus,
};

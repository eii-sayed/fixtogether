const mongoose = require('mongoose');
const {
  OrganizationProfile,
  DonationOffer,
  DonationNeed,
  ImpactRecord,
  ItemCategory,
  Item,
  User,
  AuditLog,
} = require('../models');
const {
  asyncHandler,
  successResponse,
  errorResponse,
  parsePagination,
  paginationMeta,
  generateCode,
} = require('../utils/helpers');
const {
  VERIFICATION_STATUS,
  ORGANIZATION_TYPES,
  NOTIFICATION_TYPES,
  DONATION_STATUS,
  COMMUNITY_NEED_STATUS,
  INSPECTION_OUTCOMES,
  PROCESSING_OUTCOMES,
  HUB_STATUS,
} = require('../constants');
const uploadService = require('../services/uploadService');
const { createAuditLog } = require('../middleware/auditLog');
const { createNotification } = require('../services/notificationService');
const { transitionDonationStatus } = require('../services/donationTransitionService');
const { calculateDonationMatch } = require('../services/donationMatchingService');
const logger = require('../utils/logger');

/**
 * GET /organizations
 * Public organization listing
 */
const getOrganizations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { type, category, search } = req.query;

  const query = { activeStatus: true, verificationStatus: VERIFICATION_STATUS.APPROVED };
  if (type) query.organizationType = type;
  if (category) query.acceptedItemCategories = category;
  if (search) query.organizationName = { $regex: search, $options: 'i' };

  const [orgs, total] = await Promise.all([
    OrganizationProfile.find(query)
      .populate('user', 'fullName email profileImage city serviceArea')
      .populate('acceptedItemCategories', 'name icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    OrganizationProfile.countDocuments(query),
  ]);

  const sanitizedOrgs = orgs.map((org) => {
    const userObj = org.user ? org.user.toObject() : {};
    return {
      _id: org._id,
      userId: userObj._id,
      organizationName: org.organizationName,
      organizationType: org.organizationType,
      description: org.description,
      logo: userObj.profileImage,
      website: org.registrationInformation?.website,
      city: org.address?.city || userObj.city,
      serviceArea: userObj.serviceArea,
      verificationStatus: org.verificationStatus,
      acceptedItemCategories: org.acceptedItemCategories,
      pickupAvailable: org.pickupAvailable,
      dropoffAvailable: org.dropoffAvailable,
      impactStats: org.impactStats,
      locations: org.locations,
    };
  });

  return successResponse(res, {
    organizations: sanitizedOrgs,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * GET /organizations/:id
 * Public organization profile DTO
 */
const getOrganizationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let query = {};
  if (mongoose.Types.ObjectId.isValid(id)) {
    query = { $or: [{ _id: id }, { user: id }] };
  } else {
    return errorResponse(res, 'Invalid organization ID format.', 400);
  }

  const org = await OrganizationProfile.findOne(query)
    .populate('user', 'fullName email phone profileImage city serviceArea createdAt privacySettings')
    .populate('acceptedItemCategories', 'name icon')
    .populate('neededItemCategories', 'name icon')
    .populate('rejectedCategories', 'name icon');

  if (!org) return errorResponse(res, 'Organization not found.', 404);

  const user = org.user ? org.user.toObject() : {};
  const privacy = user.privacySettings || {};

  const publicOrg = {
    _id: org._id,
    userId: user._id,
    organizationName: org.organizationName,
    organizationType: org.organizationType,
    description: org.description,
    logo: user.profileImage,
    publicEmail: privacy.showEmailPublicly ? org.contactPerson?.email || user.email : undefined,
    publicPhone: privacy.showPhonePublicly ? org.contactPerson?.phone || user.phone : undefined,
    website: org.registrationInformation?.website,
    city: privacy.showLocationPublicly ? org.address?.city || user.city : undefined,
    serviceArea: privacy.showLocationPublicly ? org.serviceArea : undefined,
    verificationStatus: org.verificationStatus,
    acceptedItemCategories: org.acceptedItemCategories || [],
    neededItemCategories: org.neededItemCategories || [],
    rejectedCategories: org.rejectedCategories || [],
    pickupAvailable: org.pickupAvailable,
    dropoffAvailable: org.dropoffAvailable,
    donationInstructions: org.donationInstructions,
    recyclingInstructions: org.recyclingInstructions,
    locations: org.locations || [],
    operatingHours: org.operatingHours,
    impactStats: org.impactStats || {
      totalDonationsReceived: 0,
      totalItemsProcessed: 0,
      totalWeightProcessed: 0,
    },
    memberSince: user.createdAt,
  };

  return successResponse(res, { organization: publicOrg });
});

/**
 * GET /organizations/me/workspace
 * Operations-first unified workspace dashboard
 */
const getMyWorkspace = asyncHandler(async (req, res) => {
  let profile = await OrganizationProfile.findOne({ user: req.user.userId })
    .populate('acceptedItemCategories', 'name icon')
    .populate('neededItemCategories', 'name icon')
    .populate('rejectedCategories', 'name icon');

  if (!profile) {
    profile = await OrganizationProfile.create({
      user: req.user.userId,
      organizationName: req.user.fullName,
      organizationType: ORGANIZATION_TYPES.DONATION_ORG,
    });
  }

  const orgId = profile._id;

  // 1. Fetch Urgent Action Queues
  const [
    offersAwaitingDecision,
    upcomingHandovers,
    itemsAwaitingReceipt,
    itemsAwaitingInspection,
    urgentNeeds,
    processingBacklog,
    recentImpact,
  ] = await Promise.all([
    // Awaiting decision: matched or published offers
    DonationOffer.find({
      status: { $in: [DONATION_STATUS.PUBLISHED, DONATION_STATUS.MATCHED, DONATION_STATUS.UNDER_REVIEW] },
      $or: [{ selectedOrganization: orgId }, { 'matchedOrganizations.organization': orgId }, { selectedOrganization: null }],
    })
      .populate('item', 'title images category')
      .populate('category', 'name icon')
      .populate('owner', 'fullName city')
      .sort({ createdAt: -1 })
      .limit(6),

    // Upcoming handovers (next 48 hours / active scheduled)
    DonationOffer.find({
      selectedOrganization: orgId,
      status: { $in: [DONATION_STATUS.ACCEPTED, DONATION_STATUS.HANDOVER_SCHEDULED, DONATION_STATUS.PICKUP_SCHEDULED] },
    })
      .populate('item', 'title images')
      .populate('owner', 'fullName city')
      .sort({ 'handover.scheduledDate': 1 })
      .limit(6),

    // In-transit / awaiting dropoff
    DonationOffer.find({
      selectedOrganization: orgId,
      status: { $in: [DONATION_STATUS.IN_TRANSIT, DONATION_STATUS.AWAITING_DROPOFF] },
    })
      .populate('item', 'title images')
      .populate('owner', 'fullName')
      .limit(5),

    // Awaiting inspection at hub
    DonationOffer.find({
      selectedOrganization: orgId,
      status: { $in: [DONATION_STATUS.RECEIVED, DONATION_STATUS.INSPECTION_PENDING] },
    })
      .populate('item', 'title images category')
      .sort({ updatedAt: 1 })
      .limit(6),

    // Active community needs nearing target dates
    DonationNeed.find({
      organization: orgId,
      status: { $in: [COMMUNITY_NEED_STATUS.PUBLISHED, COMMUNITY_NEED_STATUS.PARTIALLY_MATCHED, COMMUNITY_NEED_STATUS.PARTIALLY_FULFILLED] },
    })
      .populate('category', 'name icon')
      .sort({ targetDate: 1, urgency: -1 })
      .limit(5),

    // Inspected items awaiting final processing / redistribution
    DonationOffer.find({
      selectedOrganization: orgId,
      status: { $in: [DONATION_STATUS.INSPECTED, DONATION_STATUS.PROCESSING] },
    })
      .populate('item', 'title images')
      .limit(5),

    // Recent impact records
    ImpactRecord.find({ organization: orgId })
      .populate('item', 'title')
      .sort({ recordedAt: -1 })
      .limit(5),
  ]);

  // 2. Build prioritized urgent actions list
  const urgentActions = [];

  offersAwaitingDecision.forEach((offer) => {
    urgentActions.push({
      id: offer._id,
      type: 'offer_decision',
      priority: 'high',
      title: `Offer Decision: ${offer.item?.title || offer.title || 'Donated Item'}`,
      description: `Offered by ${offer.owner?.fullName || 'Community Donor'} • Condition: ${offer.itemCondition}`,
      link: `/donations?tab=new&offerId=${offer._id}`,
      actionLabel: 'Review & Decide',
      createdAt: offer.createdAt,
    });
  });

  itemsAwaitingInspection.forEach((item) => {
    urgentActions.push({
      id: item._id,
      type: 'inspection_needed',
      priority: 'critical',
      title: `Inspection Required: ${item.item?.title || 'Received Item'}`,
      description: `Received at hub. Complete safety & condition checklist to unlock redistribution.`,
      link: `/donations?tab=received&inspectId=${item._id}`,
      actionLabel: 'Inspect Bench',
      createdAt: item.updatedAt,
    });
  });

  upcomingHandovers.forEach((h) => {
    urgentActions.push({
      id: h._id,
      type: 'handover_scheduled',
      priority: 'medium',
      title: `Collection Handover: ${h.item?.title || 'Item'}`,
      description: `Method: ${h.handover?.method?.toUpperCase() || 'DROPOFF'} • Scheduled: ${h.handover?.scheduledDate ? new Date(h.handover.scheduledDate).toLocaleDateString() : 'Awaiting confirmation'}`,
      link: `/donations?tab=scheduled&handoverId=${h._id}`,
      actionLabel: 'Confirm Handover',
      createdAt: h.updatedAt,
    });
  });

  // Sort urgent actions by priority & waiting duration
  const priorityWeight = { critical: 3, high: 2, medium: 1, low: 0 };
  urgentActions.sort((a, b) => {
    if (priorityWeight[b.priority] !== priorityWeight[a.priority]) {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  return successResponse(res, {
    profile,
    urgentActions,
    queues: {
      offersAwaitingDecision,
      upcomingHandovers,
      itemsAwaitingReceipt,
      itemsAwaitingInspection,
      urgentNeeds,
      processingBacklog,
      recentImpact,
    },
    counts: {
      pendingDecisions: offersAwaitingDecision.length,
      scheduledCollections: upcomingHandovers.length,
      awaitingInspection: itemsAwaitingInspection.length,
      activeNeeds: urgentNeeds.length,
      processingBacklog: processingBacklog.length,
    },
  });
});

/**
 * GET /organizations/me/profile
 */
const getMyOrganizationProfile = asyncHandler(async (req, res) => {
  let profile = await OrganizationProfile.findOne({ user: req.user.userId })
    .populate('acceptedItemCategories', 'name icon')
    .populate('neededItemCategories', 'name icon')
    .populate('rejectedCategories', 'name icon');

  if (!profile) {
    profile = await OrganizationProfile.create({
      user: req.user.userId,
      organizationName: req.user.fullName,
      organizationType: ORGANIZATION_TYPES.DONATION_ORG,
    });
  }

  return successResponse(res, { profile });
});

/**
 * PUT /organizations/me/profile
 */
const updateMyOrganizationProfile = asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  delete updates.verificationStatus;
  delete updates.user;

  const profile = await OrganizationProfile.findOneAndUpdate(
    { user: req.user.userId },
    { $set: updates },
    { new: true, runValidators: true, upsert: true }
  )
    .populate('acceptedItemCategories', 'name icon')
    .populate('neededItemCategories', 'name icon')
    .populate('rejectedCategories', 'name icon');

  return successResponse(res, { profile }, 'Organization profile updated successfully');
});

/**
 * POST /organizations/me/verification
 */
const submitOrgVerification = asyncHandler(async (req, res) => {
  const profile = await OrganizationProfile.findOne({ user: req.user.userId });
  if (!profile) return errorResponse(res, 'Profile not found.', 404);

  const documents = [];
  if (req.files?.length > 0) {
    for (const file of req.files) {
      const uploaded = await uploadService.uploadFile(file.path, {
        folder: 'fixtogether/org-verification',
      });
      documents.push({
        type: req.body.documentType || 'legal_registration',
        url: uploaded.url,
        publicId: uploaded.publicId,
        uploadedAt: new Date(),
      });
    }
  }

  profile.verificationDocuments.push(...documents);
  profile.verificationStatus = VERIFICATION_STATUS.PENDING;
  await profile.save();

  await createNotification({
    userId: req.user.userId,
    type: NOTIFICATION_TYPES.ACCOUNT_VERIFIED,
    title: 'Verification Submitted',
    message: 'Your organization verification credentials have been submitted for administrator compliance review.',
    relatedEntityType: 'OrganizationProfile',
    relatedEntityId: profile._id,
  });

  return successResponse(res, { profile }, 'Verification documents submitted for review');
});

/**
 * GET /admin/organizations/pending
 */
const getPendingOrganizations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [orgs, total] = await Promise.all([
    OrganizationProfile.find({ verificationStatus: VERIFICATION_STATUS.PENDING })
      .populate('user', 'fullName email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    OrganizationProfile.countDocuments({ verificationStatus: VERIFICATION_STATUS.PENDING }),
  ]);

  return successResponse(res, {
    organizations: orgs,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * PATCH /admin/organizations/:id/verification
 */
const updateOrgVerificationStatus = asyncHandler(async (req, res) => {
  const { verificationStatus, verificationNote, rejectionReason } = req.body;
  const profile = await OrganizationProfile.findOne({ user: req.params.id });

  if (!profile) return errorResponse(res, 'Organization not found.', 404);

  profile.verificationStatus = verificationStatus;
  if (verificationNote) profile.verificationNote = verificationNote;
  if (rejectionReason) profile.verificationNote = `${rejectionReason}. ${verificationNote || ''}`;
  await profile.save();

  await createNotification({
    userId: req.params.id,
    type:
      verificationStatus === VERIFICATION_STATUS.APPROVED
        ? NOTIFICATION_TYPES.ACCOUNT_VERIFIED
        : NOTIFICATION_TYPES.ACCOUNT_REJECTED,
    title: verificationStatus === VERIFICATION_STATUS.APPROVED ? 'Organization Verified' : 'Verification Update',
    message:
      verificationStatus === VERIFICATION_STATUS.APPROVED
        ? 'Your organization has been officially verified by FixTogether.'
        : `Status: ${verificationStatus}. ${rejectionReason || verificationNote || ''}`,
    relatedEntityType: 'OrganizationProfile',
    relatedEntityId: profile._id,
  });

  await createAuditLog(
    {
      actor: req.user.userId,
      action: 'ORG_VERIFICATION_UPDATED',
      targetType: 'OrganizationProfile',
      targetId: profile._id,
      metadata: { verificationStatus, rejectionReason },
    },
    req
  );

  return successResponse(res, { profile }, 'Verification updated');
});

// ===== DONATION OFFERS OPERATIONAL CONTROLLER =====

/**
 * GET /donations/offers
 * Paginated and tabbed donation offers query with matching breakdowns
 */
const getDonationOffers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { tab = 'all', category, condition, urgency, handoverMethod, search } = req.query;

  let orgProfile = null;
  if (req.user.role === 'organization') {
    orgProfile = await OrganizationProfile.findOne({ user: req.user.userId })
      .populate('acceptedItemCategories')
      .populate('neededItemCategories')
      .populate('rejectedCategories');
  }

  const query = {};

  if (req.user.role === 'owner') {
    query.owner = req.user.userId;
  } else if (req.user.role === 'organization') {
    if (!orgProfile) {
      return successResponse(res, { offers: [], pagination: paginationMeta(0, page, limit), tabCounts: {} });
    }

    // Filter by tab
    if (tab === 'new') {
      query.status = { $in: [DONATION_STATUS.PUBLISHED, DONATION_STATUS.MATCHED] };
      query.selectedOrganization = null;
    } else if (tab === 'under_review') {
      query.status = DONATION_STATUS.UNDER_REVIEW;
      query.selectedOrganization = orgProfile._id;
    } else if (tab === 'accepted') {
      query.status = DONATION_STATUS.ACCEPTED;
      query.selectedOrganization = orgProfile._id;
    } else if (tab === 'scheduled') {
      query.status = { $in: [DONATION_STATUS.HANDOVER_SCHEDULED, DONATION_STATUS.PICKUP_SCHEDULED, DONATION_STATUS.IN_TRANSIT, DONATION_STATUS.AWAITING_DROPOFF] };
      query.selectedOrganization = orgProfile._id;
    } else if (tab === 'received') {
      query.status = { $in: [DONATION_STATUS.RECEIVED, DONATION_STATUS.INSPECTION_PENDING, DONATION_STATUS.INSPECTED, DONATION_STATUS.PROCESSING] };
      query.selectedOrganization = orgProfile._id;
    } else if (tab === 'completed') {
      query.status = DONATION_STATUS.COMPLETED;
      query.selectedOrganization = orgProfile._id;
    } else if (tab === 'rejected') {
      query.status = { $in: [DONATION_STATUS.REJECTED, DONATION_STATUS.REJECTED_AFTER_INSPECTION] };
      query.selectedOrganization = orgProfile._id;
    } else if (tab === 'recommended') {
      // High category match
      const neededCatIds = (orgProfile.neededItemCategories || []).map((c) => c._id);
      const acceptedCatIds = (orgProfile.acceptedItemCategories || []).map((c) => c._id);
      query.status = { $in: [DONATION_STATUS.PUBLISHED, DONATION_STATUS.MATCHED] };
      query.category = { $in: [...neededCatIds, ...acceptedCatIds] };
    }
  }

  // Filters
  if (category) query.category = category;
  if (condition) query.itemCondition = condition;
  if (handoverMethod) query.preferredHandover = handoverMethod;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const [offers, total] = await Promise.all([
    DonationOffer.find(query)
      .populate('item', 'title images category condition')
      .populate('category', 'name icon')
      .populate('owner', 'fullName city')
      .populate('matchingNeed', 'title urgency targetDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    DonationOffer.countDocuments(query),
  ]);

  // Compute tab counts for fast client navigation
  let tabCounts = {};
  if (req.user.role === 'organization' && orgProfile) {
    const orgId = orgProfile._id;
    const [cNew, cAccepted, cScheduled, cReceived, cCompleted, cRejected] = await Promise.all([
      DonationOffer.countDocuments({ status: { $in: [DONATION_STATUS.PUBLISHED, DONATION_STATUS.MATCHED] }, selectedOrganization: null }),
      DonationOffer.countDocuments({ status: DONATION_STATUS.ACCEPTED, selectedOrganization: orgId }),
      DonationOffer.countDocuments({ status: { $in: [DONATION_STATUS.HANDOVER_SCHEDULED, DONATION_STATUS.PICKUP_SCHEDULED, DONATION_STATUS.IN_TRANSIT, DONATION_STATUS.AWAITING_DROPOFF] }, selectedOrganization: orgId }),
      DonationOffer.countDocuments({ status: { $in: [DONATION_STATUS.RECEIVED, DONATION_STATUS.INSPECTION_PENDING, DONATION_STATUS.INSPECTED, DONATION_STATUS.PROCESSING] }, selectedOrganization: orgId }),
      DonationOffer.countDocuments({ status: DONATION_STATUS.COMPLETED, selectedOrganization: orgId }),
      DonationOffer.countDocuments({ status: { $in: [DONATION_STATUS.REJECTED, DONATION_STATUS.REJECTED_AFTER_INSPECTION] }, selectedOrganization: orgId }),
    ]);
    tabCounts = {
      new: cNew,
      accepted: cAccepted,
      scheduled: cScheduled,
      received: cReceived,
      completed: cCompleted,
      rejected: cRejected,
    };
  }

  // Sanitized offers with calculated match breakdowns
  const sanitizedOffers = offers.map((o) => {
    let matchAnalysis = null;
    if (orgProfile) {
      matchAnalysis = calculateDonationMatch(o, orgProfile, o.matchingNeed);
    }
    return {
      _id: o._id,
      title: o.title || o.item?.title || 'Donation Offer',
      item: o.item,
      category: o.category,
      owner: {
        _id: o.owner?._id,
        fullName: o.owner?.fullName,
        city: o.owner?.city,
        // Exact location and contact are masked until handover is confirmed
      },
      description: o.description,
      itemCondition: o.itemCondition,
      quantity: o.quantity || 1,
      estimatedWeight: o.estimatedWeight || 0,
      preferredHandover: o.preferredHandover,
      approximateLocation: o.pickupLocation?.approximateArea || o.owner?.city,
      status: o.status,
      safetyFlags: o.safetyFlags || [],
      dataBearing: o.dataBearing || {},
      matchingNeed: o.matchingNeed,
      matchAnalysis,
      handover: o.handover,
      inspection: o.inspection,
      processing: o.processing,
      version: o.version,
      createdAt: o.createdAt,
    };
  });

  return successResponse(res, {
    offers: sanitizedOffers,
    pagination: paginationMeta(total, page, limit),
    tabCounts,
  });
});

/**
 * GET /donations/offers/:id/match-explanation
 */
const getOfferMatchExplanation = asyncHandler(async (req, res) => {
  const offer = await DonationOffer.findById(req.params.id)
    .populate('item')
    .populate('category')
    .populate('matchingNeed');

  if (!offer) return errorResponse(res, 'Donation offer not found.', 404);

  const orgProfile = await OrganizationProfile.findOne({ user: req.user.userId })
    .populate('acceptedItemCategories')
    .populate('neededItemCategories')
    .populate('rejectedCategories');

  if (!orgProfile) return errorResponse(res, 'Organization profile not found.', 404);

  const matchAnalysis = calculateDonationMatch(offer, orgProfile, offer.matchingNeed);

  return successResponse(res, { matchAnalysis });
});

/**
 * POST /donations/offers/:id/decision
 * Atomic acceptance or rejection of a donation offer
 */
const decideDonationOffer = asyncHandler(async (req, res) => {
  const { decision, reason, donorExplanation, internalNote, alternativeGuidance, matchingNeedId, expectedVersion } = req.body;

  const orgProfile = await OrganizationProfile.findOne({ user: req.user.userId });
  if (!orgProfile) return errorResponse(res, 'Organization profile required.', 403);

  if (decision === 'accept') {
    if (orgProfile.verificationStatus !== VERIFICATION_STATUS.APPROVED) {
      return errorResponse(res, 'Compliance restriction: You must have an Approved organization verification to accept donations.', 403);
    }

    const payload = {
      selectedOrganization: orgProfile._id,
      decision: {
        decidedAt: new Date(),
        decidedBy: req.user.userId,
        reason: reason || 'Accepted for community distribution',
        donorExplanation: donorExplanation || 'Thank you for your generous donation!',
        internalNote: internalNote || '',
      },
    };

    if (matchingNeedId) {
      payload.matchingNeed = matchingNeedId;
      // Increment need quantity accepted
      await DonationNeed.findByIdAndUpdate(matchingNeedId, {
        $inc: { quantityAccepted: 1 },
        $set: { status: COMMUNITY_NEED_STATUS.PARTIALLY_MATCHED },
      });
    }

    const updatedOffer = await transitionDonationStatus({
      donationId: req.params.id,
      targetStatus: DONATION_STATUS.ACCEPTED,
      actor: req.user,
      payload,
      expectedVersion,
      reason: 'Offer accepted by organization',
      publicNote: donorExplanation,
      internalNote,
    });

    await createNotification({
      userId: updatedOffer.owner.toString(),
      type: NOTIFICATION_TYPES.DONATION_OFFER_ACCEPTED,
      title: 'Donation Offer Accepted!',
      message: `${orgProfile.organizationName} has accepted your donation of ${updatedOffer.title || 'item'}. Please proceed to schedule collection.`,
      relatedEntityType: 'DonationOffer',
      relatedEntityId: updatedOffer._id,
    });

    return successResponse(res, { offer: updatedOffer }, 'Donation offer accepted successfully');
  } else if (decision === 'reject') {
    if (!reason) return errorResponse(res, 'A structured rejection reason is required.', 400);

    const payload = {
      decision: {
        decidedAt: new Date(),
        decidedBy: req.user.userId,
        reason,
        donorExplanation: donorExplanation || 'Unfortunately we cannot accept this item at this time.',
        internalNote: internalNote || '',
        alternativeGuidance: alternativeGuidance || 'Consider local certified electronic recyclers.',
      },
    };

    const updatedOffer = await transitionDonationStatus({
      donationId: req.params.id,
      targetStatus: DONATION_STATUS.REJECTED,
      actor: req.user,
      payload,
      expectedVersion,
      reason,
      publicNote: donorExplanation,
      internalNote,
    });

    await createNotification({
      userId: updatedOffer.owner.toString(),
      type: NOTIFICATION_TYPES.DONATION_ACCEPTED,
      title: 'Donation Offer Update',
      message: `${orgProfile.organizationName} could not accept this offer: ${donorExplanation || reason}. Alternative guidance: ${alternativeGuidance || 'Local recycling'}`,
      relatedEntityType: 'DonationOffer',
      relatedEntityId: updatedOffer._id,
    });

    return successResponse(res, { offer: updatedOffer }, 'Donation offer declined');
  } else {
    return errorResponse(res, 'Invalid decision action. Must be accept or reject.', 400);
  }
});

/**
 * POST /donations/offers/:id/schedule-handover
 */
const scheduleDonationHandover = asyncHandler(async (req, res) => {
  const { scheduledDate, timeWindow, method = 'dropoff', hubId, staffAssigned, instructions, expectedVersion } = req.body;

  const orgProfile = await OrganizationProfile.findOne({ user: req.user.userId });
  if (!orgProfile) return errorResponse(res, 'Organization profile required.', 403);

  // Validate scheduled date is not in past
  const scheduleTime = new Date(scheduledDate).getTime();
  if (scheduleTime < Date.now() - 60000) {
    return errorResponse(res, 'Handover date cannot be in the past.', 400);
  }

  // Validate hub status if dropoff
  if (method === 'dropoff' && hubId) {
    const hub = orgProfile.locations.id(hubId);
    if (!hub || hub.status === HUB_STATUS.INACTIVE || hub.status === HUB_STATUS.TEMPORARILY_CLOSED) {
      return errorResponse(res, 'Selected collection hub is currently inactive or temporarily closed.', 400);
    }
  }

  const confirmationCode = generateCode(6);

  const payload = {
    handover: {
      scheduledDate: new Date(scheduledDate),
      timeWindow: timeWindow || '09:00 - 17:00',
      method,
      hub: hubId || null,
      staffAssigned: staffAssigned || '',
      instructions: instructions || 'Please bring photo ID and handover confirmation code.',
      confirmationCode,
      donorConfirmed: false,
      orgConfirmed: false,
    },
  };

  const updatedOffer = await transitionDonationStatus({
    donationId: req.params.id,
    targetStatus: DONATION_STATUS.HANDOVER_SCHEDULED,
    actor: req.user,
    payload,
    expectedVersion,
    reason: 'Handover scheduled',
  });

  await createNotification({
    userId: updatedOffer.owner.toString(),
    type: NOTIFICATION_TYPES.DONATION_HANDOVER_SCHEDULED,
    title: 'Handover Scheduled',
    message: `Collection scheduled for ${new Date(scheduledDate).toLocaleDateString()} (${timeWindow}). Your handover confirmation code is: ${confirmationCode}`,
    relatedEntityType: 'DonationOffer',
    relatedEntityId: updatedOffer._id,
  });

  return successResponse(res, { offer: updatedOffer, confirmationCode }, 'Handover scheduled successfully');
});

/**
 * POST /donations/offers/:id/confirm-receipt
 */
const confirmDonationReceipt = asyncHandler(async (req, res) => {
  const { confirmationCode, expectedVersion } = req.body;

  const offer = await DonationOffer.findById(req.params.id);
  if (!offer) return errorResponse(res, 'Offer not found.', 404);

  // Validate code if supplied
  if (confirmationCode && offer.handover?.confirmationCode) {
    if (confirmationCode.trim().toUpperCase() !== offer.handover.confirmationCode.toUpperCase()) {
      return errorResponse(res, 'Invalid handover confirmation code.', 400);
    }
  }

  const payload = {
    'handover.orgConfirmed': true,
    'handover.receivedAt': new Date(),
  };

  const updatedOffer = await transitionDonationStatus({
    donationId: req.params.id,
    targetStatus: DONATION_STATUS.RECEIVED,
    actor: req.user,
    payload,
    expectedVersion,
    reason: 'Item received at hub / collection checkpoint',
  });

  // Increment need quantityReceived if attached
  if (updatedOffer.matchingNeed) {
    await DonationNeed.findByIdAndUpdate(updatedOffer.matchingNeed, {
      $inc: { quantityReceived: 1 },
      $set: { status: COMMUNITY_NEED_STATUS.PARTIALLY_FULFILLED },
    });
  }

  await createNotification({
    userId: updatedOffer.owner.toString(),
    type: NOTIFICATION_TYPES.DONATION_ITEM_RECEIVED,
    title: 'Donation Received',
    message: `Your donation of ${updatedOffer.title || 'item'} was successfully received and queued for technical inspection.`,
    relatedEntityType: 'DonationOffer',
    relatedEntityId: updatedOffer._id,
  });

  return successResponse(res, { offer: updatedOffer }, 'Item receipt confirmed');
});

/**
 * POST /donations/offers/:id/inspect
 */
const submitDonationInspection = asyncHandler(async (req, res) => {
  const { checklist, outcome, publicNotes, internalNotes, adminNotes, evidencePhotos = [], expectedVersion } = req.body;

  if (!outcome || !Object.values(INSPECTION_OUTCOMES).includes(outcome)) {
    return errorResponse(res, 'Valid inspection outcome required.', 400);
  }

  const payload = {
    inspection: {
      inspectedAt: new Date(),
      inspector: req.user.userId,
      checklist: checklist || {},
      outcome,
      publicNotes: publicNotes || '',
      internalNotes: internalNotes || '',
      adminNotes: adminNotes || '',
      evidencePhotos: evidencePhotos || [],
    },
  };

  const isRejected = outcome.startsWith('rejected');
  const targetStatus = isRejected ? DONATION_STATUS.REJECTED_AFTER_INSPECTION : DONATION_STATUS.INSPECTED;

  const updatedOffer = await transitionDonationStatus({
    donationId: req.params.id,
    targetStatus,
    actor: req.user,
    payload,
    expectedVersion,
    reason: `Inspection completed: ${outcome}`,
    publicNote: publicNotes,
    internalNote: internalNotes,
  });

  // If approved, increment need quantityApproved
  if (!isRejected && updatedOffer.matchingNeed) {
    await DonationNeed.findByIdAndUpdate(updatedOffer.matchingNeed, {
      $inc: { quantityApproved: 1 },
    });
  }

  await createNotification({
    userId: updatedOffer.owner.toString(),
    type: NOTIFICATION_TYPES.DONATION_INSPECTION_COMPLETED,
    title: 'Donation Inspected',
    message: `Inspection outcome: ${outcome.replace(/_/g, ' ')}. ${publicNotes || ''}`,
    relatedEntityType: 'DonationOffer',
    relatedEntityId: updatedOffer._id,
  });

  return successResponse(res, { offer: updatedOffer }, 'Inspection recorded successfully');
});

/**
 * POST /donations/offers/:id/process-outcome
 * Record verified processing outcome & automatically generate audited ImpactRecord
 */
const recordProcessingOutcome = asyncHandler(async (req, res) => {
  const {
    outcome,
    team,
    finalCondition,
    details = {},
    recyclingProvider,
    recyclingCertificate,
    beneficiaryProgram,
    measuredWeight,
    estimatedWeight,
    weightMethod = 'measured',
    replacementValueEstimate,
    evidencePhotos = [],
    expectedVersion,
  } = req.body;

  if (!outcome || !Object.values(PROCESSING_OUTCOMES).includes(outcome)) {
    return errorResponse(res, 'Valid processing outcome required.', 400);
  }

  const offer = await DonationOffer.findById(req.params.id).populate('item');
  if (!offer) return errorResponse(res, 'Offer not found.', 404);

  const orgProfile = await OrganizationProfile.findOne({ user: req.user.userId });
  if (!orgProfile) return errorResponse(res, 'Organization profile required.', 403);

  const weightKg = weightMethod === 'measured' ? Number(measuredWeight || 0) : Number(estimatedWeight || offer.estimatedWeight || 2);
  const repValue = Number(replacementValueEstimate || 5000);

  // 1. Create Audited ImpactRecord (Deduplication protected by unique sourceDonation index)
  let impactRecord;
  try {
    impactRecord = await ImpactRecord.create({
      item: offer.item?._id || offer.item,
      sourceDonation: offer._id,
      organization: orgProfile._id,
      outcome: outcome === PROCESSING_OUTCOMES.RESPONSIBLY_RECYCLED ? 'recycled' : 'donated',
      quantity: offer.quantity || 1,
      weightMethod,
      measuredWeight: weightMethod === 'measured' ? weightKg : 0,
      estimatedWeight: weightMethod === 'estimated' ? weightKg : 0,
      estimatedWasteAvoided: weightKg,
      replacementValueEstimate: repValue,
      verified: true,
      verifiedBy: req.user.userId,
      evidence: {
        notes: `Processed by ${team || 'Refurbishment Team'} - Outcome: ${outcome}`,
        photos: evidencePhotos,
        certificateUrl: recyclingCertificate || '',
      },
    });
  } catch (impactErr) {
    if (impactErr.code === 11000) {
      // Impact record already exists, fetch it
      impactRecord = await ImpactRecord.findOne({ sourceDonation: offer._id });
    } else {
      throw impactErr;
    }
  }

  // 2. Update Organization Impact Stats
  await OrganizationProfile.findByIdAndUpdate(orgProfile._id, {
    $inc: {
      'impactStats.totalItemsProcessed': offer.quantity || 1,
      'impactStats.totalWeightProcessed': weightKg,
      'impactStats.totalWasteAvoided': weightKg,
      'impactStats.totalBeneficiariesServed': outcome === PROCESSING_OUTCOMES.REDISTRIBUTED ? (offer.quantity || 1) : 0,
    },
  });

  // 3. Update Need quantityDistributed if applicable
  if (offer.matchingNeed) {
    const need = await DonationNeed.findById(offer.matchingNeed);
    if (need) {
      need.quantityDistributed += offer.quantity || 1;
      if (need.quantityDistributed >= need.quantityRequested) {
        need.status = COMMUNITY_NEED_STATUS.FULFILLED;
      }
      await need.save();
    }
  }

  // 4. Update Offer Processing & Transition to Completed
  const payload = {
    processing: {
      outcome,
      processedAt: new Date(),
      processedBy: req.user.userId,
      team: team || 'Technical Operations',
      finalCondition: finalCondition || 'Refurbished Grade A',
      details,
      recyclingProvider: recyclingProvider || '',
      recyclingCertificate: recyclingCertificate || '',
      beneficiaryProgram: beneficiaryProgram || '',
      impactRecord: impactRecord._id,
    },
  };

  const updatedOffer = await transitionDonationStatus({
    donationId: req.params.id,
    targetStatus: DONATION_STATUS.COMPLETED,
    actor: req.user,
    payload,
    expectedVersion,
    reason: `Final outcome completed: ${outcome}`,
  });

  await createNotification({
    userId: updatedOffer.owner.toString(),
    type: NOTIFICATION_TYPES.IMPACT_RECORD_CREATED,
    title: 'Donation Impact Verified!',
    message: `Your donation was processed as "${outcome.replace(/_/g, ' ')}" avoiding ${weightKg}kg of electronic waste. Thank you for your contribution!`,
    relatedEntityType: 'ImpactRecord',
    relatedEntityId: impactRecord._id,
  });

  return successResponse(
    res,
    { offer: updatedOffer, impactRecord },
    'Processing outcome recorded and community impact verified'
  );
});

// ===== COMMUNITY NEEDS CONTROLLER =====

/**
 * GET /donations/needs
 */
const getCommunityNeeds = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { category, status, urgency, organizationId } = req.query;

  const query = {};
  if (organizationId) query.organization = organizationId;
  else if (req.user.role === 'organization') {
    const orgProfile = await OrganizationProfile.findOne({ user: req.user.userId });
    if (orgProfile) query.organization = orgProfile._id;
  }

  if (category) query.category = category;
  if (status) query.status = status;
  if (urgency) query.urgency = urgency;

  const [needs, total] = await Promise.all([
    DonationNeed.find(query)
      .populate('category', 'name icon')
      .populate('organization', 'organizationName locations')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    DonationNeed.countDocuments(query),
  ]);

  return successResponse(res, {
    needs,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * POST /donations/needs
 * 5-step Guided Community Need creator with duplicate-publication protection
 */
const createCommunityNeed = asyncHandler(async (req, res) => {
  const orgProfile = await OrganizationProfile.findOne({ user: req.user.userId });
  if (!orgProfile) return errorResponse(res, 'Organization profile required.', 403);

  if (orgProfile.verificationStatus !== VERIFICATION_STATUS.APPROVED) {
    return errorResponse(res, 'Compliance restriction: You must be an approved organization to publish community needs.', 403);
  }

  const {
    title,
    category,
    description,
    urgency = 'medium',
    quantityRequested = 1,
    minimumCondition,
    requiredSpecifications = [],
    acceptedAlternatives = [],
    rejectedConditions = [],
    accessoriesNeeded = [],
    beneficiaryContext,
    collectionHub,
    pickupAvailable,
    serviceArea,
    targetDate,
    status = COMMUNITY_NEED_STATUS.PUBLISHED,
    draftData,
  } = req.body;

  // Prevent duplicate exact title active publication within 24h
  if (status === COMMUNITY_NEED_STATUS.PUBLISHED) {
    const existing = await DonationNeed.findOne({
      organization: orgProfile._id,
      title: title.trim(),
      category,
      status: COMMUNITY_NEED_STATUS.PUBLISHED,
      createdAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) },
    });
    if (existing) {
      return errorResponse(res, 'A community need with this exact title and category was recently published.', 409);
    }
  }

  const need = await DonationNeed.create({
    organization: orgProfile._id,
    title,
    category,
    description,
    urgency,
    quantityRequested: Number(quantityRequested),
    quantityNeeded: Number(quantityRequested),
    minimumCondition,
    requiredSpecifications,
    acceptedAlternatives,
    rejectedConditions,
    accessoriesNeeded,
    beneficiaryContext,
    collectionHub,
    pickupAvailable,
    serviceArea: serviceArea || orgProfile.serviceArea,
    targetDate: targetDate ? new Date(targetDate) : null,
    status,
    draftData,
  });

  return successResponse(res, { need }, 'Community need created successfully', 201);
});

/**
 * PATCH /donations/needs/:id
 */
const updateCommunityNeedStatus = asyncHandler(async (req, res) => {
  const orgProfile = await OrganizationProfile.findOne({ user: req.user.userId });
  if (!orgProfile) return errorResponse(res, 'Organization profile required.', 403);

  const need = await DonationNeed.findOne({ _id: req.params.id, organization: orgProfile._id });
  if (!need) return errorResponse(res, 'Community need not found.', 404);

  Object.assign(need, req.body);
  need.version = (need.version || 1) + 1;
  await need.save();

  return successResponse(res, { need }, 'Community need updated successfully');
});

// ===== COLLECTION HUBS CONTROLLER =====

/**
 * GET /organizations/me/hubs
 */
const getCollectionHubs = asyncHandler(async (req, res) => {
  const orgProfile = await OrganizationProfile.findOne({ user: req.user.userId }).populate(
    'locations.acceptedCategories',
    'name icon'
  );
  if (!orgProfile) return errorResponse(res, 'Organization profile not found.', 404);

  return successResponse(res, { hubs: orgProfile.locations || [] });
});

/**
 * POST /organizations/me/hubs
 */
const createCollectionHub = asyncHandler(async (req, res) => {
  const orgProfile = await OrganizationProfile.findOne({ user: req.user.userId });
  if (!orgProfile) return errorResponse(res, 'Organization profile not found.', 404);

  orgProfile.locations.push(req.body);
  await orgProfile.save();

  return successResponse(res, { hubs: orgProfile.locations }, 'Collection hub added successfully', 201);
});

/**
 * PATCH /organizations/me/hubs/:hubId/status
 */
const updateHubStatus = asyncHandler(async (req, res) => {
  const { status, reassignmentPlan } = req.body;
  const orgProfile = await OrganizationProfile.findOne({ user: req.user.userId });
  if (!orgProfile) return errorResponse(res, 'Organization profile not found.', 404);

  const hub = orgProfile.locations.id(req.params.hubId);
  if (!hub) return errorResponse(res, 'Collection hub not found.', 404);

  // If deactivating, check active handovers
  if (status === HUB_STATUS.INACTIVE || status === HUB_STATUS.TEMPORARILY_CLOSED) {
    const activeTasks = await DonationOffer.countDocuments({
      'handover.hub': hub._id,
      status: { $in: [DONATION_STATUS.HANDOVER_SCHEDULED, DONATION_STATUS.AWAITING_DROPOFF] },
    });
    if (activeTasks > 0 && !reassignmentPlan) {
      return errorResponse(
        res,
        `Cannot deactivate hub: There are ${activeTasks} active scheduled handovers linked to this hub. Please reassign them first.`,
        400
      );
    }
  }

  hub.status = status;
  await orgProfile.save();

  return successResponse(res, { hub }, 'Hub status updated');
});

// ===== IMPACT LEDGER CONTROLLER =====

/**
 * GET /organizations/me/impact
 * Audited impact breakdown with measured vs estimated metrics
 */
const getOrganizationImpact = asyncHandler(async (req, res) => {
  const orgProfile = await OrganizationProfile.findOne({ user: req.user.userId });
  if (!orgProfile) return errorResponse(res, 'Organization profile not found.', 404);

  const records = await ImpactRecord.find({ organization: orgProfile._id })
    .populate('item', 'title category')
    .sort({ recordedAt: -1 });

  let measuredWeightTotal = 0;
  let estimatedWeightTotal = 0;
  let replacementValueTotal = 0;

  records.forEach((r) => {
    if (r.weightMethod === 'measured') {
      measuredWeightTotal += r.measuredWeight || 0;
    } else {
      estimatedWeightTotal += r.estimatedWeight || 0;
    }
    replacementValueTotal += r.replacementValueEstimate || 0;
  });

  return successResponse(res, {
    impactSummary: {
      totalItemsProcessed: records.length,
      measuredWeightKg: Math.round(measuredWeightTotal * 10) / 10,
      estimatedWeightKg: Math.round(estimatedWeightTotal * 10) / 10,
      totalWeightAvoidedKg: Math.round((measuredWeightTotal + estimatedWeightTotal) * 10) / 10,
      totalReplacementValueSaved: replacementValueTotal,
    },
    records,
  });
});

module.exports = {
  getOrganizations,
  getOrganizationById,
  getMyOrganizationProfile,
  updateMyOrganizationProfile,
  submitOrgVerification,
  getPendingOrganizations,
  updateOrgVerificationStatus,
  getMyWorkspace,
  getDonationOffers,
  getOfferMatchExplanation,
  decideDonationOffer,
  scheduleDonationHandover,
  confirmDonationReceipt,
  submitDonationInspection,
  recordProcessingOutcome,
  getCommunityNeeds,
  createCommunityNeed,
  updateCommunityNeedStatus,
  getCollectionHubs,
  createCollectionHub,
  updateHubStatus,
  getOrganizationImpact,
};

const { OrganizationProfile, DonationNeed, ItemCategory } = require('../models');
const { calculateHaversineDistance } = require('./matchingService');
const { ITEM_CONDITION, VERIFICATION_STATUS } = require('../constants');

const CONDITION_RANK = {
  [ITEM_CONDITION.NEW]: 5,
  [ITEM_CONDITION.GOOD]: 4,
  [ITEM_CONDITION.FAIR]: 3,
  [ITEM_CONDITION.POOR]: 2,
  [ITEM_CONDITION.BROKEN]: 1,
  [ITEM_CONDITION.FOR_PARTS]: 1,
};

/**
 * Calculate multi-factor match score and structured breakdown between a DonationOffer and an OrganizationProfile / CommunityNeed
 * @param {Object} offer - Populated or plain DonationOffer document
 * @param {Object} orgProfile - OrganizationProfile document
 * @param {Object} [communityNeed] - Optional DonationNeed document
 * @returns {Object} Structured match analysis
 */
const calculateDonationMatch = (offer, orgProfile, communityNeed = null) => {
  const scores = {};
  const positiveMatches = [];
  const unmetRequirements = [];
  const physicalConfirmationRequired = [];

  const offerCategory = (offer.category?._id || offer.category || offer.item?.category?._id || offer.item?.category)?.toString();
  const offerCondition = offer.itemCondition || ITEM_CONDITION.FAIR;
  const offerHandover = offer.preferredHandover || 'either';

  // 1. Category Alignment (Weight: 40%)
  let categoryScore = 0;
  const neededCategoryIds = (orgProfile.neededItemCategories || []).map((c) => (c._id || c).toString());
  const acceptedCategoryIds = (orgProfile.acceptedItemCategories || []).map((c) => (c._id || c).toString());
  const rejectedCategoryIds = (orgProfile.rejectedCategories || []).map((c) => (c._id || c).toString());

  if (offerCategory && rejectedCategoryIds.includes(offerCategory)) {
    categoryScore = 0;
    unmetRequirements.push('This item category is on your organization’s rejected items list.');
  } else if (communityNeed && communityNeed.category?.toString() === offerCategory) {
    categoryScore = 100;
    positiveMatches.push(`Direct priority match for active Community Need: "${communityNeed.title || 'Community Request'}"`);
  } else if (offerCategory && neededCategoryIds.includes(offerCategory)) {
    categoryScore = 90;
    positiveMatches.push('Category is currently marked as High Priority Needed in your profile.');
  } else if (offerCategory && acceptedCategoryIds.includes(offerCategory)) {
    categoryScore = 70;
    positiveMatches.push('Category is listed under your Accepted Item Categories.');
  } else {
    categoryScore = 30;
    unmetRequirements.push('Category not explicitly listed in accepted or needed categories.');
  }
  scores.category = categoryScore;

  // 2. Condition Compatibility (Weight: 20%)
  let conditionScore = 50;
  const minRequiredCondition = communityNeed?.minimumCondition || ITEM_CONDITION.POOR;
  const offerRank = CONDITION_RANK[offerCondition] || 2;
  const minRank = CONDITION_RANK[minRequiredCondition] || 2;

  if (offerRank >= minRank) {
    conditionScore = Math.min(100, 60 + (offerRank - minRank) * 20);
    positiveMatches.push(`Condition '${offerCondition}' meets or exceeds required '${minRequiredCondition}'.`);
  } else {
    conditionScore = 20;
    unmetRequirements.push(`Item condition '${offerCondition}' is below the requested threshold '${minRequiredCondition}'.`);
  }
  scores.condition = conditionScore;

  // 3. Handover & Delivery Compatibility (Weight: 15%)
  let handoverScore = 50;
  const orgPickup = orgProfile.pickupAvailable;
  const orgDropoff = orgProfile.dropoffAvailable;

  if (offerHandover === 'either') {
    handoverScore = 100;
    positiveMatches.push('Donor is flexible with either pickup or drop-off.');
  } else if (offerHandover === 'pickup' && orgPickup) {
    handoverScore = 90;
    positiveMatches.push('Donor requested pickup, which your organization supports.');
  } else if (offerHandover === 'dropoff' && orgDropoff) {
    handoverScore = 90;
    positiveMatches.push('Donor can drop off at one of your collection hubs.');
  } else {
    handoverScore = 30;
    unmetRequirements.push(`Donor requested ${offerHandover}, but your organization only supports ${orgPickup ? 'pickup' : 'dropoff'}.`);
  }
  scores.handover = handoverScore;

  // 4. Distance / Service Area (Weight: 15%)
  let distanceScore = 50;
  const orgCoords = orgProfile.serviceArea?.coordinates || orgProfile.address?.coordinates?.coordinates;
  const donorCoords = offer.pickupLocation?.coordinates?.coordinates;

  if (
    orgCoords &&
    donorCoords &&
    (orgCoords[0] !== 0 || orgCoords[1] !== 0) &&
    (donorCoords[0] !== 0 || donorCoords[1] !== 0)
  ) {
    const distanceKm = calculateHaversineDistance(
      orgCoords[1],
      orgCoords[0],
      donorCoords[1],
      donorCoords[0]
    );
    const maxDist = orgProfile.maximumServiceDistance || 50;
    if (distanceKm <= maxDist) {
      distanceScore = Math.round(100 * (1 - distanceKm / (maxDist * 1.2)));
      positiveMatches.push(`Location is within ~${distanceKm.toFixed(1)} km of your service hub.`);
    } else {
      distanceScore = 10;
      unmetRequirements.push(`Location is ~${distanceKm.toFixed(1)} km away (exceeds ${maxDist} km service radius).`);
    }
  } else {
    distanceScore = 60; // Default when approximate
  }
  scores.distance = distanceScore;

  // 5. Need Urgency & Target Date (Weight: 10%)
  let urgencyScore = 50;
  if (communityNeed) {
    if (communityNeed.urgency === 'critical') {
      urgencyScore = 100;
      positiveMatches.push('Need has Critical Urgency flag.');
    } else if (communityNeed.urgency === 'high') {
      urgencyScore = 85;
    } else {
      urgencyScore = 65;
    }
  }
  scores.urgency = urgencyScore;

  // Physical Verification Checklist Requirements
  if (offer.dataBearing?.isDataBearing) {
    physicalConfirmationRequired.push('Data-Bearing Device: Must verify data sanitization / NIST 800-88 erasure during inspection.');
  }
  if (offer.safetyFlags?.length > 0) {
    physicalConfirmationRequired.push('Safety Clearance: Visual and multimeter inspection required for flagged hazards.');
  }
  physicalConfirmationRequired.push('Physical inspection required before counting toward verified community impact.');

  // Calculate Weighted Total Score
  const totalScore = Math.round(
    scores.category * 0.4 +
      scores.condition * 0.2 +
      scores.handover * 0.15 +
      scores.distance * 0.15 +
      scores.urgency * 0.1
  );

  const breakdown = [
    {
      factor: 'category',
      label: 'Category Alignment',
      score: scores.category,
      weight: '40%',
      match: scores.category >= 70,
    },
    {
      factor: 'condition',
      label: 'Condition Threshold',
      score: scores.condition,
      weight: '20%',
      match: scores.condition >= 50,
    },
    {
      factor: 'handover',
      label: 'Logistics & Handover',
      score: scores.handover,
      weight: '15%',
      match: scores.handover >= 60,
    },
    {
      factor: 'distance',
      label: 'Service Radius',
      score: scores.distance,
      weight: '15%',
      match: scores.distance >= 50,
    },
    {
      factor: 'urgency',
      label: 'Community Urgency',
      score: scores.urgency,
      weight: '10%',
      match: scores.urgency >= 60,
    },
  ];

  return {
    totalScore,
    breakdown,
    positiveMatches,
    unmetRequirements,
    physicalConfirmationRequired,
  };
};

module.exports = {
  calculateDonationMatch,
};

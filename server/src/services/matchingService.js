const { TechnicianProfile, TechnicianMatch, User } = require('../models');
const { VERIFICATION_STATUS, ACCOUNT_STATUS } = require('../constants');
const logger = require('../utils/logger');

/**
 * Matching weights (configurable by admin)
 */
const DEFAULT_WEIGHTS = {
  skill: 35,
  distance: 20,
  availability: 15,
  rating: 10,
  experience: 10,
  completion: 10,
};

/**
 * Match technicians to a repair request
 * @param {Object} repairRequest - Populated repair request
 * @param {Object} options - Matching options
 * @returns {Promise<Array>} Ranked technician matches
 */
const matchTechnicians = async (repairRequest, options = {}) => {
  const {
    weights = DEFAULT_WEIGHTS,
    maxResults = 20,
    filters = {},
  } = options;

  try {
    // Build query for eligible technicians
    const techQuery = {
      activeStatus: true,
    };

    // Only include verified technicians if category has high risk
    if (repairRequest.item?.category?.riskLevel === 'high' ||
        repairRequest.item?.category?.riskLevel === 'critical') {
      techQuery.verificationStatus = VERIFICATION_STATUS.APPROVED;
    }

    // Apply filters
    if (filters.serviceMethod) {
      techQuery.serviceMethods = filters.serviceMethod;
    }
    if (filters.minRating) {
      techQuery.averageRating = { $gte: filters.minRating };
    }
    if (filters.maxDistance) {
      // Will be filtered after distance calculation
    }

    // Find technician profiles
    const technicians = await TechnicianProfile.find(techQuery)
      .populate('user', 'fullName accountStatus')
      .populate('skills')
      .populate('supportedCategories')
      .limit(100);

    // Filter out suspended users
    const activeTechnicians = technicians.filter(
      (t) => t.user && t.user.accountStatus === ACCOUNT_STATUS.ACTIVE
    );

    // Score each technician
    const matches = [];

    for (const tech of activeTechnicians) {
      const scores = {};

      // 1. Skill relevance (35%)
      scores.skill = calculateSkillScore(tech, repairRequest);

      // 2. Distance score (20%)
      scores.distance = calculateDistanceScore(tech, repairRequest);

      // Apply max distance filter
      if (filters.maxDistance && scores._distanceKm > filters.maxDistance) {
        continue;
      }

      // 3. Availability score (15%)
      scores.availability = calculateAvailabilityScore(tech, repairRequest);

      // 4. Rating score (10%)
      scores.rating = calculateRatingScore(tech);

      // 5. Experience score (10%)
      scores.experience = calculateExperienceScore(tech);

      // 6. Completion score (10%)
      scores.completion = calculateCompletionScore(tech);

      // Calculate weighted total
      const totalScore =
        (scores.skill * weights.skill +
          scores.distance * weights.distance +
          scores.availability * weights.availability +
          scores.rating * weights.rating +
          scores.experience * weights.experience +
          scores.completion * weights.completion) / 100;

      // Generate explanation
      const explanation = generateExplanation(scores, tech);

      matches.push({
        technician: tech.user._id,
        technicianProfile: tech,
        skillScore: Math.round(scores.skill),
        distanceScore: Math.round(scores.distance),
        availabilityScore: Math.round(scores.availability),
        ratingScore: Math.round(scores.rating),
        experienceScore: Math.round(scores.experience),
        completionScore: Math.round(scores.completion),
        totalScore: Math.round(totalScore),
        explanation,
      });
    }

    // Sort by total score descending
    matches.sort((a, b) => b.totalScore - a.totalScore);

    // Apply price range filter
    if (filters.maxPrice) {
      return matches.filter(
        (m) =>
          !m.technicianProfile.priceRange.minimum ||
          m.technicianProfile.priceRange.minimum <= filters.maxPrice
      ).slice(0, maxResults);
    }

    return matches.slice(0, maxResults);
  } catch (error) {
    logger.error('Technician matching error:', error.message);
    throw error;
  }
};

/**
 * Calculate skill relevance score (0-100)
 */
function calculateSkillScore(tech, repairRequest) {
  const requestCategory = repairRequest.item?.category;
  const aiSkills = repairRequest.aiAnalysis?.recommendedSkillCategories || [];

  let score = 0;
  let factors = 0;

  // Check if tech supports the category
  if (requestCategory) {
    const categoryId = requestCategory._id ? requestCategory._id.toString() : requestCategory.toString();
    const supportsCategory = tech.supportedCategories.some(
      (c) => (c._id || c).toString() === categoryId
    );
    if (supportsCategory) score += 50;
    factors++;
  }

  // Check skill overlap with AI recommendations
  if (aiSkills.length > 0 && tech.skills.length > 0) {
    const techSkillNames = tech.skills.map((s) => (s.name || '').toLowerCase());
    const matchedSkills = aiSkills.filter((aiSkill) =>
      techSkillNames.some((ts) => ts.includes(aiSkill.toLowerCase()) || aiSkill.toLowerCase().includes(ts))
    );
    const skillOverlap = matchedSkills.length / aiSkills.length;
    score += skillOverlap * 50;
    factors++;
  }

  return factors > 0 ? Math.min(score, 100) : 50; // Default 50 if no data
}

/**
 * Calculate distance score (0-100, closer is better)
 */
function calculateDistanceScore(tech, repairRequest) {
  const techCoords = tech.serviceArea?.coordinates;
  const itemCoords = repairRequest.item?.approximateLocation?.coordinates?.coordinates;

  if (!techCoords || !itemCoords || 
      (techCoords[0] === 0 && techCoords[1] === 0) ||
      (itemCoords[0] === 0 && itemCoords[1] === 0)) {
    return 50; // Default when location data unavailable
  }

  const distanceKm = calculateHaversineDistance(
    techCoords[1], techCoords[0],
    itemCoords[1], itemCoords[0]
  );

  // Store raw distance for filtering
  tech._distanceKm = distanceKm;

  const maxDistance = tech.maximumServiceDistance || 25;

  if (distanceKm > maxDistance) return 0;
  if (distanceKm <= 5) return 100;

  // Linear interpolation
  return Math.round(100 * (1 - distanceKm / maxDistance));
}

/**
 * Calculate availability score (0-100)
 */
function calculateAvailabilityScore(tech, repairRequest) {
  if (!tech.workingHours) return 50;

  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[now.getDay()];

  // Check if available today
  const todayHours = tech.workingHours[today];
  if (todayHours && todayHours.available) return 80;

  // Check next 3 days
  let availableSoon = 0;
  for (let i = 1; i <= 3; i++) {
    const futureDay = dayNames[(now.getDay() + i) % 7];
    if (tech.workingHours[futureDay]?.available) {
      availableSoon++;
    }
  }

  return Math.min(availableSoon * 25 + 20, 100);
}

/**
 * Calculate rating score (0-100)
 */
function calculateRatingScore(tech) {
  if (tech.reviewCount === 0) return 50;
  return Math.round((tech.averageRating / 5) * 100);
}

/**
 * Calculate experience score (0-100)
 */
function calculateExperienceScore(tech) {
  const years = tech.yearsOfExperience || 0;
  const completed = tech.completedRepairCount || 0;

  // Years: max at 10+
  const yearScore = Math.min(years / 10, 1) * 50;
  // Completed repairs: max at 100+
  const completedScore = Math.min(completed / 100, 1) * 50;

  return Math.round(yearScore + completedScore);
}

/**
 * Calculate completion/reliability score (0-100)
 */
function calculateCompletionScore(tech) {
  const completionRate = tech.completionRate || 0;
  const responseTime = tech.averageResponseTime || 24;

  // Completion rate: direct percentage
  const completionScore = completionRate * 0.6;
  // Response time: max score at 2 hours, zero at 72+
  const responseScore = Math.max(0, (1 - responseTime / 72)) * 40;

  return Math.round(Math.min(completionScore + responseScore, 100));
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(scores, tech) {
  const parts = [];

  if (scores.skill >= 70) parts.push('Strong skill match');
  else if (scores.skill >= 40) parts.push('Relevant skills');

  if (scores.distance >= 70) parts.push('Nearby location');
  if (scores.rating >= 80) parts.push(`Highly rated (${tech.averageRating.toFixed(1)}/5)`);
  if (scores.experience >= 70) parts.push('Experienced');
  if (scores.completion >= 70) parts.push('Reliable track record');

  return parts.join(' • ') || 'Available technician';
}

/**
 * Haversine formula for distance between two points
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Save match results to database
 */
const saveMatches = async (repairRequestId, matches) => {
  const matchDocs = matches.map((m) => ({
    repairRequest: repairRequestId,
    technician: m.technician,
    skillScore: m.skillScore,
    distanceScore: m.distanceScore,
    availabilityScore: m.availabilityScore,
    ratingScore: m.ratingScore,
    experienceScore: m.experienceScore,
    completionScore: m.completionScore,
    totalScore: m.totalScore,
    explanation: m.explanation,
    status: 'generated',
  }));

  // Remove previous matches for this request
  await TechnicianMatch.deleteMany({ repairRequest: repairRequestId });

  // Insert new matches
  return TechnicianMatch.insertMany(matchDocs);
};

module.exports = {
  matchTechnicians,
  saveMatches,
  DEFAULT_WEIGHTS,
  calculateHaversineDistance,
};

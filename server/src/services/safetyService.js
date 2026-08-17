const { SafetyRule } = require('../models');
const logger = require('../utils/logger');

/**
 * Default high-risk keywords to check before any AI analysis
 */
const DEFAULT_SAFETY_KEYWORDS = {
  electrical: {
    keywords: ['spark', 'sparks', 'sparking', 'electric shock', 'electrocution', 'exposed wire', 'exposed wiring', 'high voltage', 'short circuit'],
    riskType: 'electrical',
    severity: 'high',
    warningMessage: 'This issue may involve electrical safety risks. Do not open or continue operating the item. Contact a qualified technician for inspection.',
  },
  fire: {
    keywords: ['smoke', 'smoking', 'burning smell', 'burnt smell', 'fire', 'flame', 'overheating', 'melting', 'melted'],
    riskType: 'fire',
    severity: 'critical',
    warningMessage: 'This issue may involve fire safety risks. Stop using the item immediately and ensure it is unplugged or disconnected. Contact a qualified technician.',
  },
  battery: {
    keywords: ['swollen battery', 'battery is swollen', 'bloated battery', 'battery is bloated', 'leaking battery', 'battery leak', 'lithium battery damage', 'damaged battery', 'puffed battery', 'bulging battery', 'battery is bulging'],
    riskType: 'battery',
    severity: 'critical',
    warningMessage: 'This issue may involve a damaged battery which can be hazardous. Do not puncture, heat, or continue using the item. Contact a qualified technician for safe handling.',
  },
  chemical: {
    keywords: ['gas leak', 'gas leakage', 'chemical leak', 'hazardous chemical', 'toxic fume', 'pressurized', 'pressurised'],
    riskType: 'chemical',
    severity: 'critical',
    warningMessage: 'This issue may involve chemical or gas safety risks. Ensure the area is well-ventilated. Do not attempt repairs. Contact a qualified technician.',
  },
  radiation: {
    keywords: ['microwave component', 'magnetron', 'x-ray', 'radiation'],
    riskType: 'radiation',
    severity: 'critical',
    warningMessage: 'This issue may involve radiation safety concerns. Do not open or disassemble the item. Contact a qualified technician.',
  },
  mechanical: {
    keywords: ['brake system', 'braking system', 'safety guard', 'disabled safety', 'removed guard'],
    riskType: 'mechanical',
    severity: 'high',
    warningMessage: 'This issue may involve mechanical safety risks. Do not operate the item. Contact a qualified technician for inspection.',
  },
  medical: {
    keywords: ['medical equipment', 'medical device', 'life support', 'pacemaker'],
    riskType: 'medical',
    severity: 'critical',
    warningMessage: 'Medical equipment must be serviced by certified professionals. Do not attempt repairs. Contact the equipment manufacturer or a certified service center.',
  },
};

/**
 * Check text against safety rules
 * @param {string} text - Text to check (description, event, etc.)
 * @param {string} categoryId - Item category ID (optional)
 * @returns {Promise<Array>} Array of safety flags
 */
const checkSafetyRules = async (text, categoryId = null) => {
  const flags = [];
  const lowerText = text.toLowerCase();

  // 1. Check against default keywords (deterministic)
  for (const [key, rule] of Object.entries(DEFAULT_SAFETY_KEYWORDS)) {
    for (const keyword of rule.keywords) {
      if (lowerText.includes(keyword)) {
        flags.push({
          type: rule.riskType,
          severity: rule.severity,
          reason: `Description contains safety-relevant keyword: "${keyword}"`,
          warningMessage: rule.warningMessage,
          detectedBy: 'rule',
          keyword,
        });
        break; // One flag per risk type is enough
      }
    }
  }

  // 2. Check against database safety rules
  try {
    const query = { active: true };
    if (categoryId) {
      query.$or = [
        { categories: { $size: 0 } },
        { categories: categoryId },
      ];
    }

    const dbRules = await SafetyRule.find(query);

    for (const rule of dbRules) {
      for (const keyword of rule.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          // Avoid duplicate flags for same risk type
          const alreadyFlagged = flags.some((f) => f.type === rule.riskType);
          if (!alreadyFlagged) {
            flags.push({
              type: rule.riskType,
              severity: rule.severity,
              reason: `Safety rule triggered: ${rule.riskType}`,
              warningMessage: rule.warningMessage,
              detectedBy: 'rule',
              keyword,
              blockAIAdvice: rule.blockAIAdvice,
            });
          }
          break;
        }
      }
    }
  } catch (error) {
    logger.error('Error checking database safety rules:', error.message);
  }

  return flags;
};

/**
 * Check if any safety flags should block AI advice
 * @param {Array} safetyFlags
 * @returns {boolean}
 */
const shouldBlockAIAdvice = (safetyFlags) => {
  return safetyFlags.some(
    (flag) =>
      flag.severity === 'critical' ||
      flag.blockAIAdvice === true
  );
};

/**
 * Get the highest severity from flags
 * @param {Array} safetyFlags
 * @returns {string}
 */
const getHighestSeverity = (safetyFlags) => {
  const order = ['low', 'medium', 'high', 'critical'];
  let highest = 'low';
  for (const flag of safetyFlags) {
    if (order.indexOf(flag.severity) > order.indexOf(highest)) {
      highest = flag.severity;
    }
  }
  return highest;
};

/**
 * Generate safety warning message for the user
 * @param {Array} safetyFlags
 * @returns {string}
 */
const generateSafetyWarning = (safetyFlags) => {
  if (safetyFlags.length === 0) return '';

  const types = [...new Set(safetyFlags.map((f) => f.type))];
  const riskTypes = types.join(', ');

  return `This issue may involve ${riskTypes} safety risks. Do not open or continue operating the item. Contact a qualified technician for inspection.`;
};

module.exports = {
  checkSafetyRules,
  shouldBlockAIAdvice,
  getHighestSeverity,
  generateSafetyWarning,
  DEFAULT_SAFETY_KEYWORDS,
};

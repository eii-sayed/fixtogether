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
 * Validate a regex pattern for length, syntax, and catastrophic backtracking risks
 */
const validateRegexPattern = (patternStr, flags = 'i') => {
  if (!patternStr || typeof patternStr !== 'string') {
    return { valid: false, message: 'Pattern must be a non-empty string.' };
  }

  if (patternStr.length > 250) {
    return { valid: false, message: 'Pattern exceeds maximum safe length of 250 characters.' };
  }

  // Check for dangerous nested quantifiers (e.g. (a+)+ or (a*)* or (x+x+)+)
  const nestedQuantifierRegex = /\([^()]*[+*][^()]*\)[+*]/;
  if (nestedQuantifierRegex.test(patternStr)) {
    return { valid: false, message: 'Pattern contains nested quantifiers with high ReDoS catastrophic backtracking risk.' };
  }

  try {
    const reg = new RegExp(patternStr, flags);
    // Benchmark test on synthetic text to ensure < 15ms execution
    const testSample = 'FixTogether Safety Benchmark Testing String 1234567890 '.repeat(10);
    const start = Date.now();
    reg.test(testSample);
    const elapsed = Date.now() - start;
    if (elapsed > 50) {
      return { valid: false, message: `Pattern execution timed out (${elapsed}ms). Optimize regex to prevent slowdowns.` };
    }
    return { valid: true, regex: reg };
  } catch (err) {
    return { valid: false, message: `Invalid regex syntax: ${err.message}` };
  }
};

/**
 * Run test cases for a given safety rule
 */
const runRuleTestCases = async (ruleId) => {
  const rule = await SafetyRule.findById(ruleId);
  if (!rule) throw new Error('Rule not found');

  const now = new Date();
  let allPassed = true;

  for (const tc of rule.testCases || []) {
    let matched = false;
    if (rule.patternType === 'regex' && rule.regexPattern) {
      const validation = validateRegexPattern(rule.regexPattern);
      if (validation.valid) {
        matched = validation.regex.test(tc.input);
      }
    } else {
      matched = (rule.keywords || []).some((kw) =>
        tc.input.toLowerCase().includes(kw.toLowerCase())
      );
    }

    tc.passed = matched === tc.expectedMatch;
    tc.lastTestedAt = now;
    if (!tc.passed) allPassed = false;
  }

  await rule.save();
  return { allPassed, testCases: rule.testCases };
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

  // 2. Check against database safety rules (Keywords and Safe Regex)
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
      let isMatched = false;
      let matchedTerm = '';

      if (rule.patternType === 'regex' && rule.regexPattern) {
        const val = validateRegexPattern(rule.regexPattern);
        if (val.valid && val.regex.test(text)) {
          isMatched = true;
          matchedTerm = rule.regexPattern;
        }
      } else if (rule.keywords?.length > 0) {
        for (const keyword of rule.keywords) {
          if (lowerText.includes(keyword.toLowerCase())) {
            isMatched = true;
            matchedTerm = keyword;
            break;
          }
        }
      }

      if (isMatched) {
        const alreadyFlagged = flags.some((f) => f.type === rule.riskType);
        if (!alreadyFlagged) {
          flags.push({
            type: rule.riskType,
            severity: rule.severity,
            reason: `Safety rule "${rule.name || rule.riskType}" triggered`,
            warningMessage: rule.warningMessage,
            technicianWarningMessage: rule.technicianWarningMessage || '',
            detectedBy: 'rule',
            keyword: matchedTerm,
            blockAIAdvice: rule.blockAIAdvice,
          });
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
  validateRegexPattern,
  runRuleTestCases,
  DEFAULT_SAFETY_KEYWORDS,
};


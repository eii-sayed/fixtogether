const config = require('../../config');
const MockAIProvider = require('./mockProvider');
const OpenAIProvider = require('./openaiProvider');
const GeminiProvider = require('./geminiProvider');
const logger = require('../../utils/logger');

/**
 * AI Service - Factory and abstraction layer
 *
 * Selects the AI provider based on environment configuration.
 * Validates all AI responses before returning them.
 */

let providerInstance = null;

/**
 * Get the configured AI provider instance
 * @returns {MockAIProvider|OpenAIProvider|GeminiProvider}
 */
const getProvider = () => {
  if (providerInstance) return providerInstance;

  const providerName = (config.ai.provider || 'gemini').toLowerCase();

  switch (providerName) {
    case 'gemini':
    case 'google':
      if (!config.ai.gemini.apiKey) {
        logger.warn('Gemini API key not configured. Falling back to mock provider.');
        providerInstance = new MockAIProvider();
      } else {
        providerInstance = new GeminiProvider();
        logger.info(`AI provider: Gemini (${config.ai.gemini.model || 'gemini-3.6-flash'})`);
      }
      break;
    case 'openai':
      if (!config.ai.openai.apiKey) {
        logger.warn('OpenAI API key not configured. Falling back to mock provider.');
        providerInstance = new MockAIProvider();
      } else {
        providerInstance = new OpenAIProvider();
        logger.info('AI provider: OpenAI');
      }
      break;
    case 'mock':
    default:
      providerInstance = new MockAIProvider();
      logger.info('AI provider: Mock');
      break;
  }

  return providerInstance;
};

/**
 * Validate the AI analysis response schema
 * @param {Object} response - AI analysis response
 * @returns {{valid: boolean, errors: string[], sanitized: Object}}
 */
const validateAnalysisResponse = (response) => {
  const errors = [];
  const sanitized = {};

  // Required fields
  sanitized.itemCategory = typeof response.itemCategory === 'string' ? response.itemCategory : '';
  sanitized.itemSubcategory = typeof response.itemSubcategory === 'string' ? response.itemSubcategory : '';

  // Extracted symptoms
  if (Array.isArray(response.extractedSymptoms)) {
    sanitized.extractedSymptoms = response.extractedSymptoms
      .filter((s) => s && typeof s === 'object')
      .map((s) => ({
        type: typeof s.type === 'string' ? s.type : 'unknown',
        description: typeof s.description === 'string' ? s.description : '',
        severity: ['unknown', 'low', 'medium', 'high'].includes(s.severity) ? s.severity : 'unknown',
      }));
  } else {
    sanitized.extractedSymptoms = [];
    errors.push('extractedSymptoms is not an array');
  }

  // Arrays of strings
  const stringArrayFields = [
    'possibleInspectionAreas',
    'recommendedTechnicianSkills',
    'missingInformation',
    'clarificationQuestions',
  ];

  for (const field of stringArrayFields) {
    if (Array.isArray(response[field])) {
      sanitized[field] = response[field].filter((item) => typeof item === 'string');
    } else {
      sanitized[field] = [];
      errors.push(`${field} is not an array`);
    }
  }

  // Safety flags
  if (Array.isArray(response.safetyFlags)) {
    sanitized.safetyFlags = response.safetyFlags
      .filter((f) => f && typeof f === 'object')
      .map((f) => ({
        type: typeof f.type === 'string' ? f.type : 'unknown',
        severity: typeof f.severity === 'string' ? f.severity : 'unknown',
        reason: typeof f.reason === 'string' ? f.reason : '',
      }));
  } else {
    sanitized.safetyFlags = [];
  }

  // Suggested pathways
  const validPathways = ['repair', 'refurbishment', 'donation', 'parts', 'recycling'];
  if (Array.isArray(response.suggestedPathways)) {
    sanitized.suggestedPathways = response.suggestedPathways
      .filter((p) => p && typeof p === 'object')
      .map((p) => ({
        pathway: validPathways.includes(p.pathway) ? p.pathway : 'repair',
        reason: typeof p.reason === 'string' ? p.reason : '',
        requiresHumanVerification: true, // Always force this to true
      }));
  } else {
    sanitized.suggestedPathways = [];
    errors.push('suggestedPathways is not an array');
  }

  // Confidence (cap at 85 for safety)
  sanitized.confidence = typeof response.confidence === 'number'
    ? Math.min(Math.max(response.confidence, 0), 85)
    : 0;

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
};

/**
 * Analyze a repair request using the configured AI provider
 * @param {Object} params - Analysis parameters
 * @returns {Promise<{analysis: Object, provider: string, model: string, processingTime: number}>}
 */
const analyzeRepairRequest = async (params) => {
  const provider = getProvider();
  const startTime = Date.now();

  try {
    const rawResponse = await provider.analyzeRepairRequest(params);
    const { valid, errors, sanitized } = validateAnalysisResponse(rawResponse);

    if (!valid) {
      logger.warn('AI response validation errors:', errors);
    }

    return {
      analysis: sanitized,
      provider: provider.name,
      model: provider.model,
      processingTime: Date.now() - startTime,
      validationErrors: errors,
    };
  } catch (error) {
    logger.error('AI analysis failed:', error.message);
    // If external provider fails (e.g. 429 quota exhausted or network error), fallback gracefully to Mock provider
    if (provider.name !== 'mock') {
      logger.warn('Falling back to Mock AI Provider due to provider error.');
      const fallbackProvider = new MockAIProvider();
      const rawResponse = await fallbackProvider.analyzeRepairRequest(params);
      const { valid, errors, sanitized } = validateAnalysisResponse(rawResponse);
      return {
        analysis: sanitized,
        provider: 'mock (fallback)',
        model: fallbackProvider.model,
        processingTime: Date.now() - startTime,
        validationErrors: errors,
      };
    }
    throw error;
  }
};

/**
 * Generate clarification questions
 */
const generateClarificationQuestions = async (params) => {
  const provider = getProvider();
  return provider.generateClarificationQuestions(params);
};

/**
 * Summarize reviews
 */
const summarizeReviews = async (params) => {
  const provider = getProvider();
  return provider.summarizeReviews(params);
};

/**
 * Suggest reuse pathway
 */
const suggestReusePathway = async (params) => {
  const provider = getProvider();
  return provider.suggestReusePathway(params);
};

/**
 * Find semantic matches
 */
const findSemanticMatches = async (params) => {
  const provider = getProvider();
  if (typeof provider.findSemanticMatches === 'function') {
    return provider.findSemanticMatches(params);
  }
  return [];
};

/**
 * Detect potential duplicates
 */
const detectPotentialDuplicate = async (params) => {
  const provider = getProvider();
  return provider.detectPotentialDuplicate(params);
};

/**
 * Health check
 */
const healthCheck = async () => {
  const provider = getProvider();
  return provider.healthCheck();
};

/**
 * Get current provider info
 */
const getProviderInfo = () => {
  const provider = getProvider();
  return { name: provider.name, model: provider.model };
};

module.exports = {
  analyzeRepairRequest,
  generateClarificationQuestions,
  summarizeReviews,
  suggestReusePathway,
  findSemanticMatches,
  detectPotentialDuplicate,
  healthCheck,
  getProviderInfo,
  validateAnalysisResponse,
};

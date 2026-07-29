const Joi = require('joi');

const createItemSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),
  category: Joi.string().required().messages({ 'string.empty': 'Category is required' }),
  subcategory: Joi.string().allow('', null).optional(),
  brand: Joi.string().trim().max(100).allow('').optional(),
  model: Joi.string().trim().max(100).allow('').optional(),
  approximateAge: Joi.object({
    value: Joi.number().min(0).optional(),
    unit: Joi.string().valid('days', 'months', 'years').optional(),
  }).optional(),
  condition: Joi.string().valid('new', 'good', 'fair', 'poor', 'broken', 'for_parts').required(),
  serialNumberPrivate: Joi.string().allow('').optional(),
  ownershipDeclaration: Joi.boolean().optional(),
  approximateLocation: Joi.object({
    city: Joi.string().allow('').optional(),
    area: Joi.string().allow('').optional(),
  }).optional(),
});

const createRepairRequestSchema = Joi.object({
  itemId: Joi.string().required(),
  problemDescription: Joi.string().trim().min(20).max(5000).required()
    .messages({ 'string.min': 'Please describe the problem in at least 20 characters' }),
  issueStartedAt: Joi.date().allow(null).optional(),
  eventBeforeIssue: Joi.string().trim().max(2000).allow('').optional(),
  previousRepairAttempts: Joi.string().trim().max(2000).allow('').optional(),
  budgetMinimum: Joi.number().min(0).optional(),
  budgetMaximum: Joi.number().min(0).optional(),
  preferredServiceMethod: Joi.string().valid('onsite', 'pickup', 'dropoff', 'remote', '').optional(),
  availability: Joi.string().trim().max(500).allow('').optional(),
});

const updateRepairRequestSchema = Joi.object({
  problemDescription: Joi.string().trim().min(20).max(5000).optional(),
  issueStartedAt: Joi.date().allow(null).optional(),
  eventBeforeIssue: Joi.string().trim().max(2000).allow('').optional(),
  previousRepairAttempts: Joi.string().trim().max(2000).allow('').optional(),
  budgetMinimum: Joi.number().min(0).optional(),
  budgetMaximum: Joi.number().min(0).optional(),
  preferredServiceMethod: Joi.string().valid('onsite', 'pickup', 'dropoff', 'remote', '').optional(),
  availability: Joi.string().trim().max(500).allow('').optional(),
});

const aiReviewSchema = Joi.object({
  correctedCategory: Joi.string().allow('').optional(),
  correctedSubcategory: Joi.string().allow('').optional(),
  correctedSymptoms: Joi.array().items(
    Joi.object({
      type: Joi.string().required(),
      description: Joi.string().required(),
      severity: Joi.string().valid('unknown', 'low', 'medium', 'high').required(),
    })
  ).optional(),
  correctionNotes: Joi.string().max(1000).allow('').optional(),
});

const clarificationAnswersSchema = Joi.object({
  answers: Joi.array().items(
    Joi.object({
      questionIndex: Joi.number().integer().min(0).required(),
      answer: Joi.string().trim().min(1).max(2000).required(),
    })
  ).required(),
});

const createQuotationSchema = Joi.object({
  inspectionFee: Joi.number().min(0).default(0),
  laborCostMinimum: Joi.number().min(0).required(),
  laborCostMaximum: Joi.number().min(0).required(),
  partsEstimate: Joi.number().min(0).default(0),
  transportFee: Joi.number().min(0).default(0),
  otherCosts: Joi.number().min(0).default(0),
  expectedDuration: Joi.object({
    value: Joi.number().min(1).required(),
    unit: Joi.string().valid('hours', 'days', 'weeks').required(),
  }).required(),
  warrantyDays: Joi.number().min(0).default(30),
  conditions: Joi.string().trim().max(2000).allow('').optional(),
  technicianNotes: Joi.string().trim().max(2000).allow('').optional(),
  expirationDate: Joi.date().optional(),
});

const createAppointmentSchema = Joi.object({
  repairRequestId: Joi.string().required(),
  technicianId: Joi.string().required(),
  appointmentType: Joi.string().valid('inspection', 'repair', 'pickup', 'dropoff').required(),
  scheduledStart: Joi.date().required(),
  scheduledEnd: Joi.date().required(),
  location: Joi.object({
    address: Joi.string().allow('').optional(),
    city: Joi.string().allow('').optional(),
  }).optional(),
  notes: Joi.string().max(1000).allow('').optional(),
});

const inspectionSchema = Joi.object({
  confirmedProblem: Joi.string().trim().max(3000).required(),
  diagnosedComponents: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      issue: Joi.string().required(),
      needsReplacement: Joi.boolean().default(false),
    })
  ).optional(),
  repairFeasible: Joi.string().valid('yes', 'partial', 'no', 'uncertain').required(),
  riskLevel: Joi.string().valid('low', 'medium', 'high', 'critical').default('low'),
  requiredParts: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      partNumber: Joi.string().allow('').optional(),
      estimated_cost: Joi.number().min(0).default(0),
      available: Joi.boolean().default(false),
    })
  ).optional(),
  estimatedCompletionDate: Joi.date().allow(null).optional(),
  technicianNotes: Joi.string().trim().max(3000).allow('').optional(),
});

const createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  communicationRating: Joi.number().integer().min(1).max(5).default(3),
  serviceQualityRating: Joi.number().integer().min(1).max(5).default(3),
  valueRating: Joi.number().integer().min(1).max(5).default(3),
  reviewText: Joi.string().trim().max(2000).allow('').optional(),
});

const createDisputeSchema = Joi.object({
  category: Joi.string().valid('quality', 'cost', 'timeline', 'communication', 'damage', 'warranty', 'other').required(),
  description: Joi.string().trim().min(20).max(5000).required(),
});

const createDonationSchema = Joi.object({
  itemId: Joi.string().required(),
  description: Joi.string().trim().max(2000).allow('').optional(),
  itemCondition: Joi.string().valid('new', 'good', 'fair', 'poor', 'broken', 'for_parts').required(),
  availableComponents: Joi.array().items(Joi.string()).optional(),
  missingComponents: Joi.array().items(Joi.string()).optional(),
  preferredHandover: Joi.string().valid('pickup', 'dropoff', 'either').default('either'),
  pickupLocation: Joi.object({
    address: Joi.string().allow('').optional(),
    city: Joi.string().allow('').optional(),
  }).optional(),
});

const createPartSchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  category: Joi.string().allow('', null).optional(),
  brand: Joi.string().trim().allow('').optional(),
  modelCompatibility: Joi.array().items(Joi.string()).optional(),
  partNumber: Joi.string().trim().allow('').optional(),
  condition: Joi.string().valid('new', 'tested_working', 'untested', 'damaged').required(),
  tested: Joi.boolean().default(false),
  sourceItem: Joi.string().allow('', null).optional(),
  price: Joi.number().min(0).default(0),
  quantity: Joi.number().min(1).default(1),
});

module.exports = {
  createItemSchema,
  createRepairRequestSchema,
  updateRepairRequestSchema,
  aiReviewSchema,
  clarificationAnswersSchema,
  createQuotationSchema,
  createAppointmentSchema,
  inspectionSchema,
  createReviewSchema,
  createDisputeSchema,
  createDonationSchema,
  createPartSchema,
};

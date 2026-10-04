const express = require('express');
const router = express.Router();
const rrController = require('../controllers/repairRequestController');
const quotationController = require('../controllers/quotationController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { createRepairRequestSchema, updateRepairRequestSchema, aiReviewSchema, clarificationAnswersSchema, quickRepairRequestSchema, quickQuoteSchema, acceptJobSchema } = require('../validators/requestValidators');
const { writeLimiter, publishLimiter, aiLimiter } = require('../middleware/rateLimiter');
const { uploadMultipleImages } = require('../middleware/upload');
const { ROLES } = require('../constants');

// ─── Quick (combined) endpoints — MUST be before /:id routes ─────────
router.post('/quick', authenticate, authorize(ROLES.OWNER), uploadMultipleImages('images', 10), validate(quickRepairRequestSchema), writeLimiter, rrController.quickRepairRequest);

// List & detail — accessible by owner, technician, and admin (filtering enforced in controller)
router.get('/', authenticate, authorize(ROLES.OWNER, ROLES.TECHNICIAN, ROLES.ADMIN), rrController.getRepairRequests);
router.get('/:id', authenticate, authorize(ROLES.OWNER, ROLES.TECHNICIAN, ROLES.ADMIN), rrController.getRepairRequestById);

// Owner mutations & request lifecycle
router.post('/', authenticate, authorize(ROLES.OWNER), validate(createRepairRequestSchema), writeLimiter, rrController.createRepairRequest);
router.patch('/:id', authenticate, authorize(ROLES.OWNER), validate(updateRepairRequestSchema), writeLimiter, rrController.updateRepairRequest);
router.post('/:id/analyze', authenticate, authorize(ROLES.OWNER), aiLimiter, rrController.analyzeRepairRequest);
router.patch('/:id/ai-review', authenticate, authorize(ROLES.OWNER), validate(aiReviewSchema), writeLimiter, rrController.reviewAIAnalysis);
router.post('/:id/answers', authenticate, authorize(ROLES.OWNER), validate(clarificationAnswersSchema), writeLimiter, rrController.submitClarificationAnswers);
router.post('/:id/publish', authenticate, authorize(ROLES.OWNER), publishLimiter, rrController.publishRepairRequest);
router.post('/:id/cancel', authenticate, authorize(ROLES.OWNER), writeLimiter, rrController.cancelRepairRequest);
router.get('/:id/matches', authenticate, rrController.getMatches);
router.post('/:id/invitations', authenticate, authorize(ROLES.OWNER, ROLES.ADMIN), rrController.sendInvitations);
router.post('/:id/assign', authenticate, writeLimiter, rrController.assignTechnician);

// Technician actions: 1-click job acceptance & quotations
router.post('/:id/accept-job', authenticate, authorize(ROLES.TECHNICIAN), validate(acceptJobSchema), writeLimiter, rrController.acceptJob);
router.post('/:id/quotations', authenticate, authorize(ROLES.TECHNICIAN), quotationController.createQuotation);
router.post('/:id/quick-quote', authenticate, authorize(ROLES.TECHNICIAN), validate(quickQuoteSchema), writeLimiter, quotationController.quickQuote);
router.get('/:id/quotations', authenticate, quotationController.getQuotationsForRequest);

module.exports = router;



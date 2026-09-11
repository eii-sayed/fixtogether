const express = require('express');
const router = express.Router();
const rrController = require('../controllers/repairRequestController');
const quotationController = require('../controllers/quotationController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { createRepairRequestSchema, updateRepairRequestSchema, aiReviewSchema, clarificationAnswersSchema } = require('../validators/requestValidators');
const { writeLimiter, publishLimiter, aiLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../constants');

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

// Quotations on repair requests
router.post('/:id/quotations', authenticate, authorize(ROLES.TECHNICIAN), quotationController.createQuotation);
router.get('/:id/quotations', authenticate, quotationController.getQuotationsForRequest);

module.exports = router;

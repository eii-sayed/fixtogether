const express = require('express');
const router = express.Router();
const rrController = require('../controllers/repairRequestController');
const quotationController = require('../controllers/quotationController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { createRepairRequestSchema, updateRepairRequestSchema, aiReviewSchema, clarificationAnswersSchema } = require('../validators/requestValidators');
const { ROLES } = require('../constants');

router.post('/', authenticate, authorize(ROLES.OWNER), validate(createRepairRequestSchema), rrController.createRepairRequest);
router.get('/', authenticate, rrController.getRepairRequests);
router.get('/:id', authenticate, rrController.getRepairRequestById);
router.patch('/:id', authenticate, authorize(ROLES.OWNER), validate(updateRepairRequestSchema), rrController.updateRepairRequest);
router.post('/:id/analyze', authenticate, authorize(ROLES.OWNER), rrController.analyzeRepairRequest);
router.patch('/:id/ai-review', authenticate, authorize(ROLES.OWNER), validate(aiReviewSchema), rrController.reviewAIAnalysis);
router.post('/:id/answers', authenticate, authorize(ROLES.OWNER), validate(clarificationAnswersSchema), rrController.submitClarificationAnswers);
router.post('/:id/publish', authenticate, authorize(ROLES.OWNER), rrController.publishRepairRequest);
router.post('/:id/cancel', authenticate, authorize(ROLES.OWNER), rrController.cancelRepairRequest);
router.get('/:id/matches', authenticate, rrController.getMatches);
router.post('/:id/invitations', authenticate, authorize(ROLES.OWNER), rrController.sendInvitations);

// Quotations on repair requests
router.post('/:id/quotations', authenticate, authorize(ROLES.TECHNICIAN), quotationController.createQuotation);
router.get('/:id/quotations', authenticate, quotationController.getQuotationsForRequest);

module.exports = router;

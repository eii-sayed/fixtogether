const express = require('express');
const router = express.Router();
const rjController = require('../controllers/repairJobController');
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { requireVerifiedTechnician } = require('../middleware/professionalVerification');
const { uploadMultipleImages } = require('../middleware/upload');
const { ROLES } = require('../constants');
const { validate } = require('../middleware/validate');
const { recordPaymentSchema, paymentDecisionSchema, requestRefundSchema, refundDecisionSchema } = require('../validators/requestValidators');
const { writeLimiter } = require('../middleware/rateLimiter');

router.use(authenticate, requireVerifiedTechnician);

// Repair jobs
router.get('/', authenticate, rjController.getRepairJobs);
router.get('/:id', authenticate, rjController.getRepairJobById);
router.patch('/:id/status', authenticate, authorize(ROLES.TECHNICIAN, ROLES.ADMIN), rjController.updateRepairJobStatus);
router.post('/:id/parts', authenticate, authorize(ROLES.TECHNICIAN), rjController.addParts);
router.patch('/:id/parts/:partIndex', authenticate, authorize(ROLES.TECHNICIAN, ROLES.ADMIN), rjController.updatePartStatus);
router.post('/:id/cost-approval', authenticate, authorize(ROLES.TECHNICIAN), uploadMultipleImages('images', 5), rjController.requestCostApproval);
router.post('/:id/cost-approval/decision', authenticate, authorize(ROLES.OWNER), rjController.ownerCostApprovalDecision);
router.post('/:id/quality-check', authenticate, authorize(ROLES.TECHNICIAN), uploadMultipleImages('images', 5), rjController.submitQualityCheck);
router.post('/:id/completion', authenticate, authorize(ROLES.TECHNICIAN), uploadMultipleImages('images', 10), rjController.submitCompletion);
router.post('/:id/quick-solve', authenticate, authorize(ROLES.TECHNICIAN), uploadMultipleImages('images', 5), rjController.quickSolve);
router.post('/:id/quick-start', authenticate, authorize(ROLES.TECHNICIAN), rjController.quickStart);
router.post('/:id/owner-confirmation', authenticate, authorize(ROLES.OWNER), rjController.ownerConfirmCompletion);
router.post('/:id/confirm-completion', authenticate, authorize(ROLES.OWNER), rjController.ownerConfirmCompletion);

// Payment ledger: the platform records direct settlement evidence, while both
// parties confirm money movement before the repair job balance changes.
router.get('/:id/payments', authenticate, paymentController.getPaymentLedger);
router.post('/:id/payments', authenticate, writeLimiter, validate(recordPaymentSchema), paymentController.recordPayment);
router.patch('/:id/payments/:paymentId/decision', authenticate, writeLimiter, validate(paymentDecisionSchema), paymentController.decidePayment);
router.post('/:id/payments/:paymentId/refunds', authenticate, writeLimiter, validate(requestRefundSchema), paymentController.requestRefund);
router.patch('/:id/refunds/:refundId/decision', authenticate, writeLimiter, validate(refundDecisionSchema), paymentController.decideRefund);


// Inspection
router.post('/:id/inspection', authenticate, authorize(ROLES.TECHNICIAN), uploadMultipleImages('images', 5), rjController.createInspection);
router.get('/:id/inspection', authenticate, rjController.getInspection);
router.post('/inspection/:id/decision', authenticate, authorize(ROLES.OWNER), rjController.ownerInspectionDecision);

// Reviews
router.post('/:id/reviews', authenticate, authorize(ROLES.OWNER), rjController.createReview);

// Disputes
router.post('/:id/disputes', authenticate, rjController.createDispute);

module.exports = router;

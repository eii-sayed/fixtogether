const express = require('express');
const router = express.Router();
const rjController = require('../controllers/repairJobController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { uploadMultipleImages } = require('../middleware/upload');
const { ROLES } = require('../constants');

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
router.post('/:id/owner-confirmation', authenticate, authorize(ROLES.OWNER), rjController.ownerConfirmCompletion);

// Inspection
router.post('/:id/inspection', authenticate, authorize(ROLES.TECHNICIAN), uploadMultipleImages('images', 5), rjController.createInspection);
router.get('/:id/inspection', authenticate, rjController.getInspection);
router.post('/inspection/:id/decision', authenticate, authorize(ROLES.OWNER), rjController.ownerInspectionDecision);

// Reviews
router.post('/:id/reviews', authenticate, authorize(ROLES.OWNER), rjController.createReview);

// Disputes
router.post('/:id/disputes', authenticate, rjController.createDispute);

module.exports = router;

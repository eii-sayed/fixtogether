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
router.post('/:id/completion', authenticate, authorize(ROLES.TECHNICIAN), uploadMultipleImages('images', 10), rjController.submitCompletion);
router.post('/:id/owner-confirmation', authenticate, authorize(ROLES.OWNER), rjController.ownerConfirmCompletion);

// Inspection
router.post('/:id/inspection', authenticate, authorize(ROLES.TECHNICIAN), rjController.createInspection);
router.get('/:id/inspection', authenticate, rjController.getInspection);

// Reviews
router.post('/:id/reviews', authenticate, authorize(ROLES.OWNER), rjController.createReview);

// Disputes
router.post('/:id/disputes', authenticate, rjController.createDispute);

module.exports = router;

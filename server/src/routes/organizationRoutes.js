const express = require('express');
const router = express.Router();
const orgController = require('../controllers/organizationController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { uploadMultipleImages } = require('../middleware/upload');
const { ROLES } = require('../constants');
const { updateOrganizationProfileSchema } = require('../validators/profileValidators');

// Public organization routes
router.get('/', orgController.getOrganizations);
router.get('/:id', orgController.getOrganizationById);

// Authenticated organization private routes
router.get(
  '/me/profile',
  authenticate,
  authorize(ROLES.ORGANIZATION),
  orgController.getMyOrganizationProfile
);
router.put(
  '/me/profile',
  authenticate,
  authorize(ROLES.ORGANIZATION),
  validate(updateOrganizationProfileSchema),
  orgController.updateMyOrganizationProfile
);
router.post(
  '/me/verification',
  authenticate,
  authorize(ROLES.ORGANIZATION),
  uploadMultipleImages('documents', 5),
  orgController.submitOrgVerification
);

module.exports = router;

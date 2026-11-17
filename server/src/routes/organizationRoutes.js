const express = require('express');
const router = express.Router();
const orgController = require('../controllers/organizationController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { requireVerifiedOrganization } = require('../middleware/professionalVerification');
const { validate } = require('../middleware/validate');
const { uploadVerificationDocuments } = require('../middleware/upload');
const { ROLES } = require('../constants');
const { updateOrganizationProfileSchema } = require('../validators/profileValidators');

// Public organization routes
router.get('/', orgController.getOrganizations);
router.get('/:id', orgController.getOrganizationById);

// Authenticated organization private routes
router.get(
  '/me/workspace',
  authenticate,
  authorize(ROLES.ORGANIZATION),
  requireVerifiedOrganization,
  orgController.getMyWorkspace
);
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
  uploadVerificationDocuments,
  orgController.submitOrgVerification
);

// Collection Hubs
router.get(
  '/me/hubs',
  authenticate,
  authorize(ROLES.ORGANIZATION),
  requireVerifiedOrganization,
  orgController.getCollectionHubs
);
router.post(
  '/me/hubs',
  authenticate,
  authorize(ROLES.ORGANIZATION),
  requireVerifiedOrganization,
  orgController.createCollectionHub
);
router.patch(
  '/me/hubs/:hubId/status',
  authenticate,
  authorize(ROLES.ORGANIZATION),
  requireVerifiedOrganization,
  orgController.updateHubStatus
);

// Impact Ledger
router.get(
  '/me/impact',
  authenticate,
  authorize(ROLES.ORGANIZATION),
  requireVerifiedOrganization,
  orgController.getOrganizationImpact
);

module.exports = router;

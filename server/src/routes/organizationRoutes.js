const express = require('express');
const router = express.Router();
const orgController = require('../controllers/organizationController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { uploadMultipleImages } = require('../middleware/upload');
const { ROLES } = require('../constants');

router.get('/', orgController.getOrganizations);
router.get('/me/profile', authenticate, authorize(ROLES.ORGANIZATION), orgController.getMyOrganizationProfile);
router.put('/me/profile', authenticate, authorize(ROLES.ORGANIZATION), orgController.updateMyOrganizationProfile);
router.post('/me/verification', authenticate, authorize(ROLES.ORGANIZATION), uploadMultipleImages('documents', 5), orgController.submitOrgVerification);
router.get('/:id', orgController.getOrganizationById);

module.exports = router;

const express = require('express');
const router = express.Router();
const techController = require('../controllers/technicianController');
const businessController = require('../controllers/technicianBusinessController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { requireVerifiedTechnician } = require('../middleware/professionalVerification');
const { validate } = require('../middleware/validate');
const { uploadMultipleImages, uploadVerificationDocuments } = require('../middleware/upload');
const { ROLES } = require('../constants');
const {
  updateTechnicianProfileSchema,
  updateTechnicianAvailabilitySchema,
  addPortfolioSchema,
} = require('../validators/profileValidators');
const {
  createServiceTemplateSchema,
  updateServiceTemplateSchema,
  earningsQuerySchema,
} = require('../validators/technicianBusinessValidators');

// Public listing
router.get('/', techController.getTechnicians);

// Authenticated private technician routes
router.get(
  '/me/workspace',
  authenticate,
  authorize(ROLES.TECHNICIAN),
  requireVerifiedTechnician,
  techController.getMyTechnicianWorkspace
);
router.get(
  '/requests/:requestId/match-details',
  authenticate,
  authorize(ROLES.TECHNICIAN),
  requireVerifiedTechnician,
  techController.getRepairRequestMatchDetails
);
router.get(
  '/me/profile',
  authenticate,
  authorize(ROLES.TECHNICIAN),
  techController.getMyTechnicianProfile
);
router.put(
  '/me/profile',
  authenticate,
  authorize(ROLES.TECHNICIAN),
  validate(updateTechnicianProfileSchema),
  techController.updateMyTechnicianProfile
);
router.patch(
  '/me/availability',
  authenticate,
  authorize(ROLES.TECHNICIAN),
  validate(updateTechnicianAvailabilitySchema),
  techController.updateAvailability
);

// Technician business tools. These are intentionally restricted to approved
// technicians because they expose customer and settlement information.
router.get('/me/service-templates', authenticate, authorize(ROLES.TECHNICIAN), requireVerifiedTechnician, businessController.listServiceTemplates);
router.post('/me/service-templates', authenticate, authorize(ROLES.TECHNICIAN), requireVerifiedTechnician, validate(createServiceTemplateSchema), businessController.createServiceTemplate);
router.patch('/me/service-templates/:id', authenticate, authorize(ROLES.TECHNICIAN), requireVerifiedTechnician, validate(updateServiceTemplateSchema), businessController.updateServiceTemplate);
router.delete('/me/service-templates/:id', authenticate, authorize(ROLES.TECHNICIAN), requireVerifiedTechnician, businessController.deleteServiceTemplate);
router.get('/me/customers', authenticate, authorize(ROLES.TECHNICIAN), requireVerifiedTechnician, businessController.getCustomerHistory);
router.get('/me/earnings', authenticate, authorize(ROLES.TECHNICIAN), requireVerifiedTechnician, validate(earningsQuerySchema, 'query'), businessController.getEarningsAnalytics);
router.get('/me/invoices', authenticate, authorize(ROLES.TECHNICIAN), requireVerifiedTechnician, businessController.listMyInvoices);

// Portfolio management
router.post(
  '/me/portfolio',
  authenticate,
  authorize(ROLES.TECHNICIAN),
  uploadMultipleImages('images', 2),
  validate(addPortfolioSchema),
  techController.addPortfolioItem
);
router.delete(
  '/me/portfolio/:itemId',
  authenticate,
  authorize(ROLES.TECHNICIAN),
  techController.deletePortfolioItem
);

// Verification submission
router.post(
  '/me/verification',
  authenticate,
  authorize(ROLES.TECHNICIAN),
  uploadVerificationDocuments,
  techController.submitVerification
);

// Public technician profile and reviews (accessible by anyone)
router.get('/:id', techController.getTechnicianById);
router.get('/:id/reviews', require('../controllers/repairJobController').getTechnicianReviews);

module.exports = router;

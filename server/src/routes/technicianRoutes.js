const express = require('express');
const router = express.Router();
const techController = require('../controllers/technicianController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { uploadMultipleImages } = require('../middleware/upload');
const { ROLES } = require('../constants');
const {
  updateTechnicianProfileSchema,
  updateTechnicianAvailabilitySchema,
  addPortfolioSchema,
} = require('../validators/profileValidators');

// Public technician routes
router.get('/', techController.getTechnicians);
router.get('/:id', techController.getTechnicianById);
router.get('/:id/reviews', require('../controllers/repairJobController').getTechnicianReviews);

// Authenticated private technician routes
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
  uploadMultipleImages('documents', 5),
  techController.submitVerification
);

module.exports = router;

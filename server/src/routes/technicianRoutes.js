const express = require('express');
const router = express.Router();
const techController = require('../controllers/technicianController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { uploadMultipleImages } = require('../middleware/upload');
const { ROLES } = require('../constants');

router.get('/', techController.getTechnicians);
router.get('/me/profile', authenticate, authorize(ROLES.TECHNICIAN), techController.getMyTechnicianProfile);
router.put('/me/profile', authenticate, authorize(ROLES.TECHNICIAN), techController.updateMyTechnicianProfile);
router.post('/me/verification', authenticate, authorize(ROLES.TECHNICIAN), uploadMultipleImages('documents', 5), techController.submitVerification);
router.get('/:id', techController.getTechnicianById);
router.get('/:id/reviews', require('../controllers/repairJobController').getTechnicianReviews);

module.exports = router;

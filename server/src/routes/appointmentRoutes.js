const express = require('express');
const router = express.Router();
const aptController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { requireVerifiedTechnician } = require('../middleware/professionalVerification');
const { validate } = require('../middleware/validate');
const {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  updateAppointmentStatusSchema,
} = require('../validators/requestValidators');
const { writeLimiter } = require('../middleware/rateLimiter');

router.post('/', authenticate, requireVerifiedTechnician, writeLimiter, validate(createAppointmentSchema), aptController.createAppointment);
router.get('/', authenticate, requireVerifiedTechnician, aptController.getAppointments);
router.get('/:id', authenticate, requireVerifiedTechnician, aptController.getAppointmentById);
router.patch('/:id/reschedule', authenticate, requireVerifiedTechnician, writeLimiter, validate(rescheduleAppointmentSchema), aptController.rescheduleAppointment);
router.patch('/:id/cancel', authenticate, requireVerifiedTechnician, writeLimiter, validate(cancelAppointmentSchema), aptController.cancelAppointment);
router.patch('/:id/status', authenticate, requireVerifiedTechnician, writeLimiter, validate(updateAppointmentStatusSchema), aptController.updateAppointmentStatus);

module.exports = router;

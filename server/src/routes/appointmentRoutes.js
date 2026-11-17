const express = require('express');
const router = express.Router();
const aptController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  updateAppointmentStatusSchema,
} = require('../validators/requestValidators');
const { writeLimiter } = require('../middleware/rateLimiter');

router.post('/', authenticate, writeLimiter, validate(createAppointmentSchema), aptController.createAppointment);
router.get('/', authenticate, aptController.getAppointments);
router.get('/:id', authenticate, aptController.getAppointmentById);
router.patch('/:id/reschedule', authenticate, writeLimiter, validate(rescheduleAppointmentSchema), aptController.rescheduleAppointment);
router.patch('/:id/cancel', authenticate, writeLimiter, validate(cancelAppointmentSchema), aptController.cancelAppointment);
router.patch('/:id/status', authenticate, writeLimiter, validate(updateAppointmentStatusSchema), aptController.updateAppointmentStatus);

module.exports = router;

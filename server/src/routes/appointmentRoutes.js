const express = require('express');
const router = express.Router();
const aptController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createAppointmentSchema } = require('../validators/requestValidators');

router.post('/', authenticate, validate(createAppointmentSchema), aptController.createAppointment);
router.get('/', authenticate, aptController.getAppointments);
router.get('/:id', authenticate, aptController.getAppointmentById);
router.patch('/:id/reschedule', authenticate, aptController.rescheduleAppointment);
router.patch('/:id/cancel', authenticate, aptController.cancelAppointment);
router.patch('/:id/status', authenticate, aptController.updateAppointmentStatus);

module.exports = router;

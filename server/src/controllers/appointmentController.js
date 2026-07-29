const { Appointment, RepairRequest } = require('../models');
const { APPOINTMENT_STATUS, NOTIFICATION_TYPES } = require('../constants');
const { asyncHandler, successResponse, errorResponse, parsePagination, paginationMeta } = require('../utils/helpers');
const { createNotification } = require('../services/notificationService');

const createAppointment = asyncHandler(async (req, res) => {
  const { repairRequestId, technicianId, appointmentType, scheduledStart, scheduledEnd, location, notes } = req.body;

  // Check for conflicts
  const conflict = await Appointment.findOne({
    technician: technicianId,
    status: { $in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CONFIRMED] },
    $or: [
      { scheduledStart: { $lt: new Date(scheduledEnd) }, scheduledEnd: { $gt: new Date(scheduledStart) } },
    ],
  });
  if (conflict) return errorResponse(res, 'Time slot conflicts with an existing appointment.', 409);

  const appointment = await Appointment.create({
    repairRequest: repairRequestId, owner: req.user.userId,
    technician: technicianId, appointmentType, scheduledStart, scheduledEnd, location, notes,
  });

  // Update repair request status
  const request = await RepairRequest.findById(repairRequestId);
  if (request) {
    request.requestStatus = 'appointment_scheduled';
    await request.save();
  }

  await createNotification({
    userId: technicianId, type: NOTIFICATION_TYPES.APPOINTMENT_SCHEDULED,
    title: 'New Appointment', message: `An appointment has been scheduled.`,
    relatedEntityType: 'Appointment', relatedEntityId: appointment._id,
  });

  return successResponse(res, { appointment }, 'Appointment created', 201);
});

const getAppointments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (req.user.role === 'owner') query.owner = req.user.userId;
  else if (req.user.role === 'technician') query.technician = req.user.userId;

  const [appointments, total] = await Promise.all([
    Appointment.find(query).populate('repairRequest', 'item').populate('owner', 'fullName')
      .populate('technician', 'fullName').sort({ scheduledStart: 1 }).skip(skip).limit(limit),
    Appointment.countDocuments(query),
  ]);
  return successResponse(res, { appointments, pagination: paginationMeta(total, page, limit) });
});

const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('repairRequest').populate('owner', 'fullName email phone')
    .populate('technician', 'fullName email phone');
  if (!appointment) return errorResponse(res, 'Not found.', 404);
  return successResponse(res, { appointment });
});

const rescheduleAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return errorResponse(res, 'Not found.', 404);

  const { scheduledStart, scheduledEnd } = req.body;
  appointment.scheduledStart = scheduledStart;
  appointment.scheduledEnd = scheduledEnd;
  appointment.status = APPOINTMENT_STATUS.RESCHEDULED;
  await appointment.save();

  const notifyUser = appointment.owner.toString() === req.user.userId.toString()
    ? appointment.technician : appointment.owner;
  await createNotification({
    userId: notifyUser.toString(), type: NOTIFICATION_TYPES.APPOINTMENT_CHANGED,
    title: 'Appointment Rescheduled', message: 'An appointment has been rescheduled.',
    relatedEntityType: 'Appointment', relatedEntityId: appointment._id,
  });

  return successResponse(res, { appointment }, 'Rescheduled');
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return errorResponse(res, 'Not found.', 404);
  appointment.status = APPOINTMENT_STATUS.CANCELLED;
  appointment.cancellationReason = req.body.reason || '';
  await appointment.save();
  return successResponse(res, { appointment }, 'Cancelled');
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return errorResponse(res, 'Not found.', 404);
  const { status } = req.body;
  appointment.status = status;
  if (status === APPOINTMENT_STATUS.IN_PROGRESS) appointment.checkInTime = new Date();
  if (status === APPOINTMENT_STATUS.COMPLETED) appointment.completionTime = new Date();
  await appointment.save();
  return successResponse(res, { appointment }, 'Status updated');
});

module.exports = { createAppointment, getAppointments, getAppointmentById,
  rescheduleAppointment, cancelAppointment, updateAppointmentStatus };

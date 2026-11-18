const mongoose = require('mongoose');
const { Appointment, RepairRequest, RepairJob, Quotation, TechnicianProfile } = require('../models');
const { APPOINTMENT_STATUS, NOTIFICATION_TYPES, REPAIR_REQUEST_STATUS, ROLES } = require('../constants');
const { asyncHandler, successResponse, errorResponse, parsePagination, paginationMeta } = require('../utils/helpers');
const { createNotification } = require('../services/notificationService');
const { transitionRepairRequest } = require('../services/stateTransitionService');
const { withTransaction } = require('../utils/transaction');
const { createAuditLog } = require('../middleware/auditLog');

const ACTIVE_SLOT_STATUSES = [
  APPOINTMENT_STATUS.SCHEDULED,
  APPOINTMENT_STATUS.CONFIRMED,
  APPOINTMENT_STATUS.RESCHEDULED,
  APPOINTMENT_STATUS.IN_PROGRESS,
];
const CLOSED_STATUSES = [
  APPOINTMENT_STATUS.CANCELLED,
  APPOINTMENT_STATUS.COMPLETED,
  APPOINTMENT_STATUS.NO_SHOW,
];

const createHttpError = (status, message) => Object.assign(new Error(message), { status });
const hasId = (value, id) => value && value.toString() === id.toString();
const canAccessAppointment = (appointment, user) => (
  user.role === ROLES.ADMIN || hasId(appointment.owner, user.userId) || hasId(appointment.technician, user.userId)
);

const isValidTimeZone = (timeZone) => {
  try {
    Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
};

const getLocalTime = (date, timeZone) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  return {
    day: parts.weekday.toLowerCase(),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

const timeToMinutes = (value) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const assertTechnicianAvailable = (profile, start, end, requestedTimeZone) => {
  if (!profile || !profile.activeStatus || profile.availabilityStatus !== 'available') {
    throw createHttpError(409, 'The technician is not currently available for appointments.');
  }
  if (profile.vacationMode && (!profile.vacationUntil || new Date(profile.vacationUntil) >= start)) {
    throw createHttpError(409, 'The technician is currently unavailable due to vacation.');
  }

  const timeZone = isValidTimeZone(profile.timeZone) ? profile.timeZone : requestedTimeZone;
  const localStart = getLocalTime(start, timeZone);
  const localEnd = getLocalTime(end, timeZone);
  const workingDay = profile.workingHours?.[localStart.day];
  if (localStart.day !== localEnd.day) {
    throw createHttpError(400, 'Appointments must start and end on the same local day for the technician.');
  }
  if (!workingDay?.available) {
    throw createHttpError(409, 'The technician is unavailable on the requested day.');
  }

  const workStart = timeToMinutes(workingDay.start);
  const workEnd = timeToMinutes(workingDay.end);
  if (workStart === null || workEnd === null || workEnd <= workStart) {
    throw createHttpError(409, 'The technician has not configured valid working hours for the requested day.');
  }
  if (localStart.minutes < workStart || localEnd.minutes > workEnd) {
    throw createHttpError(409, 'The appointment falls outside the technician’s published working hours.');
  }
};

const findSchedulingConflict = async ({ technicianId, scheduledStart, scheduledEnd, excludeAppointmentId, session }) => {
  const query = {
    technician: technicianId,
    status: { $in: ACTIVE_SLOT_STATUSES },
    scheduledStart: { $lt: scheduledEnd },
    scheduledEnd: { $gt: scheduledStart },
  };
  if (excludeAppointmentId) query._id = { $ne: excludeAppointmentId };
  const conflictQuery = Appointment.findOne(query).select('_id scheduledStart scheduledEnd');
  if (session) conflictQuery.session(session);
  return conflictQuery;
};

const assertValidObjectId = (id, name) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createHttpError(400, `Invalid ${name}.`);
};

const assertTechnicianIsAssigned = async (request, technicianId, session) => {
  const [job, selectedQuotation] = await Promise.all([
    RepairJob.exists({ repairRequest: request._id, technician: technicianId }).session(session),
    request.selectedQuotation
      ? Quotation.exists({ _id: request.selectedQuotation, technician: technicianId, status: 'accepted' }).session(session)
      : null,
  ]);
  if (!job && !selectedQuotation) {
    throw createHttpError(403, 'Appointments can only be booked with the technician selected for this repair.');
  }
};

const createAppointment = asyncHandler(async (req, res) => {
  if (![ROLES.OWNER, ROLES.ADMIN].includes(req.user.role)) {
    return errorResponse(res, 'Only the request owner or an administrator can schedule an appointment.', 403);
  }

  const { repairRequestId, technicianId, appointmentType, scheduledStart, scheduledEnd, location, notes, timeZone } = req.body;
  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);

  try {
    assertValidObjectId(repairRequestId, 'repair request ID');
    assertValidObjectId(technicianId, 'technician ID');
    const result = await withTransaction(async (session) => {
      const request = await RepairRequest.findById(repairRequestId).session(session);
      if (!request) throw createHttpError(404, 'Repair request not found.');
      if (req.user.role !== ROLES.ADMIN && !hasId(request.owner, req.user.userId)) {
        throw createHttpError(403, 'You can only schedule appointments for your own repair requests.');
      }
      if (![REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED, REPAIR_REQUEST_STATUS.APPOINTMENT_SCHEDULED].includes(request.requestStatus)) {
        throw createHttpError(409, 'An appointment can be scheduled only after a quotation has been accepted.');
      }

      await assertTechnicianIsAssigned(request, technicianId, session);
      const profile = await TechnicianProfile.findOne({ user: technicianId }).session(session);
      assertTechnicianAvailable(profile, start, end, timeZone);
      const conflict = await findSchedulingConflict({ technicianId, scheduledStart: start, scheduledEnd: end, session });
      if (conflict) throw createHttpError(409, 'Time slot conflicts with an existing appointment.');
      // Force concurrent schedule writes for this technician to conflict and
      // retry. On retry, the interval query sees the newly created appointment.
      profile.scheduleVersion = (profile.scheduleVersion || 0) + 1;
      await profile.save({ session });

      const [appointment] = await Appointment.create([{
        repairRequest: request._id,
        owner: request.owner,
        technician: technicianId,
        appointmentType,
        scheduledStart: start,
        scheduledEnd: end,
        timeZone,
        location,
        notes,
      }], { session });

      if (request.requestStatus === REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED) {
        await transitionRepairRequest(request._id, REPAIR_REQUEST_STATUS.APPOINTMENT_SCHEDULED, req.user, {
          reason: 'Appointment scheduled after quotation acceptance', req, session,
        });
      }
      return { appointment, technicianId };
    });

    await createNotification({
      userId: result.technicianId,
      type: NOTIFICATION_TYPES.APPOINTMENT_SCHEDULED,
      title: 'New Appointment',
      message: 'An appointment has been scheduled for an accepted repair.',
      relatedEntityType: 'Appointment',
      relatedEntityId: result.appointment._id,
    });
    await createAuditLog({
      actor: req.user.userId,
      action: 'APPOINTMENT_CREATED',
      targetType: 'Appointment',
      targetId: result.appointment._id,
      metadata: { repairRequestId, technicianId, scheduledStart: start, scheduledEnd: end },
    }, req);
    return successResponse(res, { appointment: result.appointment }, 'Appointment created', 201);
  } catch (error) {
    if (error.status) return errorResponse(res, error.message, error.status);
    throw error;
  }
});

const getAppointments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (req.user.role === ROLES.OWNER) query.owner = req.user.userId;
  else if (req.user.role === ROLES.TECHNICIAN) query.technician = req.user.userId;
  else if (req.user.role !== ROLES.ADMIN) return errorResponse(res, 'Access denied.', 403);

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate({ path: 'repairRequest', select: 'requestStatus item', populate: { path: 'item', select: 'title category brand model images' } })
      .populate('owner', 'fullName email phone profileImage')
      .populate('technician', 'fullName email phone profileImage')
      .sort({ scheduledStart: 1 })
      .skip(skip)
      .limit(limit),
    Appointment.countDocuments(query),
  ]);
  return successResponse(res, { appointments, pagination: paginationMeta(total, page, limit) });
});

const getAppointmentById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return errorResponse(res, 'Invalid appointment ID.', 400);
  const appointment = await Appointment.findById(req.params.id)
    .populate('repairRequest')
    .populate('owner', 'fullName email phone')
    .populate('technician', 'fullName email phone');
  if (!appointment) return errorResponse(res, 'Not found.', 404);
  if (!canAccessAppointment(appointment, req.user)) return errorResponse(res, 'Access denied.', 403);
  return successResponse(res, { appointment });
});

const escapeIcsText = (value = '') => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

const toIcsUtc = (value) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const exportAppointmentCalendar = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return errorResponse(res, 'Invalid appointment ID.', 400);
  const appointment = await Appointment.findById(req.params.id)
    .populate({ path: 'repairRequest', select: 'item', populate: { path: 'item', select: 'title' } });
  if (!appointment) return errorResponse(res, 'Not found.', 404);
  if (!canAccessAppointment(appointment, req.user)) return errorResponse(res, 'Access denied.', 403);

  const itemTitle = appointment.repairRequest?.item?.title || 'Repair appointment';
  const location = [appointment.location?.address, appointment.location?.city].filter(Boolean).join(', ');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FixTogether//Appointments//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:appointment-${appointment._id}@fixtogether`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(appointment.scheduledStart)}`,
    `DTEND:${toIcsUtc(appointment.scheduledEnd)}`,
    `SUMMARY:${escapeIcsText(`${appointment.appointmentType} - ${itemTitle}`)}`,
    `DESCRIPTION:${escapeIcsText('FixTogether repair appointment. Open FixTogether for current details or changes.')}`,
    location ? `LOCATION:${escapeIcsText(location)}` : '',
    `STATUS:${appointment.status === APPOINTMENT_STATUS.CANCELLED ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  res
    .status(200)
    .set('Content-Type', 'text/calendar; charset=utf-8')
    .set('Content-Disposition', `attachment; filename="fixtogether-appointment-${appointment._id}.ics"`)
    .send(`${lines.join('\r\n')}\r\n`);
});

const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { scheduledStart, scheduledEnd, timeZone } = req.body;
  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);
  try {
    assertValidObjectId(req.params.id, 'appointment ID');
    const appointment = await withTransaction(async (session) => {
      const current = await Appointment.findById(req.params.id).session(session);
      if (!current) throw createHttpError(404, 'Not found.');
      if (!canAccessAppointment(current, req.user)) throw createHttpError(403, 'Access denied.');
      if (CLOSED_STATUSES.includes(current.status)) {
        throw createHttpError(409, 'Completed, cancelled, or missed appointments cannot be rescheduled.');
      }
      const profile = await TechnicianProfile.findOne({ user: current.technician }).session(session);
      assertTechnicianAvailable(profile, start, end, timeZone);
      const conflict = await findSchedulingConflict({
        technicianId: current.technician, scheduledStart: start, scheduledEnd: end,
        excludeAppointmentId: current._id, session,
      });
      if (conflict) throw createHttpError(409, 'Time slot conflicts with an existing appointment.');
      profile.scheduleVersion = (profile.scheduleVersion || 0) + 1;
      await profile.save({ session });
      current.scheduledStart = start;
      current.scheduledEnd = end;
      current.timeZone = timeZone;
      current.status = APPOINTMENT_STATUS.RESCHEDULED;
      current.reminderStatus = {
        owner24HourReminded: false,
        technician24HourReminded: false,
        owner1HourReminded: false,
        technician1HourReminded: false,
        noShowProcessed: false,
      };
      await current.save({ session });
      return current;
    });
    const notifyUser = hasId(appointment.owner, req.user.userId) ? appointment.technician : appointment.owner;
    await createNotification({
      userId: notifyUser,
      type: NOTIFICATION_TYPES.APPOINTMENT_CHANGED,
      title: 'Appointment Rescheduled',
      message: 'An appointment has been rescheduled.',
      relatedEntityType: 'Appointment',
      relatedEntityId: appointment._id,
    });
    await createAuditLog({
      actor: req.user.userId, action: 'APPOINTMENT_RESCHEDULED', targetType: 'Appointment', targetId: appointment._id,
      metadata: { scheduledStart: start, scheduledEnd: end },
    }, req);
    return successResponse(res, { appointment }, 'Rescheduled');
  } catch (error) {
    if (error.status) return errorResponse(res, error.message, error.status);
    throw error;
  }
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return errorResponse(res, 'Not found.', 404);
  if (!canAccessAppointment(appointment, req.user)) return errorResponse(res, 'Access denied.', 403);
  if (CLOSED_STATUSES.includes(appointment.status)) return errorResponse(res, 'This appointment is already closed.', 409);
  appointment.status = APPOINTMENT_STATUS.CANCELLED;
  appointment.cancellationReason = req.body.reason;
  await appointment.save();
  const notifyUser = hasId(appointment.owner, req.user.userId) ? appointment.technician : appointment.owner;
  await createNotification({
    userId: notifyUser, type: NOTIFICATION_TYPES.APPOINTMENT_CANCELLED, title: 'Appointment Cancelled',
    message: 'An appointment has been cancelled.', relatedEntityType: 'Appointment', relatedEntityId: appointment._id,
  });
  await createAuditLog({
    actor: req.user.userId, action: 'APPOINTMENT_CANCELLED', targetType: 'Appointment', targetId: appointment._id,
    metadata: { reason: appointment.cancellationReason },
  }, req);
  return successResponse(res, { appointment }, 'Cancelled');
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return errorResponse(res, 'Not found.', 404);
  if (!canAccessAppointment(appointment, req.user)) return errorResponse(res, 'Access denied.', 403);
  if (CLOSED_STATUSES.includes(appointment.status)) return errorResponse(res, 'This appointment is already closed.', 409);
  const { status } = req.body;
  const isOwner = hasId(appointment.owner, req.user.userId);
  if (isOwner && req.user.role !== ROLES.ADMIN && status !== APPOINTMENT_STATUS.CONFIRMED) {
    return errorResponse(res, 'Owners can only confirm an appointment. Use cancellation or dispute workflows for other changes.', 403);
  }
  appointment.status = status;
  if (status === APPOINTMENT_STATUS.IN_PROGRESS) appointment.checkInTime = new Date();
  if (status === APPOINTMENT_STATUS.COMPLETED) appointment.completionTime = new Date();
  await appointment.save();
  const notifyUser = isOwner ? appointment.technician : appointment.owner;
  await createNotification({
    userId: notifyUser, type: NOTIFICATION_TYPES.APPOINTMENT_CHANGED, title: 'Appointment Status Updated',
    message: `The appointment status is now ${status.replace('_', ' ')}.`,
    relatedEntityType: 'Appointment', relatedEntityId: appointment._id,
  });
  return successResponse(res, { appointment }, 'Status updated');
});

module.exports = { createAppointment, getAppointments, getAppointmentById, exportAppointmentCalendar, rescheduleAppointment, cancelAppointment, updateAppointmentStatus };

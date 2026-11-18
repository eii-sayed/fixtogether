const { Appointment } = require('../models');
const { APPOINTMENT_STATUS, NOTIFICATION_TYPES } = require('../constants');
const { createNotification } = require('./notificationService');
const logger = require('../utils/logger');

const REMINDABLE_STATUSES = [
  APPOINTMENT_STATUS.SCHEDULED,
  APPOINTMENT_STATUS.CONFIRMED,
  APPOINTMENT_STATUS.RESCHEDULED,
];
const NO_SHOW_GRACE_MS = 30 * 60 * 1000;
let worker = null;
let running = false;

const formatAppointmentTime = (appointment) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: appointment.timeZone || 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(appointment.scheduledStart);
  } catch {
    return appointment.scheduledStart.toISOString();
  }
};

const sendReminder = async (appointment, userId, flag, leadLabel) => {
  const deduplicationKey = `appointment-reminder:${leadLabel}:${appointment._id}:${userId}`;
  const notification = await createNotification({
    userId,
    type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
    title: `Appointment reminder: ${leadLabel}`,
    message: `You have a ${appointment.appointmentType} appointment on ${formatAppointmentTime(appointment)}.`,
    relatedEntityType: 'Appointment',
    relatedEntityId: appointment._id,
    deduplicationKey,
  });
  if (notification) {
    await Appointment.updateOne({ _id: appointment._id, [`reminderStatus.${flag}`]: { $ne: true } }, { $set: { [`reminderStatus.${flag}`]: true } });
  }
};

const sendWindowReminders = async (now, minimumLeadMs, maximumLeadMs, leadLabel, ownerFlag, technicianFlag) => {
  const appointments = await Appointment.find({
    status: { $in: REMINDABLE_STATUSES },
    scheduledStart: {
      $gt: new Date(now.getTime() + minimumLeadMs),
      $lte: new Date(now.getTime() + maximumLeadMs),
    },
    $or: [
      { [`reminderStatus.${ownerFlag}`]: { $ne: true } },
      { [`reminderStatus.${technicianFlag}`]: { $ne: true } },
    ],
  }).select('_id owner technician appointmentType scheduledStart timeZone reminderStatus');

  for (const appointment of appointments) {
    if (!appointment.reminderStatus?.[ownerFlag]) await sendReminder(appointment, appointment.owner, ownerFlag, leadLabel);
    if (!appointment.reminderStatus?.[technicianFlag]) await sendReminder(appointment, appointment.technician, technicianFlag, leadLabel);
  }
};

const processMissedAppointments = async (now) => {
  const appointments = await Appointment.find({
    scheduledEnd: { $lte: new Date(now.getTime() - NO_SHOW_GRACE_MS) },
    status: { $in: [...REMINDABLE_STATUSES, APPOINTMENT_STATUS.NO_SHOW] },
    'reminderStatus.noShowProcessed': { $ne: true },
  }).select('_id owner technician appointmentType scheduledStart scheduledEnd timeZone status reminderStatus');

  for (const appointment of appointments) {
    if (appointment.status !== APPOINTMENT_STATUS.NO_SHOW) {
      const result = await Appointment.updateOne(
        { _id: appointment._id, status: { $in: REMINDABLE_STATUSES }, 'reminderStatus.noShowProcessed': { $ne: true } },
        { $set: { status: APPOINTMENT_STATUS.NO_SHOW } }
      );
      if (!result.modifiedCount) continue;
    }

    const notificationData = {
      type: NOTIFICATION_TYPES.APPOINTMENT_MISSED,
      title: 'Appointment marked as missed',
      message: `The ${appointment.appointmentType} appointment scheduled for ${formatAppointmentTime(appointment)} was not checked in and is marked as missed.`,
      relatedEntityType: 'Appointment',
      relatedEntityId: appointment._id,
    };
    const [ownerNotice, technicianNotice] = await Promise.all([
      createNotification({ ...notificationData, userId: appointment.owner, deduplicationKey: `appointment-missed:${appointment._id}:${appointment.owner}` }),
      createNotification({ ...notificationData, userId: appointment.technician, deduplicationKey: `appointment-missed:${appointment._id}:${appointment.technician}` }),
    ]);
    if (ownerNotice && technicianNotice) {
      await Appointment.updateOne({ _id: appointment._id }, { $set: { 'reminderStatus.noShowProcessed': true } });
    }
  }
};

const runAppointmentReminderCycle = async () => {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    // Use ranges instead of one narrow moment so a worker restart or a brief
    // hosting pause does not silently skip a reminder.
    await sendWindowReminders(now, 60 * 60 * 1000, 24 * 60 * 60 * 1000, 'within 24 hours', 'owner24HourReminded', 'technician24HourReminded');
    await sendWindowReminders(now, 0, 60 * 60 * 1000, 'in one hour', 'owner1HourReminded', 'technician1HourReminded');
    await processMissedAppointments(now);
  } catch (error) {
    logger.error('Appointment reminder worker failed:', error.message);
  } finally {
    running = false;
  }
};

const startAppointmentReminderWorker = (intervalMs = 5 * 60 * 1000) => {
  if (worker) return;
  runAppointmentReminderCycle();
  worker = setInterval(runAppointmentReminderCycle, intervalMs);
  worker.unref?.();
};

const stopAppointmentReminderWorker = () => {
  if (worker) clearInterval(worker);
  worker = null;
};

module.exports = {
  runAppointmentReminderCycle,
  startAppointmentReminderWorker,
  stopAppointmentReminderWorker,
};

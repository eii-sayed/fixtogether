const mongoose = require('mongoose');
const { APPOINTMENT_STATUS, APPOINTMENT_TYPE } = require('../constants');

const appointmentSchema = new mongoose.Schema(
  {
    repairRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairRequest',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    appointmentType: {
      type: String,
      enum: Object.values(APPOINTMENT_TYPE),
      default: APPOINTMENT_TYPE.INSPECTION,
    },
    scheduledStart: {
      type: Date,
      required: [true, 'Scheduled start time is required'],
    },
    scheduledEnd: {
      type: Date,
      required: [true, 'Scheduled end time is required'],
    },
    location: {
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.SCHEDULED,
    },
    cancellationReason: { type: String, default: '' },
    reminderStatus: {
      ownerReminded: { type: Boolean, default: false },
      technicianReminded: { type: Boolean, default: false },
    },
    checkInTime: { type: Date, default: null },
    completionTime: { type: Date, default: null },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true }
);

appointmentSchema.index({ owner: 1, scheduledStart: 1 });
appointmentSchema.index({ technician: 1, scheduledStart: 1 });
appointmentSchema.index({ repairRequest: 1 });
appointmentSchema.index({ status: 1, scheduledStart: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;

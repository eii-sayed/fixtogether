const mongoose = require('mongoose');
const { REPAIR_JOB_STATUS } = require('../constants');

const repairJobSchema = new mongoose.Schema(
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
    acceptedQuotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      required: true,
    },
    currentStatus: {
      type: String,
      enum: Object.values(REPAIR_JOB_STATUS),
      default: REPAIR_JOB_STATUS.PENDING_INSPECTION,
    },
    inspection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      default: null,
    },
    requiredParts: [
      {
        name: { type: String },
        partNumber: { type: String, default: '' },
        estimatedCost: { type: Number, default: 0 },
        actualCost: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ['needed', 'ordered', 'received', 'installed'],
          default: 'needed',
        },
      },
    ],
    replacedParts: [
      {
        name: { type: String },
        partNumber: { type: String, default: '' },
        cost: { type: Number, default: 0 },
        newOrUsed: { type: String, enum: ['new', 'used', 'refurbished'], default: 'new' },
      },
    ],
    finalLaborCost: { type: Number, default: 0 },
    finalPartsCost: { type: Number, default: 0 },
    finalTotalCost: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'mobile_payment', 'other', ''],
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded', ''],
      default: '',
    },
    completionReport: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    completionImages: [
      {
        url: { type: String },
        publicId: { type: String, default: '' },
        caption: { type: String, default: '' },
      },
    ],
    ownerAcceptedCompletion: { type: Boolean, default: false },
    technicianConfirmedCompletion: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

repairJobSchema.index({ owner: 1, currentStatus: 1 });
repairJobSchema.index({ technician: 1, currentStatus: 1 });
repairJobSchema.index({ repairRequest: 1 });
repairJobSchema.index({ currentStatus: 1, createdAt: -1 });

const RepairJob = mongoose.model('RepairJob', repairJobSchema);

module.exports = RepairJob;

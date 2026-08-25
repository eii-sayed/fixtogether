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
        quantity: { type: Number, default: 1 },
        unitCost: { type: Number, default: 0 },
        estimatedCost: { type: Number, default: 0 },
        actualCost: { type: Number, default: 0 },
        approvedCost: { type: Number, default: 0 },
        supplier: { type: String, default: '' },
        expectedArrival: { type: Date, default: null },
        warranty: { type: String, default: '' },
        installationNote: { type: String, default: '' },
        status: {
          type: String,
          enum: ['needed', 'required', 'searching', 'ordered', 'in_transit', 'received', 'installed', 'returned', 'unavailable'],
          default: 'required',
        },
      },
    ],
    costApprovalRequest: {
      requestedAt: { type: Date, default: null },
      originalTotal: { type: Number, default: 0 },
      revisedTotal: { type: Number, default: 0 },
      additionalLabor: { type: Number, default: 0 },
      additionalParts: { type: Number, default: 0 },
      additionalDays: { type: Number, default: 0 },
      newlyDiscoveredIssue: { type: String, default: '' },
      reason: { type: String, default: '' },
      explanation: { type: String, default: '' },
      images: [
        {
          url: { type: String },
          publicId: { type: String, default: '' },
        },
      ],
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
      },
      decisionAt: { type: Date, default: null },
      ownerNote: { type: String, default: '' },
    },
    qualityChecks: [
      {
        checkId: { type: String },
        title: { type: String },
        category: { type: String, default: 'general' },
        passed: { type: Boolean, default: false },
        notes: { type: String, default: '' },
        checkedAt: { type: Date, default: Date.now },
      },
    ],
    handoverDetails: {
      method: { type: String, enum: ['pickup', 'dropoff', 'delivery', 'onsite', ''], default: '' },
      handedOverAt: { type: Date, default: null },
      notes: { type: String, default: '' },
      code: { type: String, default: '' },
      ownerConfirmedAt: { type: Date, default: null },
    },
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

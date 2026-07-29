const mongoose = require('mongoose');
const { QUOTATION_STATUS } = require('../constants');

const quotationSchema = new mongoose.Schema(
  {
    repairRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairRequest',
      required: true,
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    inspectionFee: { type: Number, default: 0, min: 0 },
    laborCostMinimum: { type: Number, default: 0, min: 0 },
    laborCostMaximum: { type: Number, default: 0, min: 0 },
    partsEstimate: { type: Number, default: 0, min: 0 },
    transportFee: { type: Number, default: 0, min: 0 },
    otherCosts: { type: Number, default: 0, min: 0 },
    estimatedTotalMinimum: { type: Number, default: 0, min: 0 },
    estimatedTotalMaximum: { type: Number, default: 0, min: 0 },
    expectedDuration: {
      value: { type: Number, default: 1 },
      unit: { type: String, enum: ['hours', 'days', 'weeks'], default: 'days' },
    },
    warrantyDays: { type: Number, default: 30, min: 0 },
    quotationType: {
      type: String,
      enum: ['initial', 'revised'],
      default: 'initial',
    },
    conditions: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    technicianNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    expirationDate: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    status: {
      type: String,
      enum: Object.values(QUOTATION_STATUS),
      default: QUOTATION_STATUS.SUBMITTED,
    },
    revisionNumber: { type: Number, default: 1 },
    previousQuotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
    },
    ownerDecisionAt: { type: Date, default: null },
  },
  { timestamps: true }
);

quotationSchema.index({ repairRequest: 1, technician: 1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ technician: 1, createdAt: -1 });

/**
 * Calculate totals before saving
 */
quotationSchema.pre('save', function (next) {
  this.estimatedTotalMinimum =
    this.inspectionFee + this.laborCostMinimum + this.partsEstimate + this.transportFee + this.otherCosts;
  this.estimatedTotalMaximum =
    this.inspectionFee + this.laborCostMaximum + this.partsEstimate + this.transportFee + this.otherCosts;
  next();
});

const Quotation = mongoose.model('Quotation', quotationSchema);

module.exports = Quotation;

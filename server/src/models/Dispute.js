const mongoose = require('mongoose');
const { DISPUTE_STATUS, DISPUTE_CATEGORIES } = require('../constants');

const disputeSchema = new mongoose.Schema(
  {
    repairJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairJob',
      required: true,
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    againstUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(DISPUTE_CATEGORIES),
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Dispute description is required'],
      trim: true,
      maxlength: 5000,
    },
    evidence: [
      {
        url: { type: String },
        publicId: { type: String, default: '' },
        description: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: Object.values(DISPUTE_STATUS),
      default: DISPUTE_STATUS.OPEN,
    },
    assignedAdministrator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    responses: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: { type: String, maxlength: 3000 },
        evidence: [{ url: String, publicId: String }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolution: {
      decision: { type: String, default: '' },
      notes: { type: String, default: '' },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

disputeSchema.index({ repairJob: 1 });
disputeSchema.index({ openedBy: 1 });
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ assignedAdministrator: 1, status: 1 });

const Dispute = mongoose.model('Dispute', disputeSchema);

module.exports = Dispute;

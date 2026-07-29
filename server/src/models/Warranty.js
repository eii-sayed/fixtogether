const mongoose = require('mongoose');
const { WARRANTY_STATUS } = require('../constants');

const warrantySchema = new mongoose.Schema(
  {
    repairJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairJob',
      required: true,
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    coveredProblem: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    conditions: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(WARRANTY_STATUS),
      default: WARRANTY_STATUS.ACTIVE,
    },
    warrantyClaims: [
      {
        description: { type: String, maxlength: 2000 },
        evidence: [{ url: String, publicId: String }],
        status: {
          type: String,
          enum: ['submitted', 'reviewing', 'approved', 'rejected'],
          default: 'submitted',
        },
        resolution: { type: String, default: '' },
        submittedAt: { type: Date, default: Date.now },
        resolvedAt: { type: Date, default: null },
      },
    ],
  },
  { timestamps: true }
);

warrantySchema.index({ repairJob: 1 });
warrantySchema.index({ owner: 1, status: 1 });
warrantySchema.index({ technician: 1 });
warrantySchema.index({ endDate: 1 });

const Warranty = mongoose.model('Warranty', warrantySchema);

module.exports = Warranty;

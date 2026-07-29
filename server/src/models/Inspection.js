const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema(
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
    confirmedProblem: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    diagnosedComponents: [
      {
        name: { type: String },
        issue: { type: String },
        needsReplacement: { type: Boolean, default: false },
      },
    ],
    repairFeasible: {
      type: String,
      enum: ['yes', 'partial', 'no', 'uncertain'],
      default: 'uncertain',
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    requiredParts: [
      {
        name: { type: String },
        partNumber: { type: String, default: '' },
        estimated_cost: { type: Number, default: 0 },
        available: { type: Boolean, default: false },
      },
    ],
    estimatedCompletionDate: { type: Date, default: null },
    revisedQuotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
    },
    technicianNotes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    images: [
      {
        url: { type: String },
        publicId: { type: String, default: '' },
        caption: { type: String, default: '' },
      },
    ],
    ownerApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    ownerApprovalNote: { type: String, default: '' },
    ownerDecisionAt: { type: Date, default: null },
  },
  { timestamps: true }
);

inspectionSchema.index({ repairRequest: 1 });
inspectionSchema.index({ technician: 1 });

const Inspection = mongoose.model('Inspection', inspectionSchema);

module.exports = Inspection;

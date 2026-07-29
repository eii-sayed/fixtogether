const mongoose = require('mongoose');
const { REPAIR_REQUEST_STATUS, SERVICE_METHOD } = require('../constants');

const repairRequestSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    problemDescription: {
      type: String,
      required: [true, 'Problem description is required'],
      trim: true,
      maxlength: 5000,
    },
    issueStartedAt: {
      type: Date,
      default: null,
    },
    eventBeforeIssue: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    previousRepairAttempts: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    budgetMinimum: { type: Number, default: 0, min: 0 },
    budgetMaximum: { type: Number, default: 0, min: 0 },
    preferredServiceMethod: {
      type: String,
      enum: [...Object.values(SERVICE_METHOD), ''],
      default: '',
    },
    availability: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    requestStatus: {
      type: String,
      enum: Object.values(REPAIR_REQUEST_STATUS),
      default: REPAIR_REQUEST_STATUS.DRAFT,
    },
    aiAnalysis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AIAnalysis',
      default: null,
    },
    safetyFlags: [
      {
        type: { type: String },
        severity: { type: String },
        reason: { type: String },
        detectedBy: { type: String, enum: ['rule', 'ai'], default: 'rule' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    clarificationQuestions: [
      {
        question: { type: String },
        source: { type: String, enum: ['ai', 'technician', 'category'], default: 'ai' },
        required: { type: Boolean, default: false },
        answered: { type: Boolean, default: false },
      },
    ],
    clarificationAnswers: [
      {
        questionIndex: { type: Number },
        answer: { type: String },
        answeredAt: { type: Date, default: Date.now },
      },
    ],
    selectedTechnicians: [
      {
        technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['invited', 'accepted', 'declined'],
          default: 'invited',
        },
        invitedAt: { type: Date, default: Date.now },
        respondedAt: { type: Date },
      },
    ],
    selectedQuotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
    },
    duplicateFlags: [
      {
        matchedRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'RepairRequest' },
        similarity: { type: Number },
        checkedAt: { type: Date, default: Date.now },
      },
    ],
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

repairRequestSchema.index({ owner: 1, requestStatus: 1 });
repairRequestSchema.index({ requestStatus: 1, createdAt: -1 });
repairRequestSchema.index({ item: 1 });
repairRequestSchema.index({ publishedAt: -1 });
repairRequestSchema.index({ problemDescription: 'text', eventBeforeIssue: 'text' });

const RepairRequest = mongoose.model('RepairRequest', repairRequestSchema);

module.exports = RepairRequest;

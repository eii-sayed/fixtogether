const mongoose = require('mongoose');
const { RISK_LEVEL } = require('../constants');

const safetyRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    patternType: {
      type: String,
      enum: ['keyword', 'regex'],
      default: 'keyword',
    },
    regexPattern: {
      type: String,
      trim: true,
      default: '',
    },
    keywords: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemCategory',
      },
    ],
    riskType: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: Object.values(RISK_LEVEL),
      default: RISK_LEVEL.HIGH,
    },
    warningMessage: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    technicianWarningMessage: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    blockAIAdvice: {
      type: Boolean,
      default: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    versionHistory: [
      {
        version: { type: Number },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        snapshot: { type: mongoose.Schema.Types.Mixed },
        changeReason: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    testCases: [
      {
        input: { type: String, required: true },
        expectedMatch: { type: Boolean, required: true },
        lastTestedAt: { type: Date },
        passed: { type: Boolean },
      },
    ],
  },
  { timestamps: true }
);

safetyRuleSchema.index({ active: 1 });
safetyRuleSchema.index({ keywords: 1 });
safetyRuleSchema.index({ riskType: 1, severity: 1 });

const SafetyRule = mongoose.model('SafetyRule', safetyRuleSchema);

module.exports = SafetyRule;

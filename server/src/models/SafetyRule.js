const mongoose = require('mongoose');
const { RISK_LEVEL } = require('../constants');

const safetyRuleSchema = new mongoose.Schema(
  {
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
    blockAIAdvice: {
      type: Boolean,
      default: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

safetyRuleSchema.index({ active: 1 });
safetyRuleSchema.index({ keywords: 1 });

const SafetyRule = mongoose.model('SafetyRule', safetyRuleSchema);

module.exports = SafetyRule;

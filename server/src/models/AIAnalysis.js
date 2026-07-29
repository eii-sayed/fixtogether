const mongoose = require('mongoose');
const { SEVERITY } = require('../constants');

const aiAnalysisSchema = new mongoose.Schema(
  {
    repairRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairRequest',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['mock', 'openai'],
    },
    model: {
      type: String,
      default: '',
    },
    promptVersion: {
      type: String,
      default: '1.0',
    },
    itemCategory: { type: String, default: '' },
    itemSubcategory: { type: String, default: '' },
    extractedSymptoms: [
      {
        type: { type: String, default: '' },
        description: { type: String, default: '' },
        severity: {
          type: String,
          enum: Object.values(SEVERITY),
          default: SEVERITY.UNKNOWN,
        },
      },
    ],
    possibleInspectionAreas: [{ type: String }],
    recommendedSkillCategories: [{ type: String }],
    missingInformation: [{ type: String }],
    clarificationQuestions: [{ type: String }],
    safetyFlags: [
      {
        type: { type: String },
        severity: { type: String },
        reason: { type: String },
      },
    ],
    suggestedPathways: [
      {
        pathway: {
          type: String,
          enum: ['repair', 'refurbishment', 'donation', 'parts', 'recycling'],
        },
        reason: { type: String, default: '' },
        requiresHumanVerification: { type: Boolean, default: true },
      },
    ],
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    rawResponseHash: {
      type: String,
      default: '',
      select: false,
    },
    ownerCorrections: {
      categoryChanged: { type: Boolean, default: false },
      symptomsModified: { type: Boolean, default: false },
      correctedCategory: { type: String, default: '' },
      correctedSubcategory: { type: String, default: '' },
      correctedSymptoms: [
        {
          type: { type: String },
          description: { type: String },
          severity: { type: String },
        },
      ],
      correctionNotes: { type: String, default: '' },
      correctedAt: { type: Date },
    },
    technicianCorrections: [
      {
        technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        field: { type: String },
        originalValue: { type: String },
        correctedValue: { type: String },
        note: { type: String },
        correctedAt: { type: Date, default: Date.now },
      },
    ],
    processingTime: {
      type: Number, // milliseconds
      default: 0,
    },
  },
  { timestamps: true }
);

aiAnalysisSchema.index({ repairRequest: 1 });
aiAnalysisSchema.index({ provider: 1, createdAt: -1 });

const AIAnalysis = mongoose.model('AIAnalysis', aiAnalysisSchema);

module.exports = AIAnalysis;

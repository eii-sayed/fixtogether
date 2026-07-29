const mongoose = require('mongoose');

const impactRecordSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    outcome: {
      type: String,
      enum: ['repaired', 'donated', 'parts_reused', 'recycled'],
      required: true,
    },
    estimatedWeight: {
      type: Number, // kg
      default: 0,
    },
    estimatedReplacementCost: {
      type: Number,
      default: 0,
    },
    repairCost: {
      type: Number,
      default: 0,
    },
    estimatedWasteAvoided: {
      type: Number, // kg
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

impactRecordSchema.index({ outcome: 1 });
impactRecordSchema.index({ recordedAt: -1 });
impactRecordSchema.index({ item: 1 });

const ImpactRecord = mongoose.model('ImpactRecord', impactRecordSchema);

module.exports = ImpactRecord;

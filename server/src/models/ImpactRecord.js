const mongoose = require('mongoose');

const impactRecordSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    sourceDonation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonationOffer',
      default: null,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrganizationProfile',
      default: null,
    },
    outcome: {
      type: String,
      enum: ['repaired', 'donated', 'redistributed', 'refurbished', 'parts_reused', 'salvaged_parts', 'recycled', 'responsibly_recycled'],
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    weightMethod: {
      type: String,
      enum: ['measured', 'estimated'],
      default: 'estimated',
    },
    estimatedWeight: {
      type: Number, // kg
      default: 0,
    },
    measuredWeight: {
      type: Number, // kg
      default: 0,
    },
    estimatedReplacementCost: {
      type: Number,
      default: 0,
    },
    replacementValueEstimate: {
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
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    evidence: {
      notes: { type: String, default: '' },
      photos: [{ type: String }],
      certificateUrl: { type: String, default: '' },
    },
    adjustmentHistory: [
      {
        adjustedAt: { type: Date, default: Date.now },
        adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, required: true },
        previousValues: { type: Object },
        newValues: { type: Object },
      },
    ],
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

impactRecordSchema.index({ outcome: 1 });
impactRecordSchema.index({ organization: 1, recordedAt: -1 });
impactRecordSchema.index({ sourceDonation: 1 }, { unique: true, sparse: true });
impactRecordSchema.index({ item: 1 });

const ImpactRecord = mongoose.model('ImpactRecord', impactRecordSchema);

module.exports = ImpactRecord;

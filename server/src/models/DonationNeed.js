const mongoose = require('mongoose');
const { ITEM_CONDITION, COMMUNITY_NEED_STATUS } = require('../constants');

const donationNeedSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrganizationProfile',
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemCategory',
      required: true,
    },
    title: {
      type: String,
      trim: true,
      required: [true, 'Need title is required'],
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: Object.values(COMMUNITY_NEED_STATUS),
      default: COMMUNITY_NEED_STATUS.PUBLISHED,
    },
    minimumCondition: {
      type: String,
      enum: Object.values(ITEM_CONDITION),
      default: ITEM_CONDITION.POOR,
    },
    requiredSpecifications: [{ type: String, trim: true }],
    acceptedAlternatives: [{ type: String, trim: true }],
    rejectedConditions: [{ type: String, enum: Object.values(ITEM_CONDITION) }],
    accessoriesNeeded: [{ type: String, trim: true }],
    beneficiaryContext: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    collectionHub: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    pickupAvailable: {
      type: Boolean,
      default: false,
    },
    serviceArea: {
      type: String,
      default: '',
    },
    targetDate: {
      type: Date,
      default: null,
    },
    // Distinct quantity accounting ledger
    quantityRequested: { type: Number, default: 1, min: 1 },
    quantityOffered: { type: Number, default: 0, min: 0 },
    quantityAccepted: { type: Number, default: 0, min: 0 },
    quantityReceived: { type: Number, default: 0, min: 0 },
    quantityApproved: { type: Number, default: 0, min: 0 },
    quantityDistributed: { type: Number, default: 0, min: 0 },

    // Legacy support alias
    quantityNeeded: { type: Number, default: 1 },

    active: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    draftData: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

donationNeedSchema.index({ organization: 1, status: 1 });
donationNeedSchema.index({ category: 1, status: 1 });
donationNeedSchema.index({ urgency: 1, targetDate: 1 });

const DonationNeed = mongoose.model('DonationNeed', donationNeedSchema);

module.exports = DonationNeed;

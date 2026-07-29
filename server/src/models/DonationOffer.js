const mongoose = require('mongoose');
const { DONATION_STATUS, ITEM_CONDITION } = require('../constants');

const donationOfferSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    itemCondition: {
      type: String,
      enum: Object.values(ITEM_CONDITION),
      default: ITEM_CONDITION.FAIR,
    },
    availableComponents: [{ type: String }],
    missingComponents: [{ type: String }],
    preferredHandover: {
      type: String,
      enum: ['pickup', 'dropoff', 'either'],
      default: 'either',
    },
    pickupLocation: {
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
    matchedOrganizations: [
      {
        organization: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationProfile' },
        matchScore: { type: Number, default: 0 },
        matchedAt: { type: Date, default: Date.now },
      },
    ],
    selectedOrganization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrganizationProfile',
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(DONATION_STATUS),
      default: DONATION_STATUS.DRAFT,
    },
    handoverCode: { type: String, default: '' },
    scheduledDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    ownerConfirmed: { type: Boolean, default: false },
    organizationConfirmed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

donationOfferSchema.index({ owner: 1, status: 1 });
donationOfferSchema.index({ status: 1, createdAt: -1 });
donationOfferSchema.index({ selectedOrganization: 1 });

const DonationOffer = mongoose.model('DonationOffer', donationOfferSchema);

module.exports = DonationOffer;

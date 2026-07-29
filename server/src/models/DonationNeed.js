const mongoose = require('mongoose');
const { ITEM_CONDITION } = require('../constants');

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
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    minimumCondition: {
      type: String,
      enum: Object.values(ITEM_CONDITION),
      default: ITEM_CONDITION.POOR,
    },
    quantityNeeded: { type: Number, default: 1, min: 1 },
    quantityReceived: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    deadline: { type: Date, default: null },
  },
  { timestamps: true }
);

donationNeedSchema.index({ organization: 1, active: 1 });
donationNeedSchema.index({ category: 1, active: 1 });

const DonationNeed = mongoose.model('DonationNeed', donationNeedSchema);

module.exports = DonationNeed;

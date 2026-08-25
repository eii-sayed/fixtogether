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
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemCategory',
    },
    title: {
      type: String,
      trim: true,
      default: '',
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
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    estimatedWeight: {
      type: Number, // kg
      default: 0,
    },
    availableComponents: [{ type: String }],
    missingComponents: [{ type: String }],
    preferredHandover: {
      type: String,
      enum: ['pickup', 'dropoff', 'either'],
      default: 'either',
    },
    pickupLocation: {
      approximateArea: { type: String, default: '' },
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
        explanation: { type: Object, default: {} },
      },
    ],
    selectedOrganization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrganizationProfile',
      default: null,
    },
    matchingNeed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonationNeed',
      default: null,
    },
    safetyFlags: [
      {
        type: { type: String },
        severity: { type: String, default: 'medium' },
        description: { type: String },
        triggeredKeyword: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    dataBearing: {
      isDataBearing: { type: Boolean, default: false },
      donorWarningAcknowledged: { type: Boolean, default: false },
      dataErasureConsent: { type: Boolean, default: false },
      erasureCertificateUrl: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: Object.values(DONATION_STATUS),
      default: DONATION_STATUS.DRAFT,
    },
    decision: {
      decidedAt: { type: Date },
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String, default: '' },
      donorExplanation: { type: String, default: '' },
      internalNote: { type: String, default: '' },
      alternativeGuidance: { type: String, default: '' },
    },
    handover: {
      scheduledDate: { type: Date, default: null },
      timeWindow: { type: String, default: '' },
      method: { type: String, enum: ['pickup', 'dropoff'], default: 'dropoff' },
      hub: { type: mongoose.Schema.Types.ObjectId },
      approximateArea: { type: String, default: '' },
      staffAssigned: { type: String, default: '' },
      instructions: { type: String, default: '' },
      confirmationCode: { type: String, default: '' },
      donorConfirmed: { type: Boolean, default: false },
      orgConfirmed: { type: Boolean, default: false },
      history: [
        {
          action: { type: String },
          scheduledDate: { type: Date },
          timeWindow: { type: String },
          reason: { type: String },
          updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },
    inspection: {
      inspectedAt: { type: Date },
      inspector: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      checklist: {
        itemIdentityVerified: { type: Boolean, default: false },
        quantityVerified: { type: Boolean, default: false },
        physicalCondition: { type: String, default: '' },
        powerStateWorking: { type: Boolean, default: false },
        functionalityTested: { type: Boolean, default: false },
        missingAccessoriesChecked: { type: Boolean, default: false },
        dataComponentsChecked: { type: Boolean, default: false },
        safetyClearance: { type: Boolean, default: true },
        refurbishmentRequired: { type: Boolean, default: false },
        estimatedProcessingHours: { type: Number, default: 0 },
      },
      outcome: { type: String, default: '' },
      publicNotes: { type: String, default: '' },
      internalNotes: { type: String, default: '' },
      adminNotes: { type: String, default: '' },
      evidencePhotos: [
        {
          url: { type: String },
          publicId: { type: String },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
    },
    processing: {
      outcome: { type: String, default: '' },
      processedAt: { type: Date },
      processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      team: { type: String, default: '' },
      finalCondition: { type: String, default: '' },
      details: { type: Object, default: {} },
      recyclingProvider: { type: String, default: '' },
      recyclingCertificate: { type: String, default: '' },
      beneficiaryProgram: { type: String, default: '' },
      impactRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'ImpactRecord' },
    },
    version: {
      type: Number,
      default: 1,
    },
    history: [
      {
        fromStatus: { type: String },
        toStatus: { type: String },
        actingUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        actingRole: { type: String },
        timestamp: { type: Date, default: Date.now },
        publicNote: { type: String, default: '' },
        internalNote: { type: String, default: '' },
        reason: { type: String, default: '' },
      },
    ],
    // Legacy support fields
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
donationOfferSchema.index({ selectedOrganization: 1, status: 1 });
donationOfferSchema.index({ 'handover.scheduledDate': 1 });
donationOfferSchema.index({ category: 1, status: 1 });

const DonationOffer = mongoose.model('DonationOffer', donationOfferSchema);

module.exports = DonationOffer;

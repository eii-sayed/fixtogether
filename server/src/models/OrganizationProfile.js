const mongoose = require('mongoose');
const { ORGANIZATION_TYPES, VERIFICATION_STATUS, HUB_STATUS } = require('../constants');

const collectionHubSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true },
  address: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  operatingHours: { type: String, trim: true, default: 'Mon-Fri 09:00 - 17:00' },
  instructions: { type: String, trim: true, default: '' },
  acceptedCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ItemCategory' }],
  maximumItemSize: { type: String, enum: ['small', 'medium', 'large', 'bulk'], default: 'medium' },
  accessibility: { type: String, default: 'Wheelchair accessible' },
  capacityLimit: { type: Number, default: 50 },
  currentTaskCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: Object.values(HUB_STATUS),
    default: HUB_STATUS.ACTIVE,
  },
  specialHandlingRules: { type: String, default: '' },
  pickupSupported: { type: Boolean, default: false },
  dropoffSupported: { type: Boolean, default: true },
});

const organizationProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    organizationName: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: 200,
    },
    organizationType: {
      type: String,
      enum: Object.values(ORGANIZATION_TYPES),
      required: [true, 'Organization type is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    contactPerson: {
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
    },
    registrationInformation: {
      registrationNumber: { type: String, default: '' },
      registeredAt: { type: String, default: '' },
      website: { type: String, default: '' },
      taxId: { type: String, default: '' },
      authorizedRepresentative: { type: String, default: '' },
    },
    verificationDocuments: [
      {
        type: { type: String, default: '' },
        url: { type: String, default: '' },
        publicId: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.NOT_SUBMITTED,
    },
    verificationNote: { type: String, default: '' },
    address: {
      city: { type: String, default: '' },
      area: { type: String, default: '' },
      fullAddress: { type: String, default: '' },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
    serviceArea: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    maximumServiceDistance: {
      type: Number,
      default: 50,
      min: 1,
    },
    acceptedItemCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemCategory',
      },
    ],
    neededItemCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemCategory',
      },
    ],
    rejectedCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemCategory',
      },
    ],
    pickupAvailable: {
      type: Boolean,
      default: false,
    },
    dropoffAvailable: {
      type: Boolean,
      default: true,
    },
    donationInstructions: {
      type: String,
      trim: true,
      default: '',
    },
    recyclingInstructions: {
      type: String,
      trim: true,
      default: '',
    },
    locations: [collectionHubSchema],
    operatingHours: {
      monday: { start: String, end: String, available: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
      thursday: { start: String, end: String, available: { type: Boolean, default: true } },
      friday: { start: String, end: String, available: { type: Boolean, default: true } },
      saturday: { start: String, end: String, available: { type: Boolean, default: false } },
      sunday: { start: String, end: String, available: { type: Boolean, default: false } },
    },
    dataPolicy: {
      certifiedDataDestruction: { type: Boolean, default: false },
      erasureMethod: { type: String, default: 'NIST 800-88 Compliant' },
      policyDocUrl: { type: String, default: '' },
    },
    recyclingPartners: [
      {
        name: { type: String },
        certificateUrl: { type: String },
        validUntil: { type: Date },
      },
    ],
    activeStatus: {
      type: Boolean,
      default: true,
    },
    impactStats: {
      totalDonationsReceived: { type: Number, default: 0 },
      totalItemsProcessed: { type: Number, default: 0 },
      totalWeightProcessed: { type: Number, default: 0 },
      totalWasteAvoided: { type: Number, default: 0 },
      totalBeneficiariesServed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

organizationProfileSchema.index({ organizationType: 1, verificationStatus: 1 });
organizationProfileSchema.index({ serviceArea: '2dsphere' });
organizationProfileSchema.index({ acceptedItemCategories: 1 });

const OrganizationProfile = mongoose.model('OrganizationProfile', organizationProfileSchema);

module.exports = OrganizationProfile;

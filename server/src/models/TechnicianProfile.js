const mongoose = require('mongoose');
const { VERIFICATION_STATUS, SERVICE_METHOD } = require('../constants');

const technicianProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    biography: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    skills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
      },
    ],
    supportedCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemCategory',
      },
    ],
    yearsOfExperience: {
      type: Number,
      min: 0,
      default: 0,
    },
    serviceMethods: [
      {
        type: String,
        enum: Object.values(SERVICE_METHOD),
      },
    ],
    serviceArea: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    maximumServiceDistance: {
      type: Number,
      default: 25, // km
      min: 1,
      max: 500,
    },
    workingHours: {
      monday: { start: String, end: String, available: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
      thursday: { start: String, end: String, available: { type: Boolean, default: true } },
      friday: { start: String, end: String, available: { type: Boolean, default: true } },
      saturday: { start: String, end: String, available: { type: Boolean, default: false } },
      sunday: { start: String, end: String, available: { type: Boolean, default: false } },
    },
    priceRange: {
      minimum: { type: Number, default: 0 },
      maximum: { type: Number, default: 0 },
      currency: { type: String, default: 'BDT' },
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.NOT_SUBMITTED,
    },
    verificationDocuments: [
      {
        type: { type: String, default: '' },
        url: { type: String, default: '' },
        publicId: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    verificationNote: { type: String, default: '' },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    completedRepairCount: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0, min: 0, max: 100 },
    averageResponseTime: { type: Number, default: 0 }, // in hours
    warrantyOptions: [
      {
        days: { type: Number, default: 30 },
        description: { type: String, default: '' },
      },
    ],
    activeStatus: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

technicianProfileSchema.index({ serviceArea: '2dsphere' });
technicianProfileSchema.index({ skills: 1, activeStatus: 1 });
technicianProfileSchema.index({ verificationStatus: 1 });
technicianProfileSchema.index({ averageRating: -1 });
technicianProfileSchema.index({ supportedCategories: 1 });

const TechnicianProfile = mongoose.model('TechnicianProfile', technicianProfileSchema);

module.exports = TechnicianProfile;

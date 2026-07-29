const mongoose = require('mongoose');
const { PART_STATUS, PART_CONDITION } = require('../constants');

const partSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Part name is required'],
      trim: true,
      maxlength: 200,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemCategory',
      default: null,
    },
    brand: { type: String, trim: true, default: '' },
    modelCompatibility: [{ type: String }],
    partNumber: { type: String, trim: true, default: '' },
    condition: {
      type: String,
      enum: Object.values(PART_CONDITION),
      default: PART_CONDITION.UNTESTED,
    },
    tested: { type: Boolean, default: false },
    testedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sourceItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
    images: [
      {
        url: { type: String },
        publicId: { type: String, default: '' },
      },
    ],
    price: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, default: 1, min: 0 },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    listingStatus: {
      type: String,
      enum: Object.values(PART_STATUS),
      default: PART_STATUS.AVAILABLE,
    },
    safetyRestrictions: {
      restricted: { type: Boolean, default: false },
      reason: { type: String, default: '' },
    },
    reservedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reservedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

partSchema.index({ category: 1, listingStatus: 1 });
partSchema.index({ seller: 1 });
partSchema.index({ name: 'text', brand: 'text', partNumber: 'text' });

const Part = mongoose.model('Part', partSchema);

module.exports = Part;

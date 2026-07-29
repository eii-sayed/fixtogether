const mongoose = require('mongoose');
const { ITEM_CONDITION, ITEM_STATUS, PATHWAYS } = require('../constants');

const itemSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
      maxlength: 200,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemCategory',
      required: [true, 'Category is required'],
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemCategory',
      default: null,
    },
    brand: { type: String, trim: true, default: '' },
    model: { type: String, trim: true, default: '' },
    approximateAge: {
      value: { type: Number, default: 0 },
      unit: { type: String, enum: ['days', 'months', 'years'], default: 'years' },
    },
    condition: {
      type: String,
      enum: Object.values(ITEM_CONDITION),
      default: ITEM_CONDITION.FAIR,
    },
    serialNumberPrivate: {
      type: String,
      trim: true,
      default: '',
      select: false,
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
        caption: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    videos: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
        caption: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    approximateLocation: {
      city: { type: String, default: '' },
      area: { type: String, default: '' },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
    ownershipDeclaration: {
      type: Boolean,
      default: false,
    },
    currentPathway: {
      type: String,
      enum: [...Object.values(PATHWAYS), ''],
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(ITEM_STATUS),
      default: ITEM_STATUS.ACTIVE,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.serialNumberPrivate;
        delete ret.__v;
        return ret;
      },
    },
  }
);

itemSchema.index({ owner: 1, status: 1 });
itemSchema.index({ category: 1 });
itemSchema.index({ 'approximateLocation.coordinates': '2dsphere' });
itemSchema.index({ title: 'text', brand: 'text', model: 'text' });
itemSchema.index({ createdAt: -1 });

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;

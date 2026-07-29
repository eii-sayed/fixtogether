const mongoose = require('mongoose');
const { RISK_LEVEL, PATHWAYS } = require('../constants');

const itemCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemCategory',
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    icon: {
      type: String,
      default: 'package',
    },
    riskLevel: {
      type: String,
      enum: Object.values(RISK_LEVEL),
      default: RISK_LEVEL.LOW,
    },
    active: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    allowedServiceTypes: [
      {
        type: String,
        enum: Object.values(PATHWAYS),
        default: Object.values(PATHWAYS),
      },
    ],
    defaultQuestions: [
      {
        question: { type: String },
        required: { type: Boolean, default: false },
      },
    ],
    prohibitedAIAdvice: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

// itemCategorySchema.index({ slug: 1 }, { unique: true }); // Removed duplicate index
itemCategorySchema.index({ parent: 1 });
itemCategorySchema.index({ active: 1, sortOrder: 1 });

const ItemCategory = mongoose.model('ItemCategory', itemCategorySchema);

module.exports = ItemCategory;

const mongoose = require('mongoose');
const { MODERATION_STATUS } = require('../constants');

const reviewSchema = new mongoose.Schema(
  {
    repairJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairJob',
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    communicationRating: { type: Number, min: 1, max: 5, default: 3 },
    serviceQualityRating: { type: Number, min: 1, max: 5, default: 3 },
    valueRating: { type: Number, min: 1, max: 5, default: 3 },
    reviewText: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    verifiedTransaction: { type: Boolean, default: true },
    moderationStatus: {
      type: String,
      enum: Object.values(MODERATION_STATUS),
      default: MODERATION_STATUS.APPROVED,
    },
    editableUntil: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  { timestamps: true }
);

reviewSchema.index({ repairJob: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ technician: 1, moderationStatus: 1 });
reviewSchema.index({ rating: -1 });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

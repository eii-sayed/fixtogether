const mongoose = require('mongoose');
const { REVIEW_QUEUE_TYPE, REVIEW_QUEUE_STATE, REVIEW_PRIORITY } = require('../constants');

const reviewQueueItemSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: Object.values(REVIEW_QUEUE_TYPE),
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entityModel: {
      type: String,
      required: true,
      enum: ['User', 'TechnicianProfile', 'OrganizationProfile', 'RepairRequest', 'Dispute', 'SafetyRule'],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: Object.values(REVIEW_PRIORITY),
      default: REVIEW_PRIORITY.MEDIUM,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    slaDeadline: {
      type: Date,
      index: true,
    },
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    reviewState: {
      type: String,
      enum: Object.values(REVIEW_QUEUE_STATE),
      default: REVIEW_QUEUE_STATE.PENDING,
      index: true,
    },
    snoozedUntil: {
      type: Date,
      default: null,
    },
    lock: {
      lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      lockedAt: {
        type: Date,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
    },
    internalNotes: [
      {
        admin: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        note: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

reviewQueueItemSchema.index({ reviewState: 1, priority: 1, submittedAt: 1 });
reviewQueueItemSchema.index({ entityType: 1, entityId: 1 }, { unique: true });

const ReviewQueueItem = mongoose.model('ReviewQueueItem', reviewQueueItemSchema);

module.exports = ReviewQueueItem;

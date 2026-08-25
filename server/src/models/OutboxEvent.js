const mongoose = require('mongoose');

const outboxEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 5,
    },
    errorSummary: {
      type: String,
      default: '',
    },
    deduplicationKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    correlationId: {
      type: String,
      default: '',
      index: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

outboxEventSchema.index({ status: 1, createdAt: 1 });

const OutboxEvent = mongoose.model('OutboxEvent', outboxEventSchema);

module.exports = OutboxEvent;

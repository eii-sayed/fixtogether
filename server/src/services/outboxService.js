const { OutboxEvent, Notification } = require('../models');
const logger = require('../utils/logger');

let isProcessing = false;
let outboxInterval = null;

/**
 * Record an outbox event atomically within business workflows
 * @param {Object} params
 * @param {string} params.eventType - Canonical event type name
 * @param {string} params.entityType - Entity model name
 * @param {ObjectId|string} params.entityId - Entity ID
 * @param {ObjectId|string} [params.actor] - Acting user ID
 * @param {Object} [params.payload] - Safe event payload
 * @param {string} [params.deduplicationKey] - Deterministic deduplication key
 * @param {string} [params.correlationId] - Request correlation ID
 * @returns {Promise<Object>} Created outbox event document
 */
const createOutboxEvent = async ({
  eventType,
  entityType,
  entityId,
  actor = null,
  payload = {},
  deduplicationKey = null,
  correlationId = '',
}) => {
  try {
    const event = await OutboxEvent.create({
      eventType,
      entityType,
      entityId,
      actor,
      payload,
      deduplicationKey: deduplicationKey || `${eventType}:${entityId}:${Date.now()}`,
      correlationId,
      status: 'queued',
    });
    return event;
  } catch (error) {
    if (error.code === 11000) {
      logger.info(`Outbox duplicate event suppressed: ${deduplicationKey}`);
      return null;
    }
    logger.error('Failed to create outbox event:', error.message);
    throw error;
  }
};

/**
 * Process queued outbox events
 * Dispatches Socket.IO events and performs notification delivery
 */
const processOutboxEvents = async (batchSize = 25) => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const events = await OutboxEvent.find({
      status: { $in: ['queued', 'failed'] },
      retryCount: { $lt: 5 },
    })
      .sort({ createdAt: 1 })
      .limit(batchSize);

    for (const event of events) {
      try {
        event.status = 'processing';
        await event.save();

        // 1. Emit Socket.IO event if socket server is initialized
        const io = global.io;
        if (io) {
          // Emit to entity room or global authenticated channel
          const room = `${event.entityType.toLowerCase()}:${event.entityId}`;
          io.to(room).emit(event.eventType, {
            entityType: event.entityType,
            entityId: event.entityId,
            payload: event.payload,
            timestamp: new Date(),
          });
        }

        // 2. Mark event completed
        event.status = 'completed';
        event.processedAt = new Date();
        await event.save();
      } catch (err) {
        event.retryCount += 1;
        event.status = event.retryCount >= event.maxRetries ? 'failed' : 'queued';
        event.errorSummary = err.message;
        await event.save();
        logger.warn(`Outbox event processing failed [${event._id}]: ${err.message}`);
      }
    }
  } catch (error) {
    logger.error('Outbox batch processing error:', error.message);
  } finally {
    isProcessing = false;
  }
};

/**
 * Start the background outbox worker
 */
const startOutboxWorker = (intervalMs = 5000) => {
  if (outboxInterval) clearInterval(outboxInterval);
  outboxInterval = setInterval(() => {
    processOutboxEvents().catch((err) => logger.error('Outbox worker error:', err.message));
  }, intervalMs);
};

/**
 * Stop the background outbox worker
 */
const stopOutboxWorker = () => {
  if (outboxInterval) {
    clearInterval(outboxInterval);
    outboxInterval = null;
  }
};

module.exports = {
  createOutboxEvent,
  processOutboxEvents,
  startOutboxWorker,
  stopOutboxWorker,
};

const { Notification } = require('../models');
const logger = require('../utils/logger');

// Socket.IO instance reference (set during server startup)
let io = null;

/**
 * Set the Socket.IO instance
 * @param {Object} socketIO - Socket.IO server instance
 */
const setSocketIO = (socketIO) => {
  io = socketIO;
};

/**
 * Create and send a persistent notification with deduplication
 * @param {Object} params
 * @param {string} params.userId - Recipient user ID
 * @param {string} params.type - Notification type from constants
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} [params.relatedEntityType] - Type of related entity
 * @param {string} [params.relatedEntityId] - ID of related entity
 * @param {string} [params.link] - Deep link URL
 * @param {string} [params.deduplicationKey] - Deterministic deduplication key
 */
const createNotification = async ({
  userId,
  type,
  title,
  message,
  relatedEntityType = '',
  relatedEntityId = null,
  link = '',
  deduplicationKey = null,
}) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      link,
      deduplicationKey: deduplicationKey || `${type}:${relatedEntityId || 'global'}:${userId}:${Date.now()}`,
    });

    // Send real-time notification via Socket.IO if available
    if (io) {
      io.to(`user:${userId}`).emit('notification', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedEntityType: notification.relatedEntityType,
        relatedEntityId: notification.relatedEntityId,
        link: notification.link,
        read: false,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate notification suppressed
      return Notification.findOne({ deduplicationKey });
    }
    logger.error('Failed to create notification:', error.message);
  }
};

/**
 * Create notifications for multiple users
 * @param {Array<string>} userIds
 * @param {Object} notificationData
 */
const createBulkNotifications = async (userIds, notificationData) => {
  const notifications = userIds.map((userId) => ({
    user: userId,
    ...notificationData,
    deduplicationKey: `${notificationData.type}:${notificationData.relatedEntityId || 'global'}:${userId}:${Date.now()}`,
  }));

  try {
    const created = await Notification.insertMany(notifications, { ordered: false });

    // Send real-time notifications
    if (io) {
      for (const notification of created) {
        io.to(`user:${notification.user}`).emit('notification', {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          read: false,
          createdAt: notification.createdAt,
        });
      }
    }

    return created;
  } catch (error) {
    logger.error('Failed to create bulk notifications:', error.message);
  }
};

/**
 * Get unread notification count for a user
 * @param {string} userId
 */
const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ user: userId, read: false });
};

/**
 * Mark notification as read
 * @param {string} notificationId
 * @param {string} userId
 */
const markAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId
 */
const markAllAsRead = async (userId) => {
  return Notification.updateMany(
    { user: userId, read: false },
    { read: true }
  );
};

module.exports = {
  setSocketIO,
  getIO: () => io,
  createNotification,
  createBulkNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};

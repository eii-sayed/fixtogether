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
 * Resolve an appropriate route link based on notification metadata
 */
const resolveNotificationLink = (type, relatedEntityType, relatedEntityId) => {
  if (relatedEntityType === 'RepairRequest' && relatedEntityId) {
    return `/repair-requests/${relatedEntityId}`;
  }
  if (relatedEntityType === 'RepairJob') {
    return '/repair-jobs';
  }
  if (relatedEntityType === 'Thread' && relatedEntityId) {
    return `/forum/${relatedEntityId}`;
  }
  if (relatedEntityType === 'Appointment') {
    return '/repair-jobs';
  }
  if (relatedEntityType === 'Dispute') {
    return '/repair-jobs';
  }
  if (['DonationOffer', 'CommunityNeed', 'DonationItem'].includes(relatedEntityType)) {
    return '/donations';
  }
  if (relatedEntityType === 'User' && relatedEntityId) {
    return `/users/${relatedEntityId}`;
  }
  if (relatedEntityType === 'Technician' && relatedEntityId) {
    return `/technicians/${relatedEntityId}`;
  }

  if (type) {
    if (
      type.startsWith('repair_') ||
      type.startsWith('quotation_') ||
      type === 'owner_approval_required' ||
      type === 'part_required' ||
      type === 'technician_match'
    ) {
      return relatedEntityId ? `/repair-requests/${relatedEntityId}` : '/repair-requests';
    }
    if (type.startsWith('donation_') || type.startsWith('impact_')) {
      return '/donations';
    }
    if (type.startsWith('forum_')) {
      return relatedEntityId ? `/forum/${relatedEntityId}` : '/forum';
    }
    if (type.startsWith('account_')) {
      return '/profile';
    }
    if (type.startsWith('dispute_') || type.startsWith('warranty_')) {
      return '/repair-jobs';
    }
    if (type === 'new_message') {
      return relatedEntityId ? `/repair-requests/${relatedEntityId}` : '/messages';
    }
    if (type === 'review_received') {
      return '/profile';
    }
  }

  return '/notifications';
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
    const finalLink = link || resolveNotificationLink(type, relatedEntityType, relatedEntityId);

    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      link: finalLink,
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
  const finalLink =
    notificationData.link ||
    resolveNotificationLink(
      notificationData.type,
      notificationData.relatedEntityType,
      notificationData.relatedEntityId
    );

  const notifications = userIds.map((userId) => ({
    user: userId,
    ...notificationData,
    link: finalLink,
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
          relatedEntityType: notification.relatedEntityType,
          relatedEntityId: notification.relatedEntityId,
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
  resolveNotificationLink,
  createNotification,
  createBulkNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};

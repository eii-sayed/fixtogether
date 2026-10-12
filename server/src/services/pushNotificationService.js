const webpush = require('web-push');
const config = require('../config');
const logger = require('../utils/logger');
const { PushSubscription } = require('../models');

let isConfigured = false;

try {
  if (config.push?.publicKey && config.push?.privateKey) {
    webpush.setVapidDetails(
      config.push.subject || 'mailto:support@fixtogether.com',
      config.push.publicKey,
      config.push.privateKey
    );
    isConfigured = true;
    logger.info('Web Push VAPID initialized successfully');
  } else {
    logger.warn('Web Push VAPID keys missing. Web push will run in mock mode.');
  }
} catch (err) {
  logger.error('Failed to configure Web Push VAPID:', err.message);
}

/**
 * Get the public VAPID key for client subscriptions
 */
const getVapidPublicKey = () => {
  return config.push?.publicKey || '';
};

/**
 * Send a Web Push notification to all active devices of a user
 * @param {string} userId - Recipient User ID
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message body
 * @param {string} [options.url] - Deep link URL on click
 * @param {string} [options.tag] - Notification grouping tag
 * @param {Object} [options.data] - Custom payload data
 */
const sendPushNotification = async (userId, options = {}) => {
  if (!isConfigured) return;

  try {
    const subscriptions = await PushSubscription.find({ user: userId });
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      title: options.title || 'FixTogether',
      body: options.message || options.body || '',
      icon: options.icon || '/pwa-192x192.png',
      badge: options.badge || '/favicon.ico',
      url: options.url || options.link || '/',
      tag: options.tag || 'fixtogether-alert',
      data: {
        url: options.url || options.link || '/',
        ...(options.data || {}),
      },
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSub, payload);
      } catch (err) {
        // HTTP 404 Not Found or 410 Gone indicates the browser unregistered/expired the subscription
        if (err.statusCode === 404 || err.statusCode === 410) {
          logger.info(`Purging expired Web Push subscription: ${sub._id}`);
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          logger.warn(`Failed to deliver push notification to device: ${err.message}`);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    logger.error(`Error sending Web Push notification to user ${userId}:`, error.message);
  }
};

module.exports = {
  getVapidPublicKey,
  sendPushNotification,
};

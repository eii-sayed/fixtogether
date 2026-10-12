const { PushSubscription } = require('../models');
const pushNotificationService = require('../services/pushNotificationService');
const { asyncHandler, successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * GET /push/vapid-public-key
 * Returns the public VAPID key needed for client browser push subscriptions
 */
const getPublicKey = asyncHandler(async (req, res) => {
  const publicKey = pushNotificationService.getVapidPublicKey();
  return successResponse(res, { publicKey }, 'VAPID public key retrieved');
});

/**
 * POST /push/subscribe
 * Registers or updates a browser Web Push subscription for the current user
 */
const subscribe = asyncHandler(async (req, res) => {
  const { subscription } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return errorResponse(res, 'Valid push subscription object with endpoint and keys is required.', 400);
  }

  const userAgent = req.headers['user-agent'] || '';

  // Upsert subscription
  const savedSubscription = await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      user: req.user.userId,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      userAgent,
    },
    { upsert: true, new: true }
  );

  logger.info(`Web Push subscription registered for user ${req.user.userId}`);
  return successResponse(res, savedSubscription, 'Web push subscription saved successfully', 201);
});

/**
 * POST /push/unsubscribe
 * Removes a browser Web Push subscription
 */
const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;

  if (!endpoint) {
    return errorResponse(res, 'Endpoint is required to unsubscribe.', 400);
  }

  await PushSubscription.deleteOne({
    endpoint,
    user: req.user.userId,
  });

  return successResponse(res, null, 'Unsubscribed from web push notifications');
});

/**
 * POST /push/test
 * Sends a test push notification to verify the user's browser push reception
 */
const testNotification = asyncHandler(async (req, res) => {
  await pushNotificationService.sendPushNotification(req.user.userId, {
    title: 'FixTogether Alert',
    message: 'Background Web Push is active! You will receive live updates even when FixTogether is closed.',
    url: '/notifications',
    tag: 'test-notification',
  });

  return successResponse(res, null, 'Test push notification dispatched');
});

module.exports = {
  getPublicKey,
  subscribe,
  unsubscribe,
  testNotification,
};

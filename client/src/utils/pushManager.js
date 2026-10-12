import api from '../api/axios';

/**
 * Utility to convert base64 url-safe string to Uint8Array for VAPID applicationServerKey
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the browser supports Service Workers, PushManager, and Notifications
 */
export const isPushSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

/**
 * Register the Service Worker
 */
export const registerServiceWorker = async () => {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
};

/**
 * Check current push subscription status
 */
export const getPushSubscription = async () => {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  if (!registration) return null;

  return registration.pushManager.getSubscription();
};

/**
 * Subscribe user to background Web Push
 */
export const subscribeToWebPush = async () => {
  if (!isPushSupported()) {
    throw new Error('Web Push notifications are not supported by this browser.');
  }

  // Request browser permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied. Please allow notifications in browser settings.');
  }

  // Register service worker if not ready
  const registration = await navigator.serviceWorker.ready;

  // Retrieve public VAPID key from backend
  const { data } = await api.get('/push/vapid-public-key');
  const publicKey = data?.data?.publicKey;

  if (!publicKey) {
    throw new Error('VAPID public key not found on server.');
  }

  const convertedVapidKey = urlBase64ToUint8Array(publicKey);

  // Subscribe in browser
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey,
  });

  // Save subscription to backend database
  await api.post('/push/subscribe', {
    subscription: subscription.toJSON(),
  });

  return subscription;
};

/**
 * Unsubscribe user from Web Push
 */
export const unsubscribeFromWebPush = async () => {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    // Notify server to remove endpoint
    try {
      await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
    } catch {
      // Continue even if server unregistration fails
    }
    // Unsubscribe locally in browser
    await subscription.unsubscribe();
  }
};

/**
 * Send a test push notification to verify setup
 */
export const sendTestPushNotification = async () => {
  return api.post('/push/test');
};

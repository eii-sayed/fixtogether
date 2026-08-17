const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadSingleImage } = require('../middleware/upload');
const {
  updateUserProfileSchema,
  updatePrivacySchema,
  updateNotificationPreferencesSchema,
} = require('../validators/profileValidators');
const { changePasswordSchema } = require('../validators/authValidators');

// Authenticated user profile routes
router.get('/me', authenticate, userController.getMyProfile);
router.patch(
  '/me',
  authenticate,
  uploadSingleImage,
  validate(updateUserProfileSchema),
  userController.updateMyProfile
);

// Avatar management
router.post('/me/avatar', authenticate, uploadSingleImage, userController.uploadAvatar);
router.delete('/me/avatar', authenticate, userController.deleteAvatar);

// Settings
router.patch(
  '/me/privacy',
  authenticate,
  validate(updatePrivacySchema),
  userController.updatePrivacySettings
);
router.patch(
  '/me/notifications',
  authenticate,
  validate(updateNotificationPreferencesSchema),
  userController.updateNotificationPreferences
);
router.patch(
  '/me/password',
  authenticate,
  validate(changePasswordSchema),
  userController.changePassword
);

// Statistics and activity streams
router.get('/me/stats', authenticate, userController.getMyStats);
router.get('/me/activity', authenticate, userController.getMyActivity);

module.exports = router;

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { uploadSingleImage } = require('../middleware/upload');
const { ROLES } = require('../constants');

router.get('/me', authenticate, userController.getMyProfile);
router.patch('/me', authenticate, uploadSingleImage, userController.updateMyProfile);
router.patch('/me/password', authenticate, userController.changePassword);

module.exports = router;

const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { authenticate } = require('../middleware/auth');

router.get('/vapid-public-key', pushController.getPublicKey);
router.post('/subscribe', authenticate, pushController.subscribe);
router.post('/unsubscribe', authenticate, pushController.unsubscribe);
router.post('/test', authenticate, pushController.testNotification);

module.exports = router;

const express = require('express');
const router = express.Router();
const { handleAIChat } = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');
const { aiLimiter } = require('../middleware/rateLimiter');

// Require authentication and optional image upload for AI assistant chat
router.post('/chat', authenticate, aiLimiter, uploadSingleImage, handleAIChat);

module.exports = router;

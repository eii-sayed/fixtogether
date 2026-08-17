const express = require('express');
const router = express.Router();
const { handleAIChat } = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');

// Require authentication and optional image upload for AI assistant chat
router.post('/chat', authenticate, uploadSingleImage, handleAIChat);

module.exports = router;

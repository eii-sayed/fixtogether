const express = require('express');
const router = express.Router();
const { handleAIChat } = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');

// Require authentication for AI assistant chat
router.post('/chat', authenticate, handleAIChat);

module.exports = router;

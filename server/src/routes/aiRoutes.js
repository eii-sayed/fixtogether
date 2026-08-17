const express = require('express');
const router = express.Router();
const { handleAIChat } = require('../controllers/aiController');

// Public / Authenticated conversational assistant
router.post('/chat', handleAIChat);

module.exports = router;

const { chatWithAI } = require('../services/ai');
const logger = require('../utils/logger');

/**
 * POST /api/v1/ai/chat
 * Conversational AI Assistant endpoint
 */
const handleAIChat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
    }

    const response = await chatWithAI({
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error('AI chat endpoint error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI chat request',
    });
  }
};

module.exports = {
  handleAIChat,
};

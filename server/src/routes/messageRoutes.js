const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { sendMessageSchema, getMessagesQuerySchema } = require('../validators/messageValidators');

// All routes require authentication
router.use(authenticate);

// Unread count (must be before :repairRequestId to avoid conflict)
router.get('/unread-count', messageController.getUnreadCount);

// Conversations list
router.get('/conversations', messageController.getConversations);

// Messages for a specific repair request
router.get('/:repairRequestId', validate(getMessagesQuerySchema, 'query'), messageController.getMessages);

// Send a message
router.post('/:repairRequestId', validate(sendMessageSchema), messageController.sendMessage);

// Mark messages as read
router.patch('/:repairRequestId/read', messageController.markAsRead);

module.exports = router;

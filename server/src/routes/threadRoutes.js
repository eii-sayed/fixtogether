const express = require('express');
const router = express.Router();
const threadController = require('../controllers/threadController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Community Stats
router.get('/stats', threadController.getCommunityStats);

// Thread CRUD & Voting
router.get('/', optionalAuth, threadController.getThreads);
router.post('/', authenticate, threadController.createThread);
router.get('/:id', optionalAuth, threadController.getThreadById);
router.patch('/:id', authenticate, threadController.updateThread);
router.delete('/:id', authenticate, threadController.deleteThread);
router.post('/:id/vote', authenticate, threadController.voteThread);

// Thread Comments & Facebook-style Replies
router.get('/:id/comments', optionalAuth, threadController.getThreadComments);
router.post('/:id/comments', authenticate, threadController.createComment);
router.post('/:id/comments/:commentId/vote', authenticate, threadController.voteComment);
router.post('/:id/comments/:commentId/solve', authenticate, threadController.markAcceptedSolution);
router.delete('/:id/comments/:commentId', authenticate, threadController.deleteComment);

module.exports = router;

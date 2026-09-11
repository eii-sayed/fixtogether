const express = require('express');
const controller = require('../controllers/forumController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { uploadMultipleImages } = require('../middleware/upload');
const { publishLimiter, writeLimiter } = require('../middleware/rateLimiter');
const { threadBody, replyBody, reportBody, reviewBody, forumIdParams } = require('../validators/forumValidators');
const { ROLES } = require('../constants');

const router = express.Router();
const ids = validate(forumIdParams, 'params');
const threadUpload = uploadMultipleImages('images', 8);
const replyUpload = uploadMultipleImages('images', 8);

router.get('/threads', authenticate, controller.listThreads);
router.get('/threads/:id', authenticate, ids, controller.getThread);
router.post('/threads', authenticate, publishLimiter, threadUpload, validate(threadBody), controller.createThread);
router.put('/threads/:id', authenticate, ids, threadUpload, validate(threadBody), controller.updateThread);
router.delete('/threads/:id', authenticate, ids, controller.deleteThread);
router.get('/bookmarks', authenticate, controller.listBookmarks);

router.post('/threads/:id/replies', authenticate, ids, writeLimiter, replyUpload, validate(replyBody), controller.createReply);
router.put('/replies/:id', authenticate, ids, replyUpload, validate(replyBody), controller.updateReply);
router.delete('/replies/:id', authenticate, ids, controller.deleteReply);
router.post('/threads/:id/like', authenticate, ids, controller.toggleThreadLike);
router.post('/replies/:id/like', authenticate, ids, controller.toggleReplyLike);
router.post('/threads/:id/bookmark', authenticate, ids, controller.toggleThreadBookmark);
router.post('/replies/:id/accept', authenticate, ids, controller.acceptReply);
router.post('/report', authenticate, writeLimiter, validate(reportBody), controller.reportContent);

router.get('/reports', authenticate, authorize(ROLES.ADMIN), controller.listReports);
router.post('/threads/:id/lock', authenticate, authorize(ROLES.ADMIN), ids, controller.lockThread);
router.post('/reports/:id/review', authenticate, authorize(ROLES.ADMIN), ids, validate(reviewBody), controller.reviewReport);

module.exports = router;
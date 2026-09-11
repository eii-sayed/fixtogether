const { ForumThread, ForumReply, ForumBookmark, ForumLike, ForumReport } = require('../models');
const { createNotification, getIO } = require('./notificationService');
const { AppError } = require('../middleware/errorHandler');
const { NOTIFICATION_TYPES } = require('../constants');

const userProjection = 'fullName role profileImage';

const getThreadOrThrow = async (threadId) => {
  const thread = await ForumThread.findById(threadId);
  if (!thread) throw new AppError('Forum thread not found.', 404, 'THREAD_NOT_FOUND');
  return thread;
};

const assertCanWrite = (thread, userId) => {
  if (thread.isLocked) throw new AppError('This thread is locked.', 423, 'THREAD_LOCKED');
  if (thread.status === 'Closed') throw new AppError('This thread is closed.', 409, 'THREAD_CLOSED');
  return thread.author.toString() === userId.toString();
};

const notifyThreadFollowers = async (threadId, exceptUserId, notification) => {
  const bookmarks = await ForumBookmark.find({ thread: threadId, user: { $ne: exceptUserId } }).select('user').lean();
  await Promise.all(bookmarks.map(({ user }) => createNotification({ userId: user, ...notification })));
};

const toggleLike = async ({ targetType, targetId, userId }) => {
  const Model = targetType === 'thread' ? ForumThread : ForumReply;
  const target = await Model.findById(targetId);
  if (!target) throw new AppError(`${targetType} not found.`, 404, 'TARGET_NOT_FOUND');
  const existing = await ForumLike.findOne({ targetType, targetId, user: userId });
  if (existing) {
    await existing.deleteOne();
    target.likesCount = Math.max(0, target.likesCount - 1);
  } else {
    await ForumLike.create({ targetType, targetId, user: userId });
    target.likesCount += 1;
  }
  await target.save();
  return { liked: !existing, likesCount: target.likesCount };
};

const toggleBookmark = async (threadId, userId) => {
  const thread = await getThreadOrThrow(threadId);
  const existing = await ForumBookmark.findOne({ thread: threadId, user: userId });
  if (existing) {
    await existing.deleteOne();
    thread.bookmarkCount = Math.max(0, thread.bookmarkCount - 1);
  } else {
    await ForumBookmark.create({ thread: threadId, user: userId });
    thread.bookmarkCount += 1;
  }
  await thread.save();
  return { bookmarked: !existing, bookmarkCount: thread.bookmarkCount };
};

const notifyReply = async (thread, reply, actorId) => {
  const io = getIO();
  if (io) io.to(`forum:${thread._id}`).emit('forum:reply', { threadId: thread._id, reply });
  if (thread.author.toString() !== actorId.toString()) {
    await createNotification({
      userId: thread.author,
      type: NOTIFICATION_TYPES.FORUM_REPLY,
      title: 'New forum reply',
      message: `${reply.author.fullName || 'Someone'} replied to your thread.`,
      relatedEntityType: 'ForumThread',
      relatedEntityId: thread._id,
      link: `/forum/threads/${thread._id}`,
    });
  }
  await notifyThreadFollowers(thread._id, actorId, {
    type: NOTIFICATION_TYPES.FORUM_REPLY,
    title: 'Thread followed',
    message: `A new reply was posted in "${thread.title}".`,
    relatedEntityType: 'ForumThread',
    relatedEntityId: thread._id,
    link: `/forum/threads/${thread._id}`,
  });
};

module.exports = {
  userProjection,
  getThreadOrThrow,
  assertCanWrite,
  toggleLike,
  toggleBookmark,
  notifyReply,
  notifyThreadFollowers,
  ForumReport,
};
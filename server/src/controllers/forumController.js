const { ForumThread, ForumReply, ForumBookmark, ForumLike, ForumReport, User } = require('../models');
const { uploadMultiple } = require('../services/uploadService');
const { createNotification } = require('../services/notificationService');
const { NOTIFICATION_TYPES } = require('../constants');
const { AppError } = require('../middleware/errorHandler');
const { userProjection, getThreadOrThrow, assertCanWrite, toggleLike, toggleBookmark, notifyReply, notifyThreadFollowers } = require('../services/forumService');

const filesToImages = async (files) => (await uploadMultiple(files, { folder: 'fixtogether/forum' })).map(({ url, publicId }) => ({ url, publicId }));
const parseArray = (value) => (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',').map((item) => item.trim()).filter(Boolean) : []);
const populateAuthor = { path: 'author', select: userProjection };

const listThreads = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, search, category, itemType, status, sort = 'recent', unanswered } = req.query;
    const filter = {};
    if (search) filter.$text = { $search: search };
    if (category) filter.category = category;
    if (itemType) filter.itemType = itemType;
    if (status) filter.status = status;
    if (unanswered === 'true') filter.replyCount = 0;
    if (req.query.mine === 'true') filter.author = req.user.userId;
    const sortMap = { recent: { createdAt: -1 }, viewed: { views: -1, createdAt: -1 }, liked: { likesCount: -1, createdAt: -1 } };
    const pageNumber = Math.max(1, Number(page));
    const pageSize = Math.min(50, Math.max(1, Number(limit)));
    const [threads, total] = await Promise.all([
      ForumThread.find(filter).sort(sortMap[sort] || sortMap.recent).skip((pageNumber - 1) * pageSize).limit(pageSize).populate(populateAuthor).lean(),
      ForumThread.countDocuments(filter),
    ]);
    res.json({ success: true, data: { threads, pagination: { page: pageNumber, limit: pageSize, total, pages: Math.ceil(total / pageSize) } } });
  } catch (error) { next(error); }
};

const createThread = async (req, res, next) => {
  try {
    const images = await filesToImages(req.files);
    const thread = await ForumThread.create({ ...req.body, tags: parseArray(req.body.tags), images, author: req.user.userId });
    await thread.populate(populateAuthor);
    res.status(201).json({ success: true, data: { thread } });
  } catch (error) { next(error); }
};

const getThread = async (req, res, next) => {
  try {
    const thread = await ForumThread.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true }).populate(populateAuthor).lean();
    if (!thread) throw new AppError('Forum thread not found.', 404, 'THREAD_NOT_FOUND');
    const replies = await ForumReply.find({ thread: thread._id }).sort({ isAcceptedAnswer: -1, createdAt: 1 }).populate(populateAuthor).lean();
    const [liked, bookmarked] = req.user ? await Promise.all([
      ForumLike.exists({ targetType: 'thread', targetId: thread._id, user: req.user.userId }),
      ForumBookmark.exists({ thread: thread._id, user: req.user.userId }),
    ]) : [false, false];
    res.json({ success: true, data: { thread, replies, viewer: { liked: !!liked, bookmarked: !!bookmarked } } });
  } catch (error) { next(error); }
};

const updateThread = async (req, res, next) => {
  try {
    const thread = await getThreadOrThrow(req.params.id);
    if (thread.author.toString() !== req.user.userId.toString() && req.user.role !== 'admin') throw new AppError('Only the thread owner or an administrator can edit this thread.', 403, 'PERMISSION_DENIED');
    Object.assign(thread, req.body, { tags: parseArray(req.body.tags) });
    if (req.files?.length) thread.images = await filesToImages(req.files);
    await thread.save();
    res.json({ success: true, data: { thread } });
  } catch (error) { next(error); }
};

const deleteThread = async (req, res, next) => {
  try {
    const thread = await getThreadOrThrow(req.params.id);
    if (thread.author.toString() !== req.user.userId.toString() && req.user.role !== 'admin') throw new AppError('Only the thread owner or an administrator can delete this thread.', 403, 'PERMISSION_DENIED');
    await Promise.all([ForumReply.deleteMany({ thread: thread._id }), ForumBookmark.deleteMany({ thread: thread._id }), ForumLike.deleteMany({ targetType: 'thread', targetId: thread._id }), thread.deleteOne()]);
    res.json({ success: true, message: 'Thread deleted.' });
  } catch (error) { next(error); }
};

const createReply = async (req, res, next) => {
  try {
    const thread = await getThreadOrThrow(req.params.id);
    assertCanWrite(thread, req.user.userId);
    const reply = await ForumReply.create({ ...req.body, links: parseArray(req.body.links), images: await filesToImages(req.files), thread: thread._id, author: req.user.userId });
    await ForumThread.findByIdAndUpdate(thread._id, { $inc: { replyCount: 1 } });
    await reply.populate(populateAuthor);
    await notifyReply(thread, reply, req.user.userId);
    res.status(201).json({ success: true, data: { reply } });
  } catch (error) { next(error); }
};

const updateReply = async (req, res, next) => {
  try {
    const reply = await ForumReply.findById(req.params.id);
    if (!reply) throw new AppError('Forum reply not found.', 404, 'REPLY_NOT_FOUND');
    if (reply.author.toString() !== req.user.userId.toString() && req.user.role !== 'admin') throw new AppError('Only the reply owner or an administrator can edit this reply.', 403, 'PERMISSION_DENIED');
    Object.assign(reply, req.body, { links: parseArray(req.body.links) });
    if (req.files?.length) reply.images = await filesToImages(req.files);
    await reply.save();
    res.json({ success: true, data: { reply } });
  } catch (error) { next(error); }
};

const deleteReply = async (req, res, next) => {
  try {
    const reply = await ForumReply.findById(req.params.id);
    if (!reply) throw new AppError('Forum reply not found.', 404, 'REPLY_NOT_FOUND');
    if (reply.author.toString() !== req.user.userId.toString() && req.user.role !== 'admin') throw new AppError('Only the reply owner or an administrator can delete this reply.', 403, 'PERMISSION_DENIED');
    await Promise.all([ForumLike.deleteMany({ targetType: 'reply', targetId: reply._id }), reply.deleteOne(), ForumThread.findByIdAndUpdate(reply.thread, { $inc: { replyCount: -1 } })]);
    res.json({ success: true, message: 'Reply deleted.' });
  } catch (error) { next(error); }
};

const acceptReply = async (req, res, next) => {
  try {
    const reply = await ForumReply.findById(req.params.id);
    if (!reply) throw new AppError('Forum reply not found.', 404, 'REPLY_NOT_FOUND');
    const thread = await getThreadOrThrow(reply.thread);
    if (thread.author.toString() !== req.user.userId.toString()) throw new AppError('Only the thread owner can accept a solution.', 403, 'PERMISSION_DENIED');
    await ForumReply.updateMany({ thread: thread._id }, { $set: { isAcceptedAnswer: false } });
    reply.isAcceptedAnswer = true;
    await reply.save();
    thread.acceptedAnswer = reply._id;
    thread.status = 'Resolved';
    await thread.save();
    await createNotification({ userId: reply.author, type: NOTIFICATION_TYPES.FORUM_ACCEPTED, title: 'Solution accepted', message: 'Your forum reply was marked as the accepted solution.', relatedEntityType: 'ForumThread', relatedEntityId: thread._id, link: `/forum/threads/${thread._id}` });
    res.json({ success: true, data: { reply, thread } });
  } catch (error) { next(error); }
};

const toggleThreadLike = async (req, res, next) => { try { res.json({ success: true, data: await toggleLike({ targetType: 'thread', targetId: req.params.id, userId: req.user.userId }) }); } catch (error) { next(error); } };
const toggleReplyLike = async (req, res, next) => { try { res.json({ success: true, data: await toggleLike({ targetType: 'reply', targetId: req.params.id, userId: req.user.userId }) }); } catch (error) { next(error); } };
const toggleThreadBookmark = async (req, res, next) => { try { res.json({ success: true, data: await toggleBookmark(req.params.id, req.user.userId) }); } catch (error) { next(error); } };

const reportContent = async (req, res, next) => {
  try {
    const Model = req.body.targetType === 'thread' ? ForumThread : ForumReply;
    const target = await Model.findById(req.body.targetId);
    if (!target) throw new AppError('Reported content not found.', 404, 'TARGET_NOT_FOUND');
    const report = await ForumReport.create({ ...req.body, reporter: req.user.userId });
    await Model.findByIdAndUpdate(target._id, { $inc: { reportsCount: 1 } });
    res.status(201).json({ success: true, data: { report } });
  } catch (error) { next(error); }
};

const lockThread = async (req, res, next) => { try { const thread = await getThreadOrThrow(req.params.id); thread.isLocked = !thread.isLocked; await thread.save(); res.json({ success: true, data: { thread } }); } catch (error) { next(error); } };
const reviewReport = async (req, res, next) => { try { const report = await ForumReport.findByIdAndUpdate(req.params.id, { ...req.body, reviewedBy: req.user.userId }, { new: true }).populate('reporter', userProjection); if (!report) throw new AppError('Report not found.', 404, 'REPORT_NOT_FOUND'); await createNotification({ userId: report.reporter._id, type: NOTIFICATION_TYPES.FORUM_REPORT_UPDATED, title: 'Report reviewed', message: `Your forum report was ${report.status}.`, relatedEntityType: 'ForumReport', relatedEntityId: report._id }); res.json({ success: true, data: { report } }); } catch (error) { next(error); } };
const listReports = async (req, res, next) => { try { const reports = await ForumReport.find({ status: req.query.status || 'pending' }).sort({ createdAt: -1 }).populate('reporter', userProjection).lean(); res.json({ success: true, data: { reports } }); } catch (error) { next(error); } };
const listBookmarks = async (req, res, next) => { try { const bookmarks = await ForumBookmark.find({ user: req.user.userId }).sort({ createdAt: -1 }).populate({ path: 'thread', populate: populateAuthor }).lean(); res.json({ success: true, data: { threads: bookmarks.map((item) => item.thread).filter(Boolean) } }); } catch (error) { next(error); } };

module.exports = { listThreads, createThread, getThread, updateThread, deleteThread, createReply, updateReply, deleteReply, acceptReply, toggleThreadLike, toggleReplyLike, toggleThreadBookmark, reportContent, lockThread, reviewReport, listReports, listBookmarks };
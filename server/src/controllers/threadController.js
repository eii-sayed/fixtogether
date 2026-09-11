const mongoose = require('mongoose');
const { Thread, ThreadComment, User, ItemCategory, Notification } = require('../models');
const { asyncHandler, successResponse, errorResponse, parsePagination, paginationMeta } = require('../utils/helpers');
const { createNotification } = require('../services/notificationService');
const { NOTIFICATION_TYPES } = require('../constants');

/**
 * GET /api/v1/threads
 * List threads with Reddit/Facebook-style sorting & filtering
 */
const getThreads = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { sort = 'hot', category, type, status, search, author, tag } = req.query;

  const query = {};

  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      query.category = category;
    } else {
      const cat = await ItemCategory.findOne({ slug: category });
      if (cat) query.category = cat._id;
    }
  }

  if (type && type !== 'all') {
    query.type = type;
  }

  if (status && status !== 'all') {
    query.status = status;
  }

  if (author) {
    query.author = author;
  }

  if (tag) {
    query.tags = tag.toLowerCase();
  }

  if (search && search.trim()) {
    query.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { content: { $regex: search.trim(), $options: 'i' } },
      { tags: { $in: [new RegExp(search.trim(), 'i')] } },
    ];
  }

  let sortCriteria = { isPinned: -1, createdAt: -1 };

  if (sort === 'new') {
    sortCriteria = { isPinned: -1, createdAt: -1 };
  } else if (sort === 'top') {
    sortCriteria = { isPinned: -1, upvoteScore: -1, createdAt: -1 };
  } else if (sort === 'unanswered') {
    query.commentsCount = 0;
    sortCriteria = { isPinned: -1, createdAt: -1 };
  } else if (sort === 'solved') {
    query.status = 'solved';
    sortCriteria = { isPinned: -1, updatedAt: -1 };
  } else {
    // 'hot' (default): pinned first, then upvoteScore desc, then commentsCount desc, then recent
    sortCriteria = { isPinned: -1, upvoteScore: -1, commentsCount: -1, createdAt: -1 };
  }

  const [threads, total] = await Promise.all([
    Thread.find(query)
      .populate('author', 'fullName email role profileImage')
      .populate('category', 'name slug icon')
      .populate('solvedComment')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .lean(),
    Thread.countDocuments(query),
  ]);

  // Mark if current user has upvoted/downvoted
  const currentUserId = req.user?.userId?.toString();
  const enrichedThreads = threads.map((t) => {
    const upvoted = currentUserId ? t.upvotes?.some((id) => id.toString() === currentUserId) : false;
    const downvoted = currentUserId ? t.downvotes?.some((id) => id.toString() === currentUserId) : false;
    return {
      ...t,
      upvoted,
      downvoted,
      score: t.upvoteScore || 0,
    };
  });

  return successResponse(res, {
    threads: enrichedThreads,
    pagination: paginationMeta(total, page, limit),
  });
});

/**
 * GET /api/v1/threads/:id
 * Get single thread details and increment view count
 */
const getThreadById = asyncHandler(async (req, res) => {
  const thread = await Thread.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewsCount: 1 } },
    { new: true }
  )
    .populate('author', 'fullName email role profileImage city')
    .populate('category', 'name slug icon')
    .populate('item', 'title images brand model condition')
    .populate('repairRequest', 'title status urgency')
    .populate({
      path: 'solvedComment',
      populate: { path: 'author', select: 'fullName role profileImage' },
    });

  if (!thread) {
    return errorResponse(res, 'Thread not found', 404);
  }

  const currentUserId = req.user?.userId?.toString();
  const upvoted = currentUserId
    ? thread.upvotes?.some((id) => id.toString() === currentUserId)
    : false;
  const downvoted = currentUserId
    ? thread.downvotes?.some((id) => id.toString() === currentUserId)
    : false;

  return successResponse(res, {
    thread: {
      ...thread.toObject(),
      upvoted,
      downvoted,
      score: thread.upvoteScore || 0,
    },
  });
});

/**
 * POST /api/v1/threads
 * Create a new question/query or discussion thread
 */
const createThread = asyncHandler(async (req, res) => {
  const { title, content, category, type = 'question', tags = [], images = [], item, repairRequest } = req.body;

  if (!title || !title.trim()) {
    return errorResponse(res, 'Thread title is required', 400);
  }
  if (!content || !content.trim()) {
    return errorResponse(res, 'Thread content description is required', 400);
  }
  if (!category) {
    return errorResponse(res, 'Category is required', 400);
  }

  // Format tags
  const processedTags = Array.isArray(tags)
    ? tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
    : typeof tags === 'string'
    ? tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const thread = await Thread.create({
    author: req.user.userId,
    title: title.trim(),
    content: content.trim(),
    category,
    type,
    tags: processedTags,
    images: Array.isArray(images) ? images : [],
    item: item || null,
    repairRequest: repairRequest || null,
    status: 'open',
    upvotes: [req.user.userId], // OP automatically upvotes own thread
    upvoteScore: 1,
  });

  await thread.populate([
    { path: 'author', select: 'fullName email role profileImage' },
    { path: 'category', select: 'name slug icon' },
  ]);

  return successResponse(res, { thread }, 'Thread published to community forum successfully', 201);
});

/**
 * PATCH /api/v1/threads/:id
 * Update thread content, title, tags or status (author or admin)
 */
const updateThread = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.id);
  if (!thread) {
    return errorResponse(res, 'Thread not found', 404);
  }

  const isAuthor = thread.author.toString() === req.user.userId.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isAuthor && !isAdmin) {
    return errorResponse(res, 'Unauthorized to edit this thread', 403);
  }

  const { title, content, type, tags, images, isLocked, isPinned, status } = req.body;

  if (title) thread.title = title.trim();
  if (content) thread.content = content.trim();
  if (type) thread.type = type;
  if (tags) {
    thread.tags = Array.isArray(tags)
      ? tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
      : thread.tags;
  }
  if (images) thread.images = images;
  if (status) thread.status = status;

  if (isAdmin) {
    if (typeof isLocked === 'boolean') thread.isLocked = isLocked;
    if (typeof isPinned === 'boolean') thread.isPinned = isPinned;
  }

  await thread.save();
  await thread.populate([
    { path: 'author', select: 'fullName email role profileImage' },
    { path: 'category', select: 'name slug icon' },
  ]);

  return successResponse(res, { thread }, 'Thread updated');
});

/**
 * DELETE /api/v1/threads/:id
 * Delete thread and its comments (author or admin)
 */
const deleteThread = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.id);
  if (!thread) {
    return errorResponse(res, 'Thread not found', 404);
  }

  const isAuthor = thread.author.toString() === req.user.userId.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isAuthor && !isAdmin) {
    return errorResponse(res, 'Unauthorized to delete this thread', 403);
  }

  await Promise.all([
    Thread.findByIdAndDelete(req.params.id),
    ThreadComment.deleteMany({ thread: req.params.id }),
  ]);

  return successResponse(res, null, 'Thread and its discussions deleted successfully');
});

/**
 * POST /api/v1/threads/:id/vote
 * Reddit-style upvote / downvote or toggle vote
 */
const voteThread = asyncHandler(async (req, res) => {
  const { direction = 1 } = req.body; // 1 = upvote, -1 = downvote, 0 = remove vote
  const userId = req.user.userId;

  const thread = await Thread.findById(req.params.id);
  if (!thread) {
    return errorResponse(res, 'Thread not found', 404);
  }

  // Remove existing votes by this user
  thread.upvotes = thread.upvotes.filter((id) => id.toString() !== userId.toString());
  thread.downvotes = thread.downvotes.filter((id) => id.toString() !== userId.toString());

  if (direction === 1) {
    thread.upvotes.push(userId);
  } else if (direction === -1) {
    thread.downvotes.push(userId);
  }

  thread.upvoteScore = thread.upvotes.length - thread.downvotes.length;
  await thread.save();

  return successResponse(res, {
    score: thread.upvoteScore,
    upvoted: direction === 1,
    downvoted: direction === -1,
  });
});

/**
 * GET /api/v1/threads/:id/comments
 * Get comments and Facebook-style replies for a thread
 */
const getThreadComments = asyncHandler(async (req, res) => {
  const comments = await ThreadComment.find({ thread: req.params.id })
    .populate('author', 'fullName email role profileImage')
    .sort({ isAcceptedSolution: -1, upvoteScore: -1, createdAt: 1 })
    .lean();

  const currentUserId = req.user?.userId?.toString();

  // Enrich with user vote flags
  const enriched = comments.map((c) => ({
    ...c,
    upvoted: currentUserId ? c.upvotes?.some((id) => id.toString() === currentUserId) : false,
    downvoted: currentUserId ? c.downvotes?.some((id) => id.toString() === currentUserId) : false,
    score: c.upvoteScore || 0,
    replies: [],
  }));

  // Build hierarchical comment-and-reply structure
  const topLevel = [];
  const commentMap = {};

  enriched.forEach((c) => {
    commentMap[c._id.toString()] = c;
  });

  enriched.forEach((c) => {
    if (c.parentComment) {
      const parent = commentMap[c.parentComment.toString()];
      if (parent) {
        parent.replies.push(c);
      } else {
        topLevel.push(c);
      }
    } else {
      topLevel.push(c);
    }
  });

  return successResponse(res, { comments: topLevel, totalComments: comments.length });
});

/**
 * POST /api/v1/threads/:id/comments
 * Add an answer, opinion, suggestion, or direct reply
 */
const createComment = asyncHandler(async (req, res) => {
  const { content, parentCommentId = null, type = 'comment', images = [] } = req.body;

  if (!content || !content.trim()) {
    return errorResponse(res, 'Comment text is required', 400);
  }

  const thread = await Thread.findById(req.params.id);
  if (!thread) {
    return errorResponse(res, 'Thread not found', 404);
  }

  if (thread.isLocked) {
    return errorResponse(res, 'This thread is locked for new comments', 403);
  }

  let parentComment = null;
  if (parentCommentId) {
    parentComment = await ThreadComment.findById(parentCommentId);
    if (!parentComment) {
      return errorResponse(res, 'Parent comment not found', 404);
    }
  }

  const comment = await ThreadComment.create({
    thread: thread._id,
    author: req.user.userId,
    parentComment: parentCommentId || null,
    content: content.trim(),
    type,
    images: Array.isArray(images) ? images : [],
    upvotes: [req.user.userId],
    upvoteScore: 1,
  });

  // Increment comments count on thread
  thread.commentsCount = (thread.commentsCount || 0) + 1;
  if (thread.status === 'open' && (type === 'answer' || type === 'suggestion')) {
    thread.status = 'answered';
  }
  await thread.save();

  await comment.populate('author', 'fullName email role profileImage');

  // Notify thread author if someone else replies
  const targetRecipientId = parentComment ? parentComment.author.toString() : thread.author.toString();
  if (targetRecipientId !== req.user.userId.toString()) {
    await createNotification({
      userId: targetRecipientId,
      type: NOTIFICATION_TYPES.NEW_MESSAGE,
      title: parentComment ? 'New reply to your comment' : 'New reply to your forum query',
      message: `${req.user.email?.split('@')[0] || 'A user'} commented: "${content.substring(0, 80)}..."`,
      relatedEntityType: 'Thread',
      relatedEntityId: thread._id,
      link: `/forum/${thread._id}`,
    });
  }

  return successResponse(
    res,
    {
      comment: {
        ...comment.toObject(),
        upvoted: true,
        downvoted: false,
        score: 1,
        replies: [],
      },
    },
    'Reply posted successfully',
    201
  );
});

/**
 * POST /api/v1/threads/:id/comments/:commentId/vote
 * Upvote / downvote a comment
 */
const voteComment = asyncHandler(async (req, res) => {
  const { direction = 1 } = req.body;
  const userId = req.user.userId;

  const comment = await ThreadComment.findById(req.params.commentId);
  if (!comment) {
    return errorResponse(res, 'Comment not found', 404);
  }

  comment.upvotes = comment.upvotes.filter((id) => id.toString() !== userId.toString());
  comment.downvotes = comment.downvotes.filter((id) => id.toString() !== userId.toString());

  if (direction === 1) {
    comment.upvotes.push(userId);
  } else if (direction === -1) {
    comment.downvotes.push(userId);
  }

  comment.upvoteScore = comment.upvotes.length - comment.downvotes.length;
  await comment.save();

  return successResponse(res, {
    score: comment.upvoteScore,
    upvoted: direction === 1,
    downvoted: direction === -1,
  });
});

/**
 * POST /api/v1/threads/:id/comments/:commentId/solve
 * Mark comment as Accepted Solution (OP or Admin)
 */
const markAcceptedSolution = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.id);
  if (!thread) {
    return errorResponse(res, 'Thread not found', 404);
  }

  const isAuthor = thread.author.toString() === req.user.userId.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isAuthor && !isAdmin) {
    return errorResponse(res, 'Only the thread author or admin can mark an accepted solution', 403);
  }

  const comment = await ThreadComment.findById(req.params.commentId);
  if (!comment || comment.thread.toString() !== thread._id.toString()) {
    return errorResponse(res, 'Comment not found in this thread', 404);
  }

  // Clear existing accepted solution if any
  await ThreadComment.updateMany({ thread: thread._id }, { $set: { isAcceptedSolution: false } });

  // Mark this comment
  comment.isAcceptedSolution = true;
  await comment.save();

  thread.status = 'solved';
  thread.solvedComment = comment._id;
  await thread.save();

  // Notify comment author that their solution was accepted
  if (comment.author.toString() !== req.user.userId.toString()) {
    await createNotification({
      userId: comment.author.toString(),
      type: NOTIFICATION_TYPES.REPAIR_COMPLETED,
      title: '🌟 Your Answer Was Marked as the Solution!',
      message: `The author marked your answer to "${thread.title}" as the verified solution!`,
      relatedEntityType: 'Thread',
      relatedEntityId: thread._id,
      link: `/forum/${thread._id}`,
    });
  }

  return successResponse(res, { thread, comment }, 'Answer marked as accepted solution');
});

/**
 * DELETE /api/v1/threads/:id/comments/:commentId
 * Delete a comment (author or admin)
 */
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await ThreadComment.findById(req.params.commentId);
  if (!comment) {
    return errorResponse(res, 'Comment not found', 404);
  }

  const isAuthor = comment.author.toString() === req.user.userId.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isAuthor && !isAdmin) {
    return errorResponse(res, 'Unauthorized to delete this comment', 403);
  }

  await ThreadComment.findByIdAndDelete(req.params.commentId);
  // Also delete child replies
  await ThreadComment.deleteMany({ parentComment: req.params.commentId });

  // Update thread comments count
  const remainingCount = await ThreadComment.countDocuments({ thread: req.params.id });
  await Thread.findByIdAndUpdate(req.params.id, { commentsCount: remainingCount });

  return successResponse(res, null, 'Comment deleted successfully');
});

/**
 * GET /api/v1/threads/stats
 * Aggregate forum statistics & top helpful technicians
 */
const getCommunityStats = asyncHandler(async (req, res) => {
  const [totalThreads, solvedThreads, totalComments, topContributors] = await Promise.all([
    Thread.countDocuments(),
    Thread.countDocuments({ status: 'solved' }),
    ThreadComment.countDocuments(),
    ThreadComment.aggregate([
      { $match: { isAcceptedSolution: true } },
      { $group: { _id: '$author', solutionsCount: { $sum: 1 } } },
      { $sort: { solutionsCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          solutionsCount: 1,
          'user.fullName': 1,
          'user.role': 1,
          'user.profileImage': 1,
        },
      },
    ]),
  ]);

  return successResponse(res, {
    totalThreads,
    solvedThreads,
    totalComments,
    solvedPercentage: totalThreads > 0 ? Math.round((solvedThreads / totalThreads) * 100) : 0,
    topContributors,
  });
});

module.exports = {
  getThreads,
  getThreadById,
  createThread,
  updateThread,
  deleteThread,
  voteThread,
  getThreadComments,
  createComment,
  voteComment,
  markAcceptedSolution,
  deleteComment,
  getCommunityStats,
};

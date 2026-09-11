const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Thread title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Thread content is required'],
      trim: true,
      maxlength: [10000, 'Content cannot exceed 10000 characters'],
    },
    type: {
      type: String,
      enum: ['question', 'troubleshooting', 'discussion', 'guide', 'showcase'],
      default: 'question',
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemCategory',
      required: [true, 'Category is required'],
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    images: [
      {
        url: { type: String, required: true },
        caption: { type: String, default: '' },
      },
    ],
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
    repairRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairRequest',
      default: null,
    },
    status: {
      type: String,
      enum: ['open', 'answered', 'solved', 'closed'],
      default: 'open',
      index: true,
    },
    solvedComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ThreadComment',
      default: null,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    downvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    upvoteScore: {
      type: Number,
      default: 0,
      index: true,
    },
    commentsCount: {
      type: Number,
      default: 0,
      index: true,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Full text search index
threadSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Hot score calculation method
threadSchema.methods.calculateHotScore = function () {
  const ageHours = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
  const engagement = (this.upvoteScore || 0) + (this.commentsCount || 0) * 2;
  return engagement / Math.pow(ageHours + 2, 1.5);
};

const Thread = mongoose.model('Thread', threadSchema);

module.exports = Thread;

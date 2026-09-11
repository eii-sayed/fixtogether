const mongoose = require('mongoose');

const threadCommentSchema = new mongoose.Schema(
  {
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Thread',
      required: [true, 'Thread reference is required'],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ThreadComment',
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [5000, 'Comment cannot exceed 5000 characters'],
    },
    type: {
      type: String,
      enum: ['answer', 'opinion', 'suggestion', 'comment'],
      default: 'comment',
      index: true,
    },
    images: [
      {
        url: { type: String, required: true },
        caption: { type: String, default: '' },
      },
    ],
    isAcceptedSolution: {
      type: Boolean,
      default: false,
      index: true,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for replies count
threadCommentSchema.virtual('replies', {
  ref: 'ThreadComment',
  localField: '_id',
  foreignField: 'parentComment',
});

const ThreadComment = mongoose.model('ThreadComment', threadCommentSchema);

module.exports = ThreadComment;

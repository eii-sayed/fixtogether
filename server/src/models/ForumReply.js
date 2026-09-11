const mongoose = require('mongoose');

const forumReplySchema = new mongoose.Schema({
  thread: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumThread', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, required: true, trim: true, minlength: 2, maxlength: 10000 },
  images: [{ url: { type: String, required: true, maxlength: 2048 }, publicId: { type: String, default: '' } }],
  links: [{ type: String, trim: true, maxlength: 2048 }],
  likesCount: { type: Number, default: 0, min: 0 },
  isAcceptedAnswer: { type: Boolean, default: false },
  reportsCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

forumReplySchema.index({ thread: 1, createdAt: 1 });

module.exports = mongoose.model('ForumReply', forumReplySchema);
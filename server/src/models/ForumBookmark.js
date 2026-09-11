const mongoose = require('mongoose');

const forumBookmarkSchema = new mongoose.Schema({
  thread: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumThread', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

forumBookmarkSchema.index({ thread: 1, user: 1 }, { unique: true });
forumBookmarkSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ForumBookmark', forumBookmarkSchema);
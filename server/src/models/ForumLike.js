const mongoose = require('mongoose');

const forumLikeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['thread', 'reply'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

forumLikeSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });
forumLikeSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('ForumLike', forumLikeSchema);
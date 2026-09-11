const mongoose = require('mongoose');

const forumImageSchema = new mongoose.Schema({
  url: { type: String, required: true, maxlength: 2048 },
  publicId: { type: String, default: '' },
}, { _id: false });

const forumThreadSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 8, maxlength: 160 },
  description: { type: String, required: true, trim: true, minlength: 20, maxlength: 10000 },
  category: { type: String, required: true, enum: ['Repair Help', 'Technician Recommendation', 'Parts Recommendation', 'Donation Advice', 'Recycling Advice', 'DIY Projects', 'Success Stories', 'Buying Advice', 'General Discussion'] },
  itemType: { type: String, trim: true, maxlength: 80, default: '' },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
  images: [forumImageSchema],
  location: { type: String, trim: true, maxlength: 120, default: '' },
  views: { type: Number, default: 0, min: 0 },
  likesCount: { type: Number, default: 0, min: 0 },
  replyCount: { type: Number, default: 0, min: 0 },
  bookmarkCount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['Open', 'Resolved', 'Closed'], default: 'Open', index: true },
  acceptedAnswer: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumReply', default: null },
  isLocked: { type: Boolean, default: false, index: true },
  reportsCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

forumThreadSchema.index({ createdAt: -1 });
forumThreadSchema.index({ category: 1, status: 1, createdAt: -1 });
forumThreadSchema.index({ tags: 1, createdAt: -1 });
forumThreadSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('ForumThread', forumThreadSchema);
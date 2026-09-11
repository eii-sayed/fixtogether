const mongoose = require('mongoose');

const forumReportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['thread', 'reply'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewNote: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });

forumReportSchema.index({ targetType: 1, targetId: 1, status: 1 });
forumReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ForumReport', forumReportSchema);
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    repairRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairRequest',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: 2000,
    },
    messageType: {
      type: String,
      enum: ['text', 'system'],
      default: 'text',
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// For fetching messages in a conversation (paginated, newest first)
messageSchema.index({ repairRequest: 1, createdAt: -1 });
// For counting unread messages per user
messageSchema.index({ recipient: 1, readAt: 1 });
// For fetching conversations list (last message per repair request per user)
messageSchema.index({ recipient: 1, repairRequest: 1, createdAt: -1 });
messageSchema.index({ sender: 1, repairRequest: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

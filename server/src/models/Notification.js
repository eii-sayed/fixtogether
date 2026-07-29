const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../constants');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    relatedEntityType: {
      type: String,
      default: '',
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
    deliveredByEmail: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

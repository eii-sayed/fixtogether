const { Message, RepairRequest, RepairJob, Quotation } = require('../models');
const { NOTIFICATION_TYPES } = require('../constants');
const { createNotification } = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * Check if a user is a participant in a repair request conversation.
 * A participant is the request owner, an invited/quoted/assigned technician, or an admin.
 */
const isParticipant = async (userId, userRole, repairRequest) => {
  if (userRole === 'admin') return true;

  // Owner of the repair request
  const ownerId = repairRequest.owner?._id || repairRequest.owner;
  if (ownerId.toString() === userId.toString()) return true;

  // Technician invited via selectedTechnicians
  if (repairRequest.selectedTechnicians?.length > 0) {
    const isInvited = repairRequest.selectedTechnicians.some(
      (t) => (t.technician?._id || t.technician)?.toString() === userId.toString()
    );
    if (isInvited) return true;
  }

  // Technician who submitted a quotation on this request
  const hasQuotation = await Quotation.exists({
    repairRequest: repairRequest._id,
    technician: userId,
  });
  if (hasQuotation) return true;

  // Technician assigned to a repair job for this request
  const hasJob = await RepairJob.exists({
    repairRequest: repairRequest._id,
    technician: userId,
  });
  if (hasJob) return true;

  return false;
};

/**
 * Determine the recipient for a message in a repair request context.
 * If sender is the owner, recipient is the technician.
 * If sender is the technician, recipient is the owner.
 */
const getRecipient = async (senderId, repairRequest) => {
  const ownerId = (repairRequest.owner?._id || repairRequest.owner).toString();

  if (senderId.toString() === ownerId) {
    // Sender is owner → find the technician (from job → quotation → invited)
    const job = await RepairJob.findOne({ repairRequest: repairRequest._id })
      .select('technician')
      .lean();
    if (job) return job.technician.toString();

    // Fall back to the selected quotation's technician
    if (repairRequest.selectedQuotation) {
      const quotation = await Quotation.findById(repairRequest.selectedQuotation)
        .select('technician')
        .lean();
      if (quotation) return quotation.technician.toString();
    }

    // Fall back to the most recent quotation's technician
    const latestQuotation = await Quotation.findOne({
      repairRequest: repairRequest._id,
      status: { $in: ['submitted', 'accepted'] },
    })
      .sort({ createdAt: -1 })
      .select('technician')
      .lean();
    if (latestQuotation) return latestQuotation.technician.toString();

    // Fall back to the most recently invited technician
    if (repairRequest.selectedTechnicians?.length > 0) {
      const invited = repairRequest.selectedTechnicians
        .filter((t) => t.status !== 'declined')
        .sort((a, b) => new Date(b.invitedAt) - new Date(a.invitedAt));
      if (invited.length > 0) {
        return (invited[0].technician?._id || invited[0].technician).toString();
      }
    }

    return null;
  }

  // Sender is technician → recipient is the owner
  return ownerId;
};

/**
 * GET /messages/unread-count
 * Returns total unread message count for the current user.
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user.userId,
      readAt: null,
    });

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    logger.error('Get unread count error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
};

/**
 * GET /messages/conversations
 * Returns list of repair requests the user has active conversations for,
 * with the last message and unread count per conversation.
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find all distinct repair request IDs where user is sender or recipient
    const repairRequestIds = await Message.distinct('repairRequest', {
      $or: [{ sender: userId }, { recipient: userId }],
    });

    if (repairRequestIds.length === 0) {
      return res.json({
        success: true,
        data: { conversations: [] },
      });
    }

    // For each repair request, get last message and unread count
    const conversations = await Promise.all(
      repairRequestIds.map(async (rrId) => {
        const [lastMessage, unreadCount, repairRequest] = await Promise.all([
          Message.findOne({ repairRequest: rrId })
            .sort({ createdAt: -1 })
            .populate('sender', 'fullName')
            .lean(),
          Message.countDocuments({
            repairRequest: rrId,
            recipient: userId,
            readAt: null,
          }),
          RepairRequest.findById(rrId)
            .select('item owner requestStatus')
            .populate('item', 'title')
            .populate('owner', 'fullName')
            .lean(),
        ]);

        if (!repairRequest || !lastMessage) return null;

        // Figure out the other participant
        const ownerId = repairRequest.owner?._id?.toString();
        const isOwner = ownerId === userId.toString();

        let otherParticipant;
        if (isOwner) {
          // Find technician from the last message
          const techId = lastMessage.sender._id?.toString() === userId.toString()
            ? lastMessage.recipient
            : lastMessage.sender._id;
          const { User } = require('../models');
          const tech = await User.findById(techId).select('fullName').lean();
          otherParticipant = tech || { fullName: 'Technician' };
        } else {
          otherParticipant = repairRequest.owner;
        }

        return {
          repairRequestId: rrId,
          itemTitle: repairRequest.item?.title || 'Repair Request',
          requestStatus: repairRequest.requestStatus,
          otherParticipant: {
            _id: otherParticipant?._id,
            fullName: otherParticipant?.fullName || 'User',
          },
          lastMessage: {
            content: lastMessage.content,
            sender: lastMessage.sender?.fullName,
            senderId: lastMessage.sender?._id,
            createdAt: lastMessage.createdAt,
            messageType: lastMessage.messageType,
          },
          unreadCount,
        };
      })
    );

    // Filter out nulls and sort by last message time
    const validConversations = conversations
      .filter(Boolean)
      .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

    res.json({
      success: true,
      data: { conversations: validConversations },
    });
  } catch (error) {
    logger.error('Get conversations error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get conversations' });
  }
};

/**
 * GET /messages/:repairRequestId
 * Returns paginated messages for a repair request.
 */
const getMessages = async (req, res) => {
  try {
    const { repairRequestId } = req.params;
    const { before, limit = 30 } = req.query;

    // Verify repair request exists
    const repairRequest = await RepairRequest.findById(repairRequestId)
      .select('owner selectedTechnicians')
      .lean();

    if (!repairRequest) {
      return res.status(404).json({ success: false, message: 'Repair request not found' });
    }

    // Check authorization
    const authorized = await isParticipant(req.user.userId, req.user.role, repairRequest);
    if (!authorized) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation' });
    }

    // Build query
    const query = { repairRequest: repairRequestId };
    if (before) {
      query._id = { $lt: before };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('sender', 'fullName role')
      .lean();

    // Check if there are more messages
    const hasMore = messages.length === parseInt(limit, 10);

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Return in chronological order
        hasMore,
        cursor: messages.length > 0 ? messages[0]._id : null,
      },
    });
  } catch (error) {
    logger.error('Get messages error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get messages' });
  }
};

/**
 * POST /messages/:repairRequestId
 * Send a message in a repair request conversation.
 */
const sendMessage = async (req, res) => {
  try {
    const { repairRequestId } = req.params;
    const { content } = req.body;
    const senderId = req.user.userId;

    // Verify repair request exists
    const repairRequest = await RepairRequest.findById(repairRequestId)
      .select('owner selectedQuotation requestStatus selectedTechnicians')
      .lean();

    if (!repairRequest) {
      return res.status(404).json({ success: false, message: 'Repair request not found' });
    }

    // Check authorization
    const authorized = await isParticipant(senderId, req.user.role, repairRequest);
    if (!authorized) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation' });
    }

    // Determine recipient
    const recipientId = await getRecipient(senderId, repairRequest);
    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot determine message recipient. Make sure a technician is involved.',
      });
    }

    // Create message
    const message = await Message.create({
      repairRequest: repairRequestId,
      sender: senderId,
      recipient: recipientId,
      content,
      messageType: 'text',
    });

    // Populate sender info for the response
    await message.populate('sender', 'fullName role');

    const messageData = {
      _id: message._id,
      repairRequest: message.repairRequest,
      sender: message.sender,
      recipient: message.recipient,
      content: message.content,
      messageType: message.messageType,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };

    // Emit via Socket.IO (if available via notification service)
    const { getIO } = require('../services/notificationService');
    const io = getIO();
    if (io) {
      // Emit to the chat room
      io.to(`chat:${repairRequestId}`).emit('chat:message', messageData);
      // Also emit to the recipient's personal room for unread badge updates
      io.to(`user:${recipientId}`).emit('chat:unread', {
        repairRequestId,
        message: messageData,
      });
    }

    // Create a notification for the recipient
    await createNotification({
      userId: recipientId,
      type: NOTIFICATION_TYPES.NEW_MESSAGE,
      title: 'New Message',
      message: `${req.user.fullName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
      relatedEntityType: 'RepairRequest',
      relatedEntityId: repairRequestId,
    });

    res.status(201).json({
      success: true,
      data: { message: messageData },
    });
  } catch (error) {
    logger.error('Send message error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

/**
 * PATCH /messages/:repairRequestId/read
 * Mark all messages from the other party as read.
 */
const markAsRead = async (req, res) => {
  try {
    const { repairRequestId } = req.params;
    const userId = req.user.userId;

    const result = await Message.updateMany(
      {
        repairRequest: repairRequestId,
        recipient: userId,
        readAt: null,
      },
      { readAt: new Date() }
    );

    // Emit read receipt via Socket.IO
    const { getIO } = require('../services/notificationService');
    const io = getIO();
    if (io) {
      io.to(`chat:${repairRequestId}`).emit('chat:read', {
        repairRequestId,
        readBy: userId,
        readAt: new Date(),
      });
    }

    res.json({
      success: true,
      data: { markedCount: result.modifiedCount },
    });
  } catch (error) {
    logger.error('Mark as read error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
  }
};

module.exports = {
  getUnreadCount,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
};

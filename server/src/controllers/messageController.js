const mongoose = require('mongoose');
const {
  Message,
  RepairRequest,
  RepairJob,
  Quotation,
  User,
  TechnicianProfile,
  OrganizationProfile,
} = require('../models');
const { NOTIFICATION_TYPES } = require('../constants');
const { createNotification } = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * Check if a user is an authorized participant in a repair request conversation.
 * A participant is the request owner, an invited/quoted/assigned technician, or an admin.
 */
const isParticipant = async (userId, userRole, repairRequest) => {
  if (userRole === 'admin') return true;

  // Owner of the repair request
  const ownerId = repairRequest.owner?._id || repairRequest.owner;
  if (ownerId && ownerId.toString() === userId.toString()) return true;

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
    // Sender is owner -> find the technician (from job -> quotation -> invited)
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

  // Sender is technician -> recipient is the owner
  return ownerId;
};

/**
 * Helper to fetch detailed metadata of the other participant
 */
const getOtherParticipantInfo = async (currentUserId, repairRequest) => {
  const ownerId = (repairRequest.owner?._id || repairRequest.owner).toString();
  const isCurrentOwner = currentUserId.toString() === ownerId;

  let targetUserId = null;
  if (isCurrentOwner) {
    targetUserId = await getRecipient(currentUserId, repairRequest);
  } else {
    targetUserId = ownerId;
  }

  if (!targetUserId) {
    return {
      _id: null,
      fullName: 'Participant',
      role: isCurrentOwner ? 'technician' : 'owner',
      profileImage: null,
      verificationStatus: null,
    };
  }

  const targetUser = await User.findById(targetUserId)
    .select('fullName email phone role profileImage city serviceArea')
    .lean();

  if (!targetUser) {
    return {
      _id: targetUserId,
      fullName: 'User',
      role: 'user',
      profileImage: null,
      verificationStatus: null,
    };
  }

  let professionalName = targetUser.fullName;
  let verificationStatus = null;

  if (targetUser.role === 'technician') {
    const techProfile = await TechnicianProfile.findOne({ user: targetUser._id })
      .select('professionalName verificationStatus averageRating reviewCount')
      .lean();
    if (techProfile) {
      if (techProfile.professionalName) professionalName = techProfile.professionalName;
      verificationStatus = techProfile.verificationStatus;
    }
  } else if (targetUser.role === 'organization') {
    const orgProfile = await OrganizationProfile.findOne({ user: targetUser._id })
      .select('organizationName verificationStatus')
      .lean();
    if (orgProfile) {
      if (orgProfile.organizationName) professionalName = orgProfile.organizationName;
      verificationStatus = orgProfile.verificationStatus;
    }
  }

  return {
    _id: targetUser._id,
    fullName: targetUser.fullName,
    professionalName,
    role: targetUser.role,
    profileImage: targetUser.profileImage,
    city: targetUser.city,
    verificationStatus,
  };
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
 * Returns list of repair requests the user has active conversations for.
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

    // For each repair request, fetch last message, unread count, and metadata
    const conversations = await Promise.all(
      repairRequestIds.map(async (rrId) => {
        const [lastMessage, unreadCount, repairRequest] = await Promise.all([
          Message.findOne({ repairRequest: rrId })
            .sort({ createdAt: -1 })
            .populate('sender', 'fullName profileImage role')
            .lean(),
          Message.countDocuments({
            repairRequest: rrId,
            recipient: userId,
            readAt: null,
          }),
          RepairRequest.findById(rrId)
            .select('item owner requestStatus selectedTechnicians selectedQuotation')
            .populate('item', 'title images')
            .populate('owner', 'fullName profileImage role')
            .lean(),
        ]);

        if (!repairRequest || !lastMessage) return null;

        const otherParticipant = await getOtherParticipantInfo(userId, repairRequest);

        return {
          repairRequestId: rrId,
          itemTitle: repairRequest.item?.title || 'Repair Request',
          itemThumbnail: repairRequest.item?.images?.[0]?.url || '',
          requestStatus: repairRequest.requestStatus,
          otherParticipant,
          lastMessage: {
            _id: lastMessage._id,
            content: lastMessage.content,
            sender: lastMessage.sender?.fullName,
            senderId: lastMessage.sender?._id || lastMessage.sender,
            senderProfileImage: lastMessage.sender?.profileImage,
            createdAt: lastMessage.createdAt,
            messageType: lastMessage.messageType,
            readAt: lastMessage.readAt,
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

    if (!mongoose.Types.ObjectId.isValid(repairRequestId)) {
      return res.status(400).json({ success: false, message: 'Invalid repair request ID format' });
    }

    // Verify repair request exists
    const repairRequest = await RepairRequest.findById(repairRequestId)
      .select('owner selectedTechnicians selectedQuotation requestStatus item problemDescription')
      .populate('item', 'title images')
      .lean();

    if (!repairRequest) {
      return res.status(404).json({ success: false, message: 'Repair request not found' });
    }

    // Check authorization
    const authorized = await isParticipant(req.user.userId, req.user.role, repairRequest);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not an authorized participant in this conversation',
      });
    }

    // Build query
    const query = { repairRequest: repairRequestId };
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      query._id = { $lt: before };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('sender', 'fullName profileImage role')
      .lean();

    // Check if there are more messages
    const hasMore = messages.length === parseInt(limit, 10);
    const cursor = messages.length > 0 ? messages[messages.length - 1]._id : null;

    // Get other participant and repair context
    const [otherParticipant] = await Promise.all([
      getOtherParticipantInfo(req.user.userId, repairRequest),
    ]);

    const repairContext = {
      repairRequestId: repairRequest._id,
      itemTitle: repairRequest.item?.title || 'Repair Request',
      itemThumbnail: repairRequest.item?.images?.[0]?.url || '',
      requestStatus: repairRequest.requestStatus,
      problemDescription: repairRequest.problemDescription,
    };

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Return in chronological order
        hasMore,
        cursor,
        otherParticipant,
        repairContext,
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
    const { content, clientTempId } = req.body;
    const senderId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(repairRequestId)) {
      return res.status(400).json({ success: false, message: 'Invalid repair request ID format' });
    }

    const trimmedContent = (content || '').trim();
    if (!trimmedContent) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty' });
    }
    if (trimmedContent.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message cannot exceed 2000 characters' });
    }

    // Verify repair request exists
    const repairRequest = await RepairRequest.findById(repairRequestId)
      .select('owner selectedQuotation requestStatus selectedTechnicians item')
      .populate('item', 'title images')
      .lean();

    if (!repairRequest) {
      return res.status(404).json({ success: false, message: 'Repair request not found' });
    }

    // Check authorization
    const authorized = await isParticipant(senderId, req.user.role, repairRequest);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not an authorized participant in this conversation',
      });
    }

    // Determine recipient securely
    const recipientId = await getRecipient(senderId, repairRequest);
    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot determine message recipient. Make sure a technician is involved.',
      });
    }

    // Create message in database
    const message = await Message.create({
      repairRequest: repairRequestId,
      sender: senderId,
      recipient: recipientId,
      content: trimmedContent,
      messageType: 'text',
    });

    // Populate sender info for the response
    await message.populate('sender', 'fullName profileImage role');

    const messageData = {
      _id: message._id,
      clientTempId: clientTempId || undefined,
      repairRequest: message.repairRequest,
      sender: message.sender,
      recipient: message.recipient,
      content: message.content,
      messageType: message.messageType,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };

    // Emit via Socket.IO to the room and recipient
    const { getIO } = require('../services/notificationService');
    const io = getIO();
    if (io) {
      // Emit to the authorized chat room
      io.to(`chat:${repairRequestId}`).emit('chat:message', messageData);
      // Emit to recipient's personal room for badge and notification updates
      io.to(`user:${recipientId}`).emit('chat:unread', {
        repairRequestId,
        message: messageData,
      });
    }

    // Create a real-time notification for recipient
    await createNotification({
      userId: recipientId,
      type: NOTIFICATION_TYPES.NEW_MESSAGE,
      title: 'New Message',
      message: `${req.user.fullName}: ${trimmedContent.substring(0, 100)}${
        trimmedContent.length > 100 ? '...' : ''
      }`,
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
 * Mark all unread messages from the other party as read.
 */
const markAsRead = async (req, res) => {
  try {
    const { repairRequestId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(repairRequestId)) {
      return res.status(400).json({ success: false, message: 'Invalid repair request ID format' });
    }

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
      // Also update user's own unread badge
      const unreadCount = await Message.countDocuments({ recipient: userId, readAt: null });
      io.to(`user:${userId}`).emit('chat:unread-count', { unreadCount });
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
  isParticipant,
  getRecipient,
  getUnreadCount,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
};

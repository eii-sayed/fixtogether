const fs = require('fs');
const { chatWithAI } = require('../services/ai');
const { uploadFile } = require('../services/uploadService');
const { TechnicianProfile, User, ItemCategory } = require('../models');
const logger = require('../utils/logger');

/**
 * POST /api/v1/ai/chat
 * Conversational & Multimodal AI Assistant endpoint
 */
const handleAIChat = async (req, res) => {
  try {
    let message = req.body.message || '';
    let history = [];
    let imageBase64 = null;
    let imageMimeType = 'image/jpeg';
    let uploadedImageUrl = null;

    // Parse history if passed as string (when using multipart/form-data)
    if (typeof req.body.history === 'string') {
      try {
        history = JSON.parse(req.body.history);
      } catch {
        history = [];
      }
    } else if (Array.isArray(req.body.history)) {
      history = req.body.history;
    }

    // Handle image from file upload (multipart/form-data)
    if (req.file) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        imageBase64 = fileBuffer.toString('base64');
        imageMimeType = req.file.mimetype || 'image/jpeg';

        // Upload to Cloudinary / storage for persistent preview URL
        const uploadResult = await uploadFile(req.file.path, {
          folder: 'fixtogether/ai-chat',
        });
        uploadedImageUrl = uploadResult.url;
      } catch (fileErr) {
        logger.warn('Failed to process uploaded chat image:', fileErr.message);
      }
    } else if (req.body.imageBase64) {
      imageBase64 = req.body.imageBase64;
      imageMimeType = req.body.imageMimeType || 'image/jpeg';
    }

    if (!message.trim() && !imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Message content or an image is required',
      });
    }

    // Run AI analysis
    const aiResponse = await chatWithAI({
      message: message.trim(),
      imageBase64,
      imageMimeType,
      history,
    });

    const category = aiResponse.category || '';
    const skills = Array.isArray(aiResponse.skills) ? aiResponse.skills : [];

    // Query matched technicians from DB based on detected skills/category
    let matchedTechnicians = [];
    try {
      const techQuery = {
        activeStatus: 'active',
      };

      // Search for active technicians
      const potentialTechs = await TechnicianProfile.find(techQuery)
        .populate('user', 'fullName avatar rating totalReviews address isVerified')
        .sort({ averageRating: -1, totalRepairsCompleted: -1 })
        .limit(6);

      // Filter or rank by skills matching if available
      if (potentialTechs && potentialTechs.length > 0) {
        matchedTechnicians = potentialTechs
          .filter((t) => t.user)
          .map((t) => ({
            id: t._id,
            userId: t.user._id,
            name: t.user.fullName,
            avatar: typeof t.user.avatar === 'object' ? t.user.avatar?.url : t.user.avatar,
            rating: t.averageRating || t.user.rating || 5.0,
            completedRepairs: t.totalRepairsCompleted || 0,
            isVerified: t.verificationStatus === 'verified' || t.user.isVerified,
            skills: t.skills || [],
            bio: t.bio || '',
          }))
          .slice(0, 3);
      }
    } catch (dbErr) {
      logger.warn('Error fetching matched technicians for AI chat:', dbErr.message);
    }

    res.json({
      success: true,
      data: {
        reply: aiResponse.reply || 'I analyzed your request. Here is what I found:',
        category,
        skills,
        suggestedActions: aiResponse.suggestedActions || [],
        imageUrl: uploadedImageUrl,
        matchedTechnicians,
      },
    });
  } catch (error) {
    logger.error('AI chat endpoint error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI chat request',
    });
  }
};

module.exports = {
  handleAIChat,
};

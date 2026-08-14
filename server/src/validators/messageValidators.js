const Joi = require('joi');

const sendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required()
    .messages({
      'string.empty': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 2000 characters',
    }),
});

const getMessagesQuerySchema = Joi.object({
  before: Joi.string().hex().length(24).optional()
    .messages({ 'string.length': 'Invalid cursor format' }),
  limit: Joi.number().integer().min(1).max(50).default(30),
});

module.exports = {
  sendMessageSchema,
  getMessagesQuerySchema,
};

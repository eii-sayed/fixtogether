const Joi = require('joi');

const categories = ['Repair Help', 'Technician Recommendation', 'Parts Recommendation', 'Donation Advice', 'Recycling Advice', 'DIY Projects', 'Success Stories', 'Buying Advice', 'General Discussion'];
const objectId = Joi.string().hex().length(24);

const threadBody = Joi.object({
  title: Joi.string().trim().min(8).max(160).required(),
  description: Joi.string().trim().min(20).max(10000).required(),
  category: Joi.string().valid(...categories).required(),
  itemType: Joi.string().trim().max(80).allow('').default(''),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(40)).max(10), Joi.string().max(400)).default([]),
  location: Joi.string().trim().max(120).allow('').default(''),
  status: Joi.string().valid('Open', 'Resolved', 'Closed'),
});

const replyBody = Joi.object({
  content: Joi.string().trim().min(2).max(10000).required(),
  links: Joi.alternatives().try(Joi.array().items(Joi.string().uri({ scheme: ['http', 'https'] }).max(2048)).max(5), Joi.string().max(10000)).default([]),
});

const reportBody = Joi.object({
  targetType: Joi.string().valid('thread', 'reply').required(),
  targetId: objectId.required(),
  reason: Joi.string().trim().min(5).max(500).required(),
});

const reviewBody = Joi.object({
  status: Joi.string().valid('reviewed', 'dismissed').required(),
  reviewNote: Joi.string().trim().max(500).allow('').default(''),
});

const forumIdParams = Joi.object({ id: objectId.required() });

module.exports = { threadBody, replyBody, reportBody, reviewBody, forumIdParams };
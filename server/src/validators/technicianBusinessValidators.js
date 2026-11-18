const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const serviceTemplateFields = {
  name: Joi.string().trim().min(2).max(120),
  description: Joi.string().trim().allow('').max(2000),
  category: Joi.string().pattern(objectIdPattern).allow('', null),
  estimatedDurationMinutes: Joi.number().integer().min(15).max(10080),
  laborCost: Joi.number().min(0),
  partsAllowance: Joi.number().min(0),
  warrantyDays: Joi.number().integer().min(0).max(3650),
  checklist: Joi.array().items(Joi.string().trim().max(300)).max(30),
  active: Joi.boolean(),
};

const createServiceTemplateSchema = Joi.object({
  ...serviceTemplateFields,
  name: serviceTemplateFields.name.required(),
});

const updateServiceTemplateSchema = Joi.object(serviceTemplateFields).min(1);

const invoiceSchema = Joi.object({
  note: Joi.string().trim().allow('').max(1000).default(''),
});

const earningsQuerySchema = Joi.object({
  period: Joi.string().valid('7d', '30d', '90d', 'year').default('30d'),
});

module.exports = {
  createServiceTemplateSchema,
  updateServiceTemplateSchema,
  invoiceSchema,
  earningsQuerySchema,
};

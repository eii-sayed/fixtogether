const Joi = require('joi');
const { ROLES } = require('../constants');

const registerSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required()
    .messages({ 'string.empty': 'Full name is required' }),
  email: Joi.string().email().lowercase().trim().required()
    .messages({ 'string.email': 'Please provide a valid email' }),
  password: Joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    .messages({ 'any.only': 'Passwords do not match' }),
  role: Joi.string().valid(ROLES.OWNER, ROLES.TECHNICIAN, ROLES.ORGANIZATION).default(ROLES.OWNER),
  phone: Joi.string().allow('').optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required()
    .messages({ 'string.email': 'Please provide a valid email' }),
  password: Joi.string().required()
    .messages({ 'string.empty': 'Password is required' }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    .messages({ 'any.only': 'Passwords do not match' }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).optional(),
  phone: Joi.string().allow('').optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
};

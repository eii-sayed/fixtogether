const Joi = require('joi');
const { SERVICE_METHOD, ORGANIZATION_TYPES } = require('../constants');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const updateUserProfileSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).optional(),
  phone: Joi.string().trim().allow('').max(20).optional(),
  bio: Joi.string().trim().allow('').max(500).optional(),
  city: Joi.string().trim().allow('').max(100).optional(),
  serviceArea: Joi.string().trim().allow('').max(200).optional(),
  preferredLanguage: Joi.string().valid('en', 'bn').optional(),
  preferredContactMethod: Joi.string().valid('in_app', 'email', 'phone').optional(),
}).options({ stripUnknown: false });

const updatePrivacySchema = Joi.object({
  showPhonePublicly: Joi.boolean().optional(),
  showEmailPublicly: Joi.boolean().optional(),
  showLocationPublicly: Joi.boolean().optional(),
  showActivityPublicly: Joi.boolean().optional(),
  showAvailabilityPublicly: Joi.boolean().optional(),
});

const updateNotificationPreferencesSchema = Joi.object({
  emailAlerts: Joi.boolean().optional(),
  inAppAlerts: Joi.boolean().optional(),
  smsAlerts: Joi.boolean().optional(),
  marketingUpdates: Joi.boolean().optional(),
});

const updateTechnicianProfileSchema = Joi.object({
  professionalName: Joi.string().trim().allow('').max(100).optional(),
  biography: Joi.string().trim().allow('').max(2000).optional(),
  skills: Joi.array().items(Joi.string().pattern(objectIdPattern)).optional(),
  supportedCategories: Joi.array().items(Joi.string().pattern(objectIdPattern)).optional(),
  yearsOfExperience: Joi.number().min(0).max(60).optional(),
  serviceMethods: Joi.array().items(Joi.string().valid(...Object.values(SERVICE_METHOD))).optional(),
  maximumServiceDistance: Joi.number().min(1).max(500).optional(),
  warrantyPolicy: Joi.string().trim().allow('').max(1000).optional(),
  minimumServiceCharge: Joi.number().min(0).optional(),
  languages: Joi.array().items(Joi.string().trim().max(50)).optional(),
  availabilityStatus: Joi.string().valid('available', 'busy', 'unavailable').optional(),
  workingHours: Joi.object().optional(),
  priceRange: Joi.object({
    minimum: Joi.number().min(0).optional(),
    maximum: Joi.number().min(0).optional(),
    currency: Joi.string().default('BDT').optional(),
  }).optional(),
  activeStatus: Joi.boolean().optional(),
});

const updateTechnicianAvailabilitySchema = Joi.object({
  availabilityStatus: Joi.string().valid('available', 'busy', 'unavailable').required(),
});

const addPortfolioSchema = Joi.object({
  title: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().trim().allow('').max(1000).optional(),
  category: Joi.string().pattern(objectIdPattern).allow('').optional(),
  completedAt: Joi.date().optional(),
});

const updateOrganizationProfileSchema = Joi.object({
  organizationName: Joi.string().trim().min(2).max(200).optional(),
  organizationType: Joi.string().valid(...Object.values(ORGANIZATION_TYPES)).optional(),
  description: Joi.string().trim().allow('').max(3000).optional(),
  contactPerson: Joi.object({
    name: Joi.string().trim().allow('').max(100).optional(),
    email: Joi.string().email().allow('').optional(),
    phone: Joi.string().trim().allow('').max(20).optional(),
  }).optional(),
  registrationInformation: Joi.object({
    registrationNumber: Joi.string().allow('').max(100).optional(),
    registeredAt: Joi.string().allow('').max(100).optional(),
    website: Joi.string().uri({ scheme: ['http', 'https'] }).allow('').optional(),
  }).optional(),
  address: Joi.object({
    city: Joi.string().allow('').max(100).optional(),
    area: Joi.string().allow('').max(100).optional(),
    fullAddress: Joi.string().allow('').max(300).optional(),
  }).optional(),
  serviceArea: Joi.object().optional(),
  maximumServiceDistance: Joi.number().min(1).max(500).optional(),
  acceptedItemCategories: Joi.array().items(Joi.string().pattern(objectIdPattern)).optional(),
  neededItemCategories: Joi.array().items(Joi.string().pattern(objectIdPattern)).optional(),
  rejectedCategories: Joi.array().items(Joi.string().pattern(objectIdPattern)).optional(),
  pickupAvailable: Joi.boolean().optional(),
  dropoffAvailable: Joi.boolean().optional(),
  donationInstructions: Joi.string().trim().allow('').max(2000).optional(),
  recyclingInstructions: Joi.string().trim().allow('').max(2000).optional(),
  locations: Joi.array().items(
    Joi.object({
      name: Joi.string().trim().required().max(100),
      address: Joi.string().trim().allow('').max(300).optional(),
      city: Joi.string().trim().allow('').max(100).optional(),
      phone: Joi.string().trim().allow('').max(20).optional(),
      operatingHours: Joi.string().trim().allow('').max(100).optional(),
      pickupSupported: Joi.boolean().default(false).optional(),
      dropoffSupported: Joi.boolean().default(true).optional(),
    })
  ).optional(),
  operatingHours: Joi.object().optional(),
  activeStatus: Joi.boolean().optional(),
});

module.exports = {
  updateUserProfileSchema,
  updatePrivacySchema,
  updateNotificationPreferencesSchema,
  updateTechnicianProfileSchema,
  updateTechnicianAvailabilitySchema,
  addPortfolioSchema,
  updateOrganizationProfileSchema,
};

const dotenv = require('dotenv');
const path = require('path');

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/fixtogether',

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },

  // Client
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  // AI
  ai: {
    provider: process.env.AI_PROVIDER || 'gemini',
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o',
    },
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS, 10) || 30000,
    maxRetries: parseInt(process.env.AI_MAX_RETRIES, 10) || 2,
  },

  // Email
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@fixtogether.com',
  },

  // Maps
  maps: {
    provider: process.env.MAP_PROVIDER || 'openstreetmap',
    geocodingApiKey: process.env.GEOCODING_API_KEY || '',
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit per windowMs
  },
  loginRateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 10,
  },

  // Upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedVideoTypes: ['video/mp4', 'video/webm'],
    maxImages: 10,
    maxVideos: 2,
  },

  // Pagination defaults
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },
};

// Validate required config in production
if (config.env === 'production') {
  const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = config;

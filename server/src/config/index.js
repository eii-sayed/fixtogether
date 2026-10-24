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
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || process.env.ACCESS_TOKEN_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },

  // Client & Admin Web Addresses
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:5174',

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  // Storage Policy & Cloud Enforcement
  storage: {
    provider: process.env.STORAGE_PROVIDER || (process.env.CLOUDINARY_CLOUD_NAME ? 'cloudinary' : 'local'),
    enforceCloudInProduction: process.env.ENFORCE_CLOUD_STORAGE !== 'false',
    allowLocalInProduction: process.env.ALLOW_LOCAL_STORAGE_IN_PRODUCTION === 'true',
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
    from: process.env.EMAIL_FROM
      ? process.env.EMAIL_FROM.replace(/["']/g, '').trim()
      : (process.env.EMAIL_USER ? `FixTogether <${process.env.EMAIL_USER}>` : 'noreply@fixtogether.com'),
  },

  // Maps
  maps: {
    provider: process.env.MAP_PROVIDER || 'openstreetmap',
    geocodingApiKey: process.env.GEOCODING_API_KEY || '',
  },

  // Rate limiting (all configurable via env)
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX, 10) || 300,
  },
  publicRateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX, 10) || 200,
  },
  authReadRateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_READ_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_AUTH_READ_MAX, 10) || 600,
  },
  authRateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 10 : (parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 10),
  },
  writeRateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WRITE_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_WRITE_MAX, 10) || 60,
  },
  publishRateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_PUBLISH_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_PUBLISH_MAX, 10) || 15,
  },
  aiRateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_AI_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_AI_MAX, 10) || 10,
  },
  messageRateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_MESSAGE_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MESSAGE_MAX, 10) || 120,
  },
  uploadRateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX, 10) || 30,
  },
  securityRateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_SECURITY_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_SECURITY_MAX, 10) || 5,
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

  // Web Push (VAPID)
  push: {
    publicKey:
      process.env.VAPID_PUBLIC_KEY ||
      'BCFrryc2ka-eX36FrZPtsoPMPIuOG-xpCBS2MwIvxkfrL4iXHv2t25-XL0puDndZL14ghtuS_NJ4d2uaaTOZ6Gw',
    privateKey:
      process.env.VAPID_PRIVATE_KEY ||
      '1uSXBRkvTyn9j-smUksWcwaJNptcIyetx6sqLkDxBbQ',
    subject: process.env.VAPID_SUBJECT || 'mailto:support@fixtogether.com',
  },
};

// Validate required config in production
if (config.env === 'production') {
  const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Enforce Cloud Storage in production to prevent ephemeral disk file loss
  if (config.storage.enforceCloudInProduction && !config.storage.allowLocalInProduction) {
    const cloudMissing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(
      (key) => !process.env[key]
    );
    if (cloudMissing.length > 0) {
      throw new Error(
        `Production Safety Error: Cloud storage is enforced in production to prevent permanent media loss on ephemeral disks (e.g. Render, Vercel, Docker). Missing: ${cloudMissing.join(', ')}. Set these variables or set ALLOW_LOCAL_STORAGE_IN_PRODUCTION=true to explicitly override.`
      );
    }
  }
}

module.exports = config;

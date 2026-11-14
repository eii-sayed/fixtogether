const dotenv = require('dotenv');
const path = require('path');

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const emailHost = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
const emailProvider = (
  process.env.EMAIL_PROVIDER ||
  (process.env.RESEND_API_KEY
    ? 'resend'
    : process.env.SENDGRID_API_KEY
      ? 'sendgrid'
      : emailHost.toLowerCase().includes('gmail.com')
        ? 'gmail'
        : 'smtp')
).trim().toLowerCase();

const config = {
  // Local development must be explicitly selected; an omitted NODE_ENV stays fail-closed.
  env: (process.env.NODE_ENV || 'production').toLowerCase(),
  port: parseInt(process.env.PORT, 10) || 5000,

  // MongoDB
  mongoUri: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/fixtogether',

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || process.env.AUTH_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || process.env.AUTH_SECRET || 'dev-refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },

  // Client & Admin Web Addresses
  clientUrl: process.env.CLIENT_URL || process.env.NEXTAUTH_URL || 'http://localhost:5173',
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

  // Email / SMTP / Multi-Provider Configuration
  email: {
    provider: emailProvider,
    host: emailHost,
    port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT, 10) || 587,
    user: process.env.EMAIL_USER || process.env.SMTP_USER || '',
    password: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '',
    from: (process.env.EMAIL_FROM || process.env.MAIL_FROM)
      ? (process.env.EMAIL_FROM || process.env.MAIL_FROM).replace(/["']/g, '').trim()
      : (process.env.EMAIL_USER || process.env.SMTP_USER
          ? `FixTogether <${process.env.EMAIL_USER || process.env.SMTP_USER}>`
          : 'FixTogether <noreply@fixtogether.com>'),
    resendApiKey: process.env.RESEND_API_KEY || '',
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  },

  // Maps
  maps: {
    provider: process.env.MAP_PROVIDER || 'openstreetmap',
    geocodingApiKey: process.env.GEOCODING_API_KEY || '',
  },

  // Rate limiting (all configurable via env)
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX || process.env.RATE_LIMIT_MAX, 10) || 300,
  },
  publicRateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || process.env.RATE_LIMIT_MAX, 10) || 200,
  },
  authReadRateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_READ_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_AUTH_READ_MAX, 10) || 600,
  },
  authRateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
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
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:support@fixtogether.com',
  },
};

// Validate required config in production
if (config.env === 'production') {
  const hasMongo = Boolean(process.env.MONGODB_URI || process.env.DATABASE_URL);
  const accessSecret = process.env.JWT_ACCESS_SECRET || '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';
  const hasAccessSecret = Boolean(accessSecret);
  const hasRefreshSecret = Boolean(refreshSecret);

  const missing = [];
  const hasVapidPublicKey = Boolean(process.env.VAPID_PUBLIC_KEY);
  const hasVapidPrivateKey = Boolean(process.env.VAPID_PRIVATE_KEY);
  if (hasVapidPublicKey !== hasVapidPrivateKey) {
    throw new Error('Production Safety Error: Set both VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY, or leave both unset to disable web push.');
  }

  if (!hasMongo) missing.push('MONGODB_URI or DATABASE_URL');
  if (!hasAccessSecret) missing.push('JWT_ACCESS_SECRET');
  if (!hasRefreshSecret) missing.push('JWT_REFRESH_SECRET');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const looksLikeSecretPlaceholder = (value) => /^(replace-with|your[_-]|generate-|change[-_ ]?me|placeholder)/i.test(value);
  if ([accessSecret, refreshSecret].some((secret) => secret.length < 32 || looksLikeSecretPlaceholder(secret))) {
    throw new Error('Production Safety Error: Set unique random JWT_ACCESS_SECRET and JWT_REFRESH_SECRET values, each at least 32 characters long.');
  }
  if (accessSecret === refreshSecret) {
    throw new Error('Production Safety Error: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
  }

  const configuredAiProvider = config.ai.provider.toLowerCase();
  if (configuredAiProvider === 'mock') {
    throw new Error('Production Safety Error: AI_PROVIDER=mock is only allowed outside production.');
  }
  if (['gemini', 'google'].includes(configuredAiProvider) &&
      (!config.ai.gemini.apiKey || looksLikeSecretPlaceholder(config.ai.gemini.apiKey))) {
    throw new Error('Production Safety Error: GEMINI_API_KEY is required for the configured AI provider.');
  }
  if (configuredAiProvider === 'openai' &&
      (!config.ai.openai.apiKey || looksLikeSecretPlaceholder(config.ai.openai.apiKey))) {
    throw new Error('Production Safety Error: OPENAI_API_KEY is required for the configured AI provider.');
  }
  if (!['gemini', 'google', 'openai'].includes(configuredAiProvider)) {
    throw new Error(`Production Safety Error: Unsupported AI_PROVIDER "${config.ai.provider}".`);
  }

  const emailProviderCredentials = {
    resend: [process.env.RESEND_API_KEY],
    sendgrid: [process.env.SENDGRID_API_KEY],
    gmail: [config.email.user, config.email.password],
    smtp: [config.email.user, config.email.password],
  }[config.email.provider];
  if (!emailProviderCredentials || emailProviderCredentials.some((credential) =>
    !credential || looksLikeSecretPlaceholder(credential))) {
    throw new Error(`Production Safety Error: Provide valid credentials for EMAIL_PROVIDER=${config.email.provider}.`);
  }

  // Enforce Cloud Storage in production to prevent ephemeral disk file loss
  if (config.storage.enforceCloudInProduction && !config.storage.allowLocalInProduction) {
    const cloudMissing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(
      (key) => !process.env[key] || looksLikeSecretPlaceholder(process.env[key])
    );
    if (cloudMissing.length > 0) {
      throw new Error(
        `Production Safety Error: Cloud storage is enforced in production to prevent permanent media loss on ephemeral disks (e.g. Render, Vercel, Docker). Missing: ${cloudMissing.join(', ')}. Set these variables or set ALLOW_LOCAL_STORAGE_IN_PRODUCTION=true to explicitly override.`
      );
    }
  }
}

module.exports = config;

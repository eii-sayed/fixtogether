const config = require('../config');

const normalizeOrigin = (value) => {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const configuredOrigins = [
  config.clientUrl,
  config.adminUrl,
  'https://fixtogether.vercel.app',
  'https://fixtogether-admin.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  ...(process.env.CORS_ALLOWED_ORIGINS || '').split(','),
];

const allowedOrigins = new Set(configuredOrigins.map(normalizeOrigin).filter(Boolean));

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = normalizeOrigin(origin);
  return Boolean(normalizedOrigin && allowedOrigins.has(normalizedOrigin));
};

module.exports = { isOriginAllowed, normalizeOrigin };

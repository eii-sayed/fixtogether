const config = require('../config');
const logger = require('../utils/logger');

let redisClient = null;
let connecting = null;

const getRedisClient = async () => {
  if (redisClient?.isOpen) return redisClient;
  if (connecting) return connecting;

  const { createClient } = require('redis');
  redisClient = createClient({ url: config.rateLimitStore.redisUrl });
  redisClient.on('error', (error) => logger.error(`Rate-limit Redis error: ${error.message}`));
  connecting = redisClient.connect()
    .then(() => redisClient)
    .finally(() => { connecting = null; });
  return connecting;
};

/**
 * Returns a separate, prefixed Redis store for each limiter. The default
 * in-memory store remains useful for local single-instance development.
 */
const createRateLimitStore = (name) => {
  if (config.rateLimitStore.provider !== 'redis') return undefined;

  const { RedisStore } = require('rate-limit-redis');
  return new RedisStore({
    prefix: `fixtogether:rate-limit:${name}:`,
    sendCommand: async (...args) => (await getRedisClient()).sendCommand(args),
  });
};

module.exports = { createRateLimitStore };

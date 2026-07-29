const winston = require('winston');
const config = require('../config');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  config.env === 'development'
    ? winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          return `${timestamp} [${level}]: ${stack || message}`;
        })
      )
    : winston.format.json()
);

const transports = [new winston.transports.Console()];

// Add file transport in production
if (config.env === 'production') {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

const logger = winston.createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
});

module.exports = logger;

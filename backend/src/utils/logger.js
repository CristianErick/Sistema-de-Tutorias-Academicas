const winston = require('winston');
const fs = require('fs');
const path = require('path');

const transports = [new winston.transports.Console()];

try {
  const logDir = path.resolve(__dirname, '..', '..', 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  transports.push(
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
  );
} catch {
  // readonly filesystem (e.g. Vercel) — skip file logging
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.printf(({ timestamp, level, message, stack }) =>
          `${timestamp} [${level.toUpperCase()}] ${message}${stack ? '\n' + stack : ''}`)
  ),
  transports,
});

module.exports = logger;

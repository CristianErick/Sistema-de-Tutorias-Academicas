const logger = require('./logger');

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      logger.error(`${req.method} ${req.originalUrl}`, err);
      next(err);
    });
  };
}

module.exports = asyncHandler;

const { error } = require('./response');

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
      error(res, 'Error interno del servidor', 500);
    });
  };
}

module.exports = asyncHandler;

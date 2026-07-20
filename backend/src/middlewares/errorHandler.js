const logger = require('../utils/logger');
const { error } = require('../utils/response');

function errorHandler(err, req, res, _next) {
  logger.error(`${req.method} ${req.originalUrl}`, err);

  if (err.type === 'entity.parse.failed') {
    return error(res, 'JSON inválido en el cuerpo de la petición', 400);
  }

  if (err.code === '23505') {
    const campo = err.constraint
      ? err.constraint.replace(/.*_(\w+)_key/, '$1')
      : 'campo';
    return error(res, `El ${campo} ya está registrado`, 409);
  }

  if (err.code === '23503') {
    return error(res, 'El registro tiene dependencias y no puede eliminarse', 409);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return error(res, 'Token inválido o expirado', 401);
  }

  return error(res, 'Error interno del servidor', 500);
}

module.exports = errorHandler;

const jwt = require('jsonwebtoken');

/**
 * Middleware que verifica la autenticidad del token JWT enviado
 * en la cabecera HTTP "Authorization" bajo el esquema "Bearer <token>".
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function verificarTokenJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Cabecera Authorization requerida' });
  }

  const partes = authHeader.split(' ');

  if (partes.length !== 2 || partes[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato esperado: Bearer <token>' });
  }

  const token = partes[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (err) {
    const mensaje =
      err.name === 'TokenExpiredError'
        ? 'Token expirado'
        : 'Token inválido';
    return res.status(401).json({ error: mensaje });
  }
}

module.exports = verificarTokenJWT;

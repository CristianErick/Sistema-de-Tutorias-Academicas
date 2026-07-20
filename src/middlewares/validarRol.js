/**
 * Factory de middleware que permite únicamente el acceso a usuarios
 * cuyo rol esté incluido en el arreglo `rolesPermitidos`.
 *
 * @param {string[]} rolesPermitidos - Ej: ['Docente', 'Admin']
 * @returns {import('express').RequestHandler}
 */
function validarRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = validarRol;

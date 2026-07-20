const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { success, error } = require('../utils/response');

async function login(req, res) {
  const { correo, contrasena } = req.body;

  const { rows } = await pool.query(
    'SELECT id_usuario, nombre_completo, correo, contrasena, rol FROM usuarios WHERE correo = $1',
    [correo]
  );

  if (rows.length === 0) {
    return error(res, 'Credenciales inválidas', 401);
  }

  const usuario = rows[0];
  const coincide = await bcrypt.compare(contrasena, usuario.contrasena);

  if (!coincide) {
    return error(res, 'Credenciales inválidas', 401);
  }

  const payload = {
    id_usuario: usuario.id_usuario,
    correo: usuario.correo,
    rol: usuario.rol,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

  return success(res, {
    token,
    usuario: {
      id_usuario: usuario.id_usuario,
      nombre_completo: usuario.nombre_completo,
      correo: usuario.correo,
      rol: usuario.rol,
    },
  });
}

async function perfil(req, res) {
  const { rows } = await pool.query(
    'SELECT id_usuario, nombre_completo, correo, rol FROM usuarios WHERE id_usuario = $1',
    [req.usuario.id_usuario]
  );

  if (rows.length === 0) {
    return error(res, 'Usuario no encontrado', 404);
  }

  return success(res, rows[0]);
}

module.exports = { login, perfil };

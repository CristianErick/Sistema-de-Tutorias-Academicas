const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { success, error } = require('../utils/response');

const intentosFallidos = new Map();
const MAX_INTENTOS = 5;
const TIEMPO_BLOQUEO = 15 * 60 * 1000;

async function login(req, res) {
  const { correo, contrasena } = req.body;

  const bloqueo = intentosFallidos.get(correo);
  if (bloqueo && bloqueo.count >= MAX_INTENTOS) {
    if (Date.now() - bloqueo.time < TIEMPO_BLOQUEO) {
      const restante = Math.ceil((TIEMPO_BLOQUEO - (Date.now() - bloqueo.time)) / 60000);
      return error(res, `Cuenta bloqueada. Intente de nuevo en ${restante} minuto(s).`, 429);
    }
    intentosFallidos.delete(correo);
  }

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
    const prev = intentosFallidos.get(correo) || { count: 0, time: Date.now() };
    prev.count += 1;
    prev.time = Date.now();
    intentosFallidos.set(correo, prev);
    return error(res, 'Credenciales inválidas', 401);
  }

  intentosFallidos.delete(correo);

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

async function olvideContrasena(req, res) {
  const { correo } = req.body;

  const { rows } = await pool.query(
    'SELECT id_usuario, nombre_completo FROM usuarios WHERE correo = $1',
    [correo]
  );

  if (rows.length === 0) {
    return success(res, { mensaje: 'Si el correo existe, recibirás un enlace de recuperación' });
  }

  const resetToken = jwt.sign(
    { id_usuario: rows[0].id_usuario, proposito: 'reset-password' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  // En producción aquí se enviaría un email
  // Ej: sendEmail(correo, `Tu token: ${resetToken}`)

  return success(res, {
    mensaje: 'Si el correo existe, recibirás un enlace de recuperación',
    reset_token: resetToken,
  });
}

async function restablecerContrasena(req, res) {
  const { token, contrasena } = req.body;

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return error(res, 'Token inválido o expirado', 401);
  }

  if (payload.proposito !== 'reset-password') {
    return error(res, 'Token inválido', 401);
  }

  const hash = await bcrypt.hash(contrasena, 10);

  const { rowCount } = await pool.query(
    'UPDATE usuarios SET contrasena = $1 WHERE id_usuario = $2',
    [hash, payload.id_usuario]
  );

  if (rowCount === 0) {
    return error(res, 'Usuario no encontrado', 404);
  }

  return success(res, { mensaje: 'Contraseña restablecida exitosamente' });
}

async function actualizarPerfil(req, res) {
  const { nombre_completo, contrasena } = req.body;

  const campos = [];
  const valores = [];
  let idx = 1;

  if (nombre_completo !== undefined) {
    campos.push(`nombre_completo = $${idx++}`);
    valores.push(nombre_completo);
  }
  if (contrasena !== undefined) {
    const hash = await bcrypt.hash(contrasena, 10);
    campos.push(`contrasena = $${idx++}`);
    valores.push(hash);
  }

  if (campos.length === 0) {
    return error(res, 'Debe enviar al menos nombre_completo o contrasena', 400);
  }

  valores.push(req.usuario.id_usuario);
  const query = `UPDATE usuarios SET ${campos.join(', ')} WHERE id_usuario = $${idx}
                 RETURNING id_usuario, nombre_completo, correo, rol`;

  const { rows } = await pool.query(query, valores);

  if (rows.length === 0) {
    return error(res, 'Usuario no encontrado', 404);
  }

  return success(res, rows[0]);
}

module.exports = { login, perfil, olvideContrasena, restablecerContrasena, actualizarPerfil };

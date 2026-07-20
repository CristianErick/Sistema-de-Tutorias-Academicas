const bcrypt = require('bcrypt');
const pool = require('../config/database');
const { success, error } = require('../utils/response');
const { paginate, paginatedResult } = require('../utils/pagination');

async function listarUsuarios(req, res) {
  const { page, limit, offset } = paginate(req);

  const { rows: countResult } = await pool.query('SELECT COUNT(*) AS total FROM usuarios');
  const total = countResult[0].total;

  const { rows } = await pool.query(
    'SELECT id_usuario, nombre_completo, correo, rol FROM usuarios ORDER BY id_usuario LIMIT $1 OFFSET $2',
    [limit, offset]
  );

  const result = paginatedResult(rows, total, page, limit);
  return res.status(200).json({ success: true, data: result.rows, pagination: result.pagination });
}

async function obtenerUsuario(req, res) {
  const { id } = req.params;

  const { rows } = await pool.query(
    'SELECT id_usuario, nombre_completo, correo, rol FROM usuarios WHERE id_usuario = $1',
    [id]
  );

  if (rows.length === 0) {
    return error(res, 'Usuario no encontrado', 404);
  }

  return success(res, rows[0]);
}

async function crearUsuario(req, res) {
  const { nombre_completo, correo, contrasena, rol } = req.body;
  const hash = await bcrypt.hash(contrasena, 10);

  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre_completo, correo, contrasena, rol)
     VALUES ($1, $2, $3, $4)
     RETURNING id_usuario, nombre_completo, correo, rol`,
    [nombre_completo, correo, hash, rol]
  );

  return success(res, rows[0], 201);
}

async function actualizarUsuario(req, res) {
  const { id } = req.params;
  const { nombre_completo, correo, contrasena, rol } = req.body;

  const campos = [];
  const valores = [];
  let idx = 1;

  if (nombre_completo !== undefined) {
    campos.push(`nombre_completo = $${idx++}`);
    valores.push(nombre_completo);
  }
  if (correo !== undefined) {
    campos.push(`correo = $${idx++}`);
    valores.push(correo);
  }
  if (contrasena !== undefined) {
    const hash = await bcrypt.hash(contrasena, 10);
    campos.push(`contrasena = $${idx++}`);
    valores.push(hash);
  }
  if (rol !== undefined) {
    campos.push(`rol = $${idx++}`);
    valores.push(rol);
  }

  valores.push(id);
  const query = `UPDATE usuarios SET ${campos.join(', ')} WHERE id_usuario = $${idx}
                 RETURNING id_usuario, nombre_completo, correo, rol`;

  const { rows } = await pool.query(query, valores);

  if (rows.length === 0) {
    return error(res, 'Usuario no encontrado', 404);
  }

  return success(res, rows[0]);
}

async function eliminarUsuario(req, res) {
  const { id } = req.params;

  const { rows } = await pool.query(
    'DELETE FROM usuarios WHERE id_usuario = $1 RETURNING id_usuario',
    [id]
  );

  if (rows.length === 0) {
    return error(res, 'Usuario no encontrado', 404);
  }

  return success(res, { mensaje: 'Usuario eliminado exitosamente' });
}

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
};

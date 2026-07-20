const pool = require('../config/database');
const { success, error } = require('../utils/response');
const { paginate, paginatedResult } = require('../utils/pagination');

async function listarTutorias(req, res) {
  const { page, limit, offset } = paginate(req);

  const countParams = [];
  let countQuery = 'SELECT COUNT(*) AS total FROM tutorias t';
  let whereClause = '';

  if (req.query.docente) {
    countParams.push(req.query.docente);
    whereClause = ' WHERE t.id_docente = $1';
    countQuery += whereClause;
  }

  const { rows: countResult } = await pool.query(countQuery, countParams);
  const total = countResult[0].total;

  const dataParams = [...countParams];
  let dataQuery = `
    SELECT t.*, u.nombre_completo AS docente_nombre
    FROM tutorias t
    JOIN usuarios u ON t.id_docente = u.id_usuario
  `;

  if (whereClause) {
    dataQuery += whereClause;
  }

  const paramIdx = countParams.length + 1;
  dataQuery += ` ORDER BY t.fecha_hora_inicio LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
  dataParams.push(limit, offset);

  const { rows } = await pool.query(dataQuery, dataParams);

  const result = paginatedResult(rows, total, page, limit);
  return res.status(200).json({ success: true, data: result.rows, pagination: result.pagination });
}

async function obtenerTutoria(req, res) {
  const { id } = req.params;

  const { rows } = await pool.query(
    `SELECT t.*, u.nombre_completo AS docente_nombre
     FROM tutorias t
     JOIN usuarios u ON t.id_docente = u.id_usuario
     WHERE t.id_tutoria = $1`,
    [id]
  );

  if (rows.length === 0) {
    return error(res, 'Tutoría no encontrada', 404);
  }

  return success(res, rows[0]);
}

async function crearTutoria(req, res) {
  const { tema, fecha_hora_inicio } = req.body;

  const idDocente = (req.usuario.rol === 'Admin' && req.body.id_docente)
    ? req.body.id_docente
    : req.usuario.id_usuario;

  const { rows } = await pool.query(
    `INSERT INTO tutorias (id_docente, tema, fecha_hora_inicio, estado)
     VALUES ($1, $2, $3, 'Disponible')
     RETURNING *`,
    [idDocente, tema, fecha_hora_inicio]
  );

  return success(res, rows[0], 201);
}

async function actualizarTutoria(req, res) {
  const { id } = req.params;
  const { tema, fecha_hora_inicio, estado } = req.body;

  const { rows: existente } = await pool.query(
    'SELECT * FROM tutorias WHERE id_tutoria = $1', [id]
  );

  if (existente.length === 0) {
    return error(res, 'Tutoría no encontrada', 404);
  }

  if (req.usuario.rol !== 'Admin' && existente[0].id_docente !== req.usuario.id_usuario) {
    return error(res, 'No puedes modificar una tutoría que no te pertenece', 403);
  }

  if (existente[0].estado === 'Ocupado' && req.usuario.rol !== 'Admin') {
    return error(res, 'No puedes modificar una tutoría con reservas activas', 409);
  }

  const campos = [];
  const valores = [];
  let idx = 1;

  if (tema !== undefined) { campos.push(`tema = $${idx++}`); valores.push(tema); }
  if (fecha_hora_inicio !== undefined) { campos.push(`fecha_hora_inicio = $${idx++}`); valores.push(fecha_hora_inicio); }
  if (estado !== undefined) { campos.push(`estado = $${idx++}`); valores.push(estado); }

  valores.push(id);
  const query = `UPDATE tutorias SET ${campos.join(', ')} WHERE id_tutoria = $${idx} RETURNING *`;
  const { rows } = await pool.query(query, valores);

  return success(res, rows[0]);
}

async function eliminarTutoria(req, res) {
  const { id } = req.params;

  const { rows: existente } = await pool.query(
    'SELECT * FROM tutorias WHERE id_tutoria = $1', [id]
  );

  if (existente.length === 0) {
    return error(res, 'Tutoría no encontrada', 404);
  }

  if (req.usuario.rol !== 'Admin' && existente[0].id_docente !== req.usuario.id_usuario) {
    return error(res, 'No puedes eliminar una tutoría que no te pertenece', 403);
  }

  if (existente[0].estado === 'Ocupado') {
    return error(res, 'No puedes eliminar una tutoría con reservas activas', 409);
  }

  await pool.query('DELETE FROM tutorias WHERE id_tutoria = $1', [id]);
  return success(res, { mensaje: 'Tutoría eliminada exitosamente' });
}

module.exports = {
  listarTutorias,
  obtenerTutoria,
  crearTutoria,
  actualizarTutoria,
  eliminarTutoria,
};

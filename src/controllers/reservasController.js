const pool = require('../config/database');
const { success, error } = require('../utils/response');
const { paginate, paginatedResult } = require('../utils/pagination');
const { notifyDocente, notifyEstudiante } = require('../websocket/handler');

async function crearReserva(req, res) {
  const { id_tutoria, id_estudiante } = req.body;

  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');

    const { rows: tutoriaRows } = await cliente.query(
      `SELECT id_docente, tema, fecha_hora_inicio, estado FROM tutorias
       WHERE id_tutoria = $1 FOR UPDATE`,
      [id_tutoria]
    );

    if (tutoriaRows.length === 0) {
      await cliente.query('ROLLBACK');
      return error(res, 'La tutoría no existe', 404);
    }

    const tutoria = tutoriaRows[0];

    if (tutoria.estado === 'Ocupado') {
      await cliente.query('ROLLBACK');
      return error(res, 'La tutoría ya está ocupada', 409);
    }

    const { rows: conflictos } = await cliente.query(
      `SELECT 1 FROM reservas r
       JOIN tutorias t ON r.id_tutoria = t.id_tutoria
       WHERE r.id_estudiante = $1
         AND t.fecha_hora_inicio = $2
         AND r.estado_asistencia != 'Falto'
       LIMIT 1`,
      [id_estudiante, tutoria.fecha_hora_inicio]
    );

    if (conflictos.length > 0) {
      await cliente.query('ROLLBACK');
      return error(res, 'El estudiante ya tiene una tutoría agendada en esa fecha y hora', 409);
    }

    const { rows: activas } = await cliente.query(
      `SELECT COUNT(*) AS total FROM reservas
       WHERE id_estudiante = $1 AND estado_asistencia = 'Pendiente'`,
      [id_estudiante]
    );

    if (parseInt(activas[0].total, 10) >= 3) {
      await cliente.query('ROLLBACK');
      return error(res, 'Límite alcanzado: máximo 3 tutorías activas simultáneamente', 409);
    }

    await cliente.query(
      `INSERT INTO reservas (id_tutoria, id_estudiante) VALUES ($1, $2)`,
      [id_tutoria, id_estudiante]
    );

    await cliente.query(
      `UPDATE tutorias SET estado = 'Ocupado' WHERE id_tutoria = $1`,
      [id_tutoria]
    );

    await cliente.query('COMMIT');

    notifyDocente(tutoria.id_docente, 'nueva-reserva', {
      mensaje: `Nueva reserva para "${tutoria.tema}"`,
      id_tutoria,
      id_estudiante,
      fecha: tutoria.fecha_hora_inicio,
    });

    return success(res, { mensaje: 'Reserva creada exitosamente' }, 201);
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}

async function listarReservas(req, res) {
  const usuario = req.usuario;
  const { page, limit, offset } = paginate(req);

  const selectFrom = `
    FROM reservas r
    JOIN tutorias t ON r.id_tutoria = t.id_tutoria
    JOIN usuarios ue ON r.id_estudiante = ue.id_usuario
    JOIN usuarios ud ON t.id_docente = ud.id_usuario
  `;

  let whereClause = '';
  const params = [];

  if (usuario.rol === 'Docente') {
    whereClause = 'WHERE t.id_docente = $1';
    params.push(usuario.id_usuario);
  } else if (usuario.rol === 'Estudiante') {
    whereClause = 'WHERE r.id_estudiante = $1';
    params.push(usuario.id_usuario);
  }

  const { rows: countResult } = await pool.query(
    `SELECT COUNT(*) AS total ${selectFrom} ${whereClause}`, params
  );
  const total = countResult[0].total;

  const paramIdx = params.length + 1;
  const dataParams = [...params, limit, offset];
  const query = `
    SELECT r.*, t.tema, t.fecha_hora_inicio,
           ue.nombre_completo AS estudiante_nombre,
           ud.nombre_completo AS docente_nombre
    ${selectFrom}
    ${whereClause}
    ORDER BY r.fecha_registro DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const { rows } = await pool.query(query, dataParams);
  const result = paginatedResult(rows, total, page, limit);
  return res.status(200).json({ success: true, data: result.rows, pagination: result.pagination });
}

async function marcarAsistencia(req, res) {
  const { id } = req.params;
  const { estado_asistencia } = req.body;

  const { rows: reserva } = await pool.query(
    `SELECT r.*, t.id_docente FROM reservas r
     JOIN tutorias t ON r.id_tutoria = t.id_tutoria
     WHERE r.id_reserva = $1`,
    [id]
  );

  if (reserva.length === 0) {
    return error(res, 'Reserva no encontrada', 404);
  }

  if (req.usuario.rol !== 'Admin' && reserva[0].id_docente !== req.usuario.id_usuario) {
    return error(res, 'No puedes modificar una reserva que no pertenece a tus tutorías', 403);
  }

  const { rows } = await pool.query(
    `UPDATE reservas SET estado_asistencia = $1 WHERE id_reserva = $2 RETURNING *`,
    [estado_asistencia, id]
  );

  const estadoLabel = { Pendiente: 'Pendiente', Asistio: 'Asistió', Falto: 'Faltó' };
  notifyEstudiante(reserva[0].id_estudiante, 'asistencia-actualizada', {
    mensaje: `Tu asistencia fue marcada como "${estadoLabel[estado_asistencia]}"`,
    id_reserva: id,
    estado_asistencia,
  });

  return success(res, rows[0]);
}

async function cancelarReserva(req, res) {
  const { id } = req.params;

  const { rows: reserva } = await pool.query(
    `SELECT r.*, t.id_docente, t.id_tutoria FROM reservas r
     JOIN tutorias t ON r.id_tutoria = t.id_tutoria
     WHERE r.id_reserva = $1`,
    [id]
  );

  if (reserva.length === 0) {
    return error(res, 'Reserva no encontrada', 404);
  }

  if (
    req.usuario.rol !== 'Admin' &&
    reserva[0].id_estudiante !== req.usuario.id_usuario
  ) {
    return error(res, 'No puedes cancelar una reserva que no te pertenece', 403);
  }

  if (reserva[0].estado_asistencia !== 'Pendiente') {
    return error(res, 'Solo se pueden cancelar reservas en estado Pendiente', 409);
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    await cliente.query(
      `UPDATE reservas SET estado_asistencia = 'Falto' WHERE id_reserva = $1`,
      [id]
    );

    await cliente.query(
      `UPDATE tutorias SET estado = 'Disponible' WHERE id_tutoria = $1`,
      [reserva[0].id_tutoria]
    );

    await cliente.query('COMMIT');

    notifyDocente(reserva[0].id_docente, 'reserva-cancelada', {
      mensaje: `Un estudiante canceló su reserva`,
      id_reserva: id,
    });

    return success(res, { mensaje: 'Reserva cancelada exitosamente' });
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}

module.exports = { crearReserva, listarReservas, marcarAsistencia, cancelarReserva };

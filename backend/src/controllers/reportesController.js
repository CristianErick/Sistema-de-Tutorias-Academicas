const pool = require('../config/database');
const { success } = require('../utils/response');

async function resumen(req, res) {
  const { rows: totales } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM tutorias) AS total_tutorias,
      (SELECT COUNT(*) FROM reservas) AS total_reservas,
      (SELECT COUNT(*) FROM usuarios) AS total_usuarios,
      (SELECT COUNT(*) FROM usuarios WHERE rol = 'Estudiante') AS total_estudiantes,
      (SELECT COUNT(*) FROM usuarios WHERE rol = 'Docente') AS total_docentes
  `);

  const { rows: asistencia } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE estado_asistencia = 'Asistio') AS asistieron,
      COUNT(*) FILTER (WHERE estado_asistencia = 'Falto') AS faltaron,
      COUNT(*) FILTER (WHERE estado_asistencia = 'Pendiente') AS pendientes
    FROM reservas
  `);

  const totalAsistencia = parseInt(asistencia[0].asistieron, 10) + parseInt(asistencia[0].faltaron, 10);
  const porcentajeAsistencia = totalAsistencia > 0
    ? Math.round((parseInt(asistencia[0].asistieron, 10) / totalAsistencia) * 100)
    : 0;

  return success(res, {
    totales: totales[0],
    asistencia: {
      ...asistencia[0],
      porcentaje_asistencia: porcentajeAsistencia,
    },
  });
}

async function tutoriasMasReservadas(req, res) {
  const { rows } = await pool.query(`
    SELECT
      t.id_tutoria,
      t.tema,
      u.nombre_completo AS docente_nombre,
      COUNT(r.id_reserva) AS total_reservas,
      COUNT(*) FILTER (WHERE r.estado_asistencia = 'Asistio') AS asistieron,
      COUNT(*) FILTER (WHERE r.estado_asistencia = 'Falto') AS faltaron
    FROM tutorias t
    JOIN usuarios u ON t.id_docente = u.id_usuario
    LEFT JOIN reservas r ON r.id_tutoria = t.id_tutoria
    GROUP BY t.id_tutoria, t.tema, u.nombre_completo
    ORDER BY total_reservas DESC
    LIMIT 10
  `);

  return success(res, rows);
}

async function tutoriasPorDocente(req, res) {
  const { rows } = await pool.query(`
    SELECT
      u.id_usuario,
      u.nombre_completo,
      COUNT(t.id_tutoria) AS total_tutorias,
      COUNT(r.id_reserva) AS total_reservas,
      COUNT(*) FILTER (WHERE r.estado_asistencia = 'Asistio') AS asistieron
    FROM usuarios u
    LEFT JOIN tutorias t ON t.id_docente = u.id_usuario
    LEFT JOIN reservas r ON r.id_tutoria = t.id_tutoria
    WHERE u.rol = 'Docente'
    GROUP BY u.id_usuario, u.nombre_completo
    ORDER BY total_reservas DESC
  `);

  return success(res, rows);
}

module.exports = { resumen, tutoriasMasReservadas, tutoriasPorDocente };

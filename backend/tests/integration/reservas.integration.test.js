const request = require('supertest');
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const TEST_DB_URL = process.env.DATABASE_URL_TEST;
const integrationActivo = !!TEST_DB_URL;

let pool;
let app;
let tokenEstudiante;
let tokenDocente;
let testData;

beforeAll(async () => {
  if (!integrationActivo) return;

  pool = new Pool({ connectionString: TEST_DB_URL, max: 1 });

  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.warn(`  ⚠ No se pudo conectar a la base de test: ${err.message}`);
    await pool.end();
    return;
  }

  app = express();
  app.use(compression());
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/reservas', require('../../src/routes/reservasRoutes'));
  app.use(require('../../src/middlewares/errorHandler'));

  const { rows } = await pool.query('SELECT current_database() AS db');
  console.log(`  Conectado a base de test: ${rows[0].db}`);
});

afterAll(async () => {
  if (!pool) return;
  try { await limpiarDatos(); } catch {}
  await pool.end();
});

beforeEach(async () => {
  if (!integrationActivo || !pool) return;
  try { await limpiarDatos(); } catch {}
  testData = await sembrarDatos();

  tokenEstudiante = jwt.sign(
    { id_usuario: testData.estudiante.id_usuario, correo: testData.estudiante.correo, rol: 'Estudiante' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  tokenDocente = jwt.sign(
    { id_usuario: testData.docente.id_usuario, correo: testData.docente.correo, rol: 'Docente' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
});

async function sembrarDatos() {
  const docente = (await pool.query(
    `INSERT INTO usuarios (nombre_completo, correo, contrasena, rol)
     VALUES ('Docente Test', 'docente.integration@test.com', '$2b$10$dummyhash', 'Docente')
     RETURNING id_usuario, correo`
  )).rows[0];

  const estudiante = (await pool.query(
    `INSERT INTO usuarios (nombre_completo, correo, contrasena, rol)
     VALUES ('Estudiante Test', 'estudiante.integration@test.com', '$2b$10$dummyhash', 'Estudiante')
     RETURNING id_usuario, correo`
  )).rows[0];

  const tutoria = (await pool.query(
    `INSERT INTO tutorias (id_docente, tema, descripcion, fecha_hora_inicio, duracion_minutos, estado)
     VALUES ($1, 'Integración', 'Test de integración',
             NOW() + interval '1 day', 60, 'Disponible')
     RETURNING id_tutoria, fecha_hora_inicio`,
    [docente.id_usuario]
  )).rows[0];

  const tutoriaOcupada = (await pool.query(
    `INSERT INTO tutorias (id_docente, tema, descripcion, fecha_hora_inicio, duracion_minutos, estado)
     VALUES ($1, 'Ocupada', 'Tutoría ya reservada',
             NOW() + interval '2 days', 60, 'Ocupado')
     RETURNING id_tutoria`,
    [docente.id_usuario]
  )).rows[0];

  return { docente, estudiante, tutoria, tutoriaOcupada };
}

async function limpiarDatos() {
  await pool.query('DELETE FROM reservas WHERE id_reserva > 0');
  await pool.query('DELETE FROM tutorias WHERE id_tutoria > 0');
  await pool.query(`DELETE FROM usuarios WHERE correo LIKE '%.integration@test.com'`);
}

(integrationActivo ? describe : describe.skip)('Integración — POST /api/reservas', () => {
  it('devuelve 201 cuando la tutoría está disponible y sin conflictos', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenEstudiante}`)
      .send({ id_tutoria: testData.tutoria.id_tutoria, id_usuario: testData.estudiante.id_usuario });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mensaje).toMatch(/Reserva creada/i);

    const { rows } = await pool.query(
      'SELECT estado FROM tutorias WHERE id_tutoria = $1',
      [testData.tutoria.id_tutoria]
    );
    expect(rows[0].estado).toBe('Ocupado');
  });

  it('devuelve 409 cuando la tutoría ya está ocupada', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenEstudiante}`)
      .send({ id_tutoria: testData.tutoriaOcupada.id_tutoria, id_usuario: testData.estudiante.id_usuario });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/ocupada/i);
  });

  it('devuelve 400 cuando falta id_tutoria en el cuerpo', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenEstudiante}`)
      .send({ id_usuario: testData.estudiante.id_usuario });

    expect(res.status).toBe(400);
  });

  it('devuelve 401 cuando no se envía token', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .send({ id_tutoria: 1, id_usuario: 1 });

    expect(res.status).toBe(401);
  });
});

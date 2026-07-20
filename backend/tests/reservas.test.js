const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const mockPoolQuery = jest.fn();
const mockPoolConnect = jest.fn();
const mockClientQuery = jest.fn();
const mockClientRelease = jest.fn();
mockPoolConnect.mockResolvedValue({
  query: mockClientQuery,
  release: mockClientRelease,
});

jest.mock('pg', () => ({
  Pool: class {
    constructor(config) { this.config = config; this.query = mockPoolQuery; this.connect = mockPoolConnect; }
    on() {}
  },
}));

const errorHandler = require('../src/middlewares/errorHandler');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/reservas', require('../src/routes/reservasRoutes'));
  app.use(errorHandler);
  return app;
}

let tokenDocente;
let tokenEstudiante;
let tokenAdmin;

beforeAll(() => {
  tokenAdmin = jwt.sign(
    { id_usuario: 1, correo: 'admin@test.com', rol: 'Admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  tokenDocente = jwt.sign(
    { id_usuario: 2, correo: 'docente@test.com', rol: 'Docente' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  tokenEstudiante = jwt.sign(
    { id_usuario: 3, correo: 'estudiante@test.com', rol: 'Estudiante' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
});

describe('CP-02: Reserva — POST /api/reservas (crear reserva)', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockPoolConnect.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();

    mockPoolConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });
  });

  it('CP-02.1: crear reserva exitosamente (201)', async () => {
    mockClientQuery
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({
        rows: [{ id_docente: 2, tema: 'Matemáticas', fecha_hora_inicio: '2026-07-21T10:00:00Z', estado: 'Disponible' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockResolvedValueOnce();

    const app = buildApp();
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenEstudiante}`)
      .send({ id_tutoria: 1, id_usuario: 3 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mensaje).toMatch(/Reserva creada/i);
  });

  it('CP-02.2: rechazar reserva si tutoría no existe (404)', async () => {
    mockClientQuery
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({ rows: [] });

    const app = buildApp();
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenEstudiante}`)
      .send({ id_tutoria: 999, id_usuario: 3 });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no existe/i);
  });

  it('CP-02.3: rechazar reserva si tutoría ya está ocupada (409)', async () => {
    mockClientQuery
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({
        rows: [{ id_docente: 2, tema: 'Física', fecha_hora_inicio: '2026-07-21T12:00:00Z', estado: 'Ocupado' }],
      });

    const app = buildApp();
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenEstudiante}`)
      .send({ id_tutoria: 1, id_usuario: 3 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ocupada/i);
  });

  it('CP-02.4: rechazar reserva si hay conflicto horario (409)', async () => {
    mockClientQuery
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({
        rows: [{ id_docente: 2, tema: 'Química', fecha_hora_inicio: '2026-07-21T10:00:00Z', estado: 'Disponible' }],
      })
      .mockResolvedValueOnce({ rows: [{ existe: 1 }] });

    const app = buildApp();
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenEstudiante}`)
      .send({ id_tutoria: 1, id_usuario: 3 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ya tiene una tutoría/i);
  });

  it('CP-02.5: rechazar reserva si ya tiene 3 activas (409)', async () => {
    mockClientQuery
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({
        rows: [{ id_docente: 2, tema: 'Historia', fecha_hora_inicio: '2026-07-22T10:00:00Z', estado: 'Disponible' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 3 }] });

    const app = buildApp();
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenEstudiante}`)
      .send({ id_tutoria: 1, id_usuario: 3 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Límite alcanzado/i);
  });

  it('CP-02.6: rechazar sin token (401)', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/reservas')
      .send({ id_tutoria: 1, id_usuario: 3 });

    expect(res.status).toBe(401);
  });

  it('CP-02.7: validación rechaza cuerpo incompleto (400)', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenEstudiante}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('CP-02: Reserva — GET /api/reservas (listar)', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
  });

  it('CP-02.8: listar reservas del estudiante autenticado', async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({
        rows: [{
          id_reserva: 1, id_tutoria: 1, id_estudiante: 3,
          estado_asistencia: 'Pendiente', fecha_registro: new Date(),
          tema: 'Matemáticas', fecha_hora_inicio: '2026-07-21T10:00:00Z',
          estudiante_nombre: 'Estudiante Test', docente_nombre: 'Docente Test',
        }],
      });

    const app = buildApp();
    const res = await request(app)
      .get('/api/reservas')
      .set('Authorization', `Bearer ${tokenEstudiante}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('CP-02.9: docente ve sus tutorías reservadas', async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ total: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id_reserva: 2 }] });

    const app = buildApp();
    const res = await request(app)
      .get('/api/reservas')
      .set('Authorization', `Bearer ${tokenDocente}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('CP-02: Reserva — PUT /api/reservas/:id/asistencia', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
  });

  it('CP-02.10: docente marca asistencia correctamente', async () => {
    mockPoolQuery
      .mockResolvedValueOnce({
        rows: [{ id_reserva: 1, id_estudiante: 3, id_docente: 2, id_tutoria: 1 }],
      })
      .mockResolvedValueOnce({
        rows: [{ id_reserva: 1, estado_asistencia: 'Asistio' }],
      });

    const app = buildApp();
    const res = await request(app)
      .put('/api/reservas/1/asistencia')
      .set('Authorization', `Bearer ${tokenDocente}`)
      .send({ estado_asistencia: 'Asistio' });

    expect(res.status).toBe(200);
    expect(res.body.data.estado_asistencia).toBe('Asistio');
  });

  it('CP-02.11: estudiante no puede marcar asistencia (403)', async () => {
    const app = buildApp();
    const res = await request(app)
      .put('/api/reservas/1/asistencia')
      .set('Authorization', `Bearer ${tokenEstudiante}`)
      .send({ estado_asistencia: 'Asistio' });

    expect(res.status).toBe(403);
  });

  it('CP-02.12: reserva inexistente devuelve 404', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] });

    const app = buildApp();
    const res = await request(app)
      .put('/api/reservas/999/asistencia')
      .set('Authorization', `Bearer ${tokenDocente}`)
      .send({ estado_asistencia: 'Asistio' });

    expect(res.status).toBe(404);
  });
});

describe('CP-02: Reserva — PUT /api/reservas/:id/cancelar', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockPoolConnect.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();

    mockPoolConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });
  });

  it('CP-02.13: estudiante cancela su propia reserva pendiente', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id_reserva: 1, id_estudiante: 3, id_docente: 2, id_tutoria: 1, estado_asistencia: 'Pendiente' }],
    });

    mockClientQuery
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockResolvedValueOnce();

    const app = buildApp();
    const res = await request(app)
      .put('/api/reservas/1/cancelar')
      .set('Authorization', `Bearer ${tokenEstudiante}`);

    expect(res.status).toBe(200);
    expect(res.body.data.mensaje).toMatch(/cancelada/i);
  });

  it('CP-02.14: no puede cancelar reserva de otro estudiante (403)', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id_reserva: 1, id_estudiante: 999, id_docente: 2, id_tutoria: 1, estado_asistencia: 'Pendiente' }],
    });

    const app = buildApp();
    const res = await request(app)
      .put('/api/reservas/1/cancelar')
      .set('Authorization', `Bearer ${tokenEstudiante}`);

    expect(res.status).toBe(403);
  });

  it('CP-02.15: no puede cancelar reserva ya asistida (409)', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id_reserva: 1, id_estudiante: 3, id_docente: 2, id_tutoria: 1, estado_asistencia: 'Asistio' }],
    });

    const app = buildApp();
    const res = await request(app)
      .put('/api/reservas/1/cancelar')
      .set('Authorization', `Bearer ${tokenEstudiante}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/solo se pueden cancelar/i);
  });
});

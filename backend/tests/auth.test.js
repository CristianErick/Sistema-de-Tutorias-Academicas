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
  poolQuery: mockPoolQuery,
  poolConnect: mockPoolConnect,
  clientQuery: mockClientQuery,
  clientRelease: mockClientRelease,
}));

jest.mock('bcrypt');

const pg = require('pg');
const bcrypt = require('bcrypt');

const errorHandler = require('../src/middlewares/errorHandler');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../src/routes/authRoutes'));
  app.use(errorHandler);
  return app;
}

const usuarioMock = {
  id_usuario: 1,
  nombre_completo: 'Admin Test',
  correo: 'admin@test.com',
  contrasena: '$2b$10$hashedpassword',
  rol: 'Admin',
};

describe('CP-01: Acceso — POST /api/auth/login', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockPoolConnect.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
    bcrypt.compare.mockReset();
  });

  it('CP-01.1: login exitoso con credenciales válidas', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [usuarioMock] });
    bcrypt.compare.mockResolvedValue(true);

    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@test.com', contrasena: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.usuario).toMatchObject({
      id_usuario: 1,
      correo: 'admin@test.com',
      rol: 'Admin',
    });
  });

  it('CP-01.2: login rechazado con contraseña incorrecta', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [usuarioMock] });
    bcrypt.compare.mockResolvedValue(false);

    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@test.com', contrasena: 'WrongPassword1!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Credenciales inválidas/i);
  });

  it('CP-01.3: login rechazado con correo inexistente', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] });

    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'nadie@test.com', contrasena: 'Password123!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('CP-01.4: validación rechaza cuerpo vacío', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('CP-01.5: validación rechaza correo inválido', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'no-email', contrasena: 'Password123!' });

    expect(res.status).toBe(400);
  });

  it('CP-01.6: bloqueo de cuenta tras 5 intentos fallidos', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [usuarioMock] });
    bcrypt.compare.mockResolvedValue(false);

    const app = buildApp();

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ correo: 'admin@test.com', contrasena: 'WrongPassword1!' });
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@test.com', contrasena: 'Password123!' });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Cuenta bloqueada/i);
  });
});

describe('CP-01: Acceso — GET /api/auth/me', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign(
      { id_usuario: 1, correo: 'admin@test.com', rol: 'Admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    mockPoolQuery.mockReset();
  });

  it('CP-01.7: retorna perfil con token válido', async () => {
    mockPoolQuery.mockResolvedValue({
      rows: [{ id_usuario: 1, nombre_completo: 'Admin Test', correo: 'admin@test.com', rol: 'Admin' }],
    });

    const app = buildApp();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ correo: 'admin@test.com', rol: 'Admin' });
  });

  it('CP-01.8: rechaza sin token', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('CP-01.9: rechaza con token inválido', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-invalido');

    expect(res.status).toBe(401);
  });
});

describe('CP-01: Acceso — POST /api/auth/olvide-contrasena', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
  });

  it('CP-01.10: genera token si el correo existe', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [{ id_usuario: 1, nombre_completo: 'Test' }] });

    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/olvide-contrasena')
      .send({ correo: 'admin@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('reset_token');
  });

  it('CP-01.11: mensaje genérico si el correo no existe', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] });

    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/olvide-contrasena')
      .send({ correo: 'inexistente@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.data.mensaje).toMatch(/Si el correo existe/i);
  });
});

describe('CP-01: Acceso — POST /api/auth/restablecer-contrasena', () => {
  let resetToken;

  beforeAll(() => {
    resetToken = jwt.sign(
      { id_usuario: 1, proposito: 'reset-password' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
  });

  beforeEach(() => {
    mockPoolQuery.mockReset();
    bcrypt.hash.mockReset();
  });

  it('CP-01.12: restablece contraseña con token válido', async () => {
    mockPoolQuery.mockResolvedValue({ rowCount: 1 });
    bcrypt.hash.mockResolvedValue('$2b$10$newhashed');

    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/restablecer-contrasena')
      .send({ token: resetToken, contrasena: 'NuevaPass1!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('CP-01.13: rechaza token inválido', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/restablecer-contrasena')
      .send({ token: 'token-falso', contrasena: 'NuevaPass1!' });

    expect(res.status).toBe(401);
  });

  it('CP-01.14: valida formato de contraseña', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/restablecer-contrasena')
      .send({ token: resetToken, contrasena: '123' });

    expect(res.status).toBe(400);
  });
});

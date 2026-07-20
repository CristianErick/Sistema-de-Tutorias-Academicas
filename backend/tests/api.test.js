const request = require('supertest');
const express = require('express');
const authRoutes = require('../src/routes/authRoutes');
const { loginSchema } = require('../src/validations/schemas');

describe('POST /api/auth/login', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use((err, _req, res, _next) => {
      res.status(500).json({ success: false, error: 'Error interno' });
    });
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ contrasena: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'test@test.com' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'invalido', contrasena: 'password123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for empty email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: '', contrasena: 'Password123!' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/usuarios without token', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/usuarios', require('../src/routes/usuariosRoutes'));
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/usuarios');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/tutorias without token', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/tutorias', require('../src/routes/tutoriasRoutes'));
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/api/tutorias').send({});
    expect(res.status).toBe(401);
  });
});

describe('Utils - asyncHandler', () => {
  const asyncHandler = require('../src/utils/asyncHandler');

  it('catches errors and calls next', async () => {
    const fn = async () => { throw new Error('test error'); };
    const wrapped = asyncHandler(fn);

    const req = { method: 'GET', originalUrl: '/test' };
    const res = {};
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('test error');
  });

  it('passes through successful handler', async () => {
    const fn = async (_req, res) => {
      res.status(200).json({ ok: true });
    };
    const wrapped = asyncHandler(fn);

    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});

const verificarTokenJWT = require('../src/middlewares/verificarTokenJWT');
const validarRol = require('../src/middlewares/validarRol');

describe('verificarTokenJWT', () => {
  it('rejects request without authorization header', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    verificarTokenJWT(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cabecera Authorization requerida' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects malformed authorization header', () => {
    const req = { headers: { authorization: 'InvalidToken' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    verificarTokenJWT(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Formato esperado: Bearer <token>' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('validarRol', () => {
  it('allows access when role matches', () => {
    const req = { usuario: { rol: 'Admin' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    const middleware = validarRol('Admin');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('denies access when role does not match', () => {
    const req = { usuario: { rol: 'Estudiante' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    const middleware = validarRol('Docente', 'Admin');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('denies when req.usuario is missing', () => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    const middleware = validarRol('Admin');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

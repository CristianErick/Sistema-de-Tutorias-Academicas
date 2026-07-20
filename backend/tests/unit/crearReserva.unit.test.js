var mockPoolQuery = jest.fn();
var mockPoolConnect = jest.fn();
var mockClientQuery = jest.fn();
var mockClientRelease = jest.fn();

mockPoolConnect.mockResolvedValue({
  query: mockClientQuery,
  release: mockClientRelease,
});

jest.mock('../../src/config/database', () => ({
  query: mockPoolQuery,
  connect: mockPoolConnect,
}));

jest.mock('../../src/websocket/handler', () => ({
  notifyDocente: jest.fn(),
  notifyEstudiante: jest.fn(),
}));

const { crearReserva } = require('../../src/controllers/reservasController');

function buildReqRes(overrides = {}) {
  const req = {
    body: { id_tutoria: 1, id_usuario: 3 },
    ...overrides,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('crearReserva — verificación de horario ocupado (unitario)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });
  });

  it('CP-02.1: crea reserva cuando la tutoría está disponible y sin conflictos', async () => {
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

    const { req, res } = buildReqRes();
    await crearReserva(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { mensaje: expect.stringMatching(/Reserva creada/i) },
    });
  });

  it('CP-02.2: rechaza cuando la tutoría no existe (SELECT devuelve 0 filas)', async () => {
    mockClientQuery
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({ rows: [] });

    const { req, res } = buildReqRes();
    await crearReserva(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringMatching(/no existe/i),
    });
  });

  it('CP-02.3: rechaza cuando la tutoría tiene estado "Ocupado"', async () => {
    mockClientQuery
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({
        rows: [{ id_docente: 2, tema: 'Física', fecha_hora_inicio: '2026-07-21T12:00:00Z', estado: 'Ocupado' }],
      });

    const { req, res } = buildReqRes();
    await crearReserva(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringMatching(/ocupada/i),
    });
  });

  it('CP-02.4: rechaza cuando hay conflicto horario con otra reserva activa', async () => {
    mockClientQuery
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({
        rows: [{ id_docente: 2, tema: 'Química', fecha_hora_inicio: '2026-07-21T10:00:00Z', estado: 'Disponible' }],
      })
      .mockResolvedValueOnce({ rows: [{ existe: 1 }] });

    const { req, res } = buildReqRes();
    await crearReserva(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringMatching(/ya tiene una tutoría/i),
    });
  });

  it('CP-02.5: rechaza cuando el estudiante ya tiene 3 tutorías activas', async () => {
    mockClientQuery
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({
        rows: [{ id_docente: 2, tema: 'Historia', fecha_hora_inicio: '2026-07-22T10:00:00Z', estado: 'Disponible' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 3 }] });

    const { req, res } = buildReqRes();
    await crearReserva(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringMatching(/Límite alcanzado/i),
    });
  });

  it('libera el cliente (cliente.release) incluso cuando el flujo hace ROLLBACK', async () => {
    mockClientQuery
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({ rows: [] });

    const { req, res } = buildReqRes();
    await crearReserva(req, res);

    expect(mockClientRelease).toHaveBeenCalled();
  });

  it('libera el cliente incluso cuando ocurre una excepción no controlada', async () => {
    const dbError = new Error('Fallo de conexión');
    mockClientQuery.mockRejectedValueOnce(dbError);

    const { req, res } = buildReqRes();
    await expect(crearReserva(req, res)).rejects.toThrow('Fallo de conexión');

    expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockClientRelease).toHaveBeenCalled();
  });
});

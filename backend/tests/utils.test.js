const { success, error } = require('../src/utils/response');
const { paginate, paginatedResult } = require('../src/utils/pagination');

describe('response', () => {
  it('success returns 200 with data', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    success(res, { foo: 'bar' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { foo: 'bar' } });
  });

  it('success returns custom status code', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    success(res, { id: 1 }, 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 } });
  });

  it('error returns 500 with message', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    error(res, 'Algo salió mal');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Algo salió mal' });
  });

  it('error returns custom status code', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    error(res, 'No encontrado', 404);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('pagination', () => {
  it('paginate returns default values', () => {
    const req = { query: {} };
    const result = paginate(req);
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it('paginate respects custom values', () => {
    const req = { query: { page: '3', limit: '10' } };
    const result = paginate(req);
    expect(result).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it('paginate caps limit at 100', () => {
    const req = { query: { limit: '999' } };
    const result = paginate(req);
    expect(result.limit).toBe(100);
  });

  it('paginatedResult returns correct structure', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const result = paginatedResult(data, 50, 1, 20);
    expect(result).toEqual({
      rows: data,
      pagination: { total: 50, page: 1, limit: 20, totalPages: 3 },
    });
  });
});

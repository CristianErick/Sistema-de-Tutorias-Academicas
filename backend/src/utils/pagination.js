function paginate(req) {
  let page = parseInt(req.query.page, 10) || 1;
  let limit = parseInt(req.query.limit, 10) || 20;

  if (page < 1) page = 1;
  if (limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function paginatedResult(rows, total, page, limit) {
  return {
    rows,
    pagination: {
      total: parseInt(total, 10),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = { paginate, paginatedResult };

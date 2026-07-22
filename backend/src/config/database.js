const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 20000,
  ssl: { rejectUnauthorized: false },
  family: 4,
});

pool.on('error', (err) => {
  logger.error('Error en pool PostgreSQL:', err.message);
});

module.exports = pool;

const { Pool } = require('pg');
const logger = require('../utils/logger');

const dbUrl = process.env.DATABASE_URL;
const maskedUrl = dbUrl ? dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'NO SET';
logger.info(`Conectando a BD: ${maskedUrl}`);

const pool = new Pool({
  connectionString: dbUrl,
  max: 3,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 20000,
  ssl: { rejectUnauthorized: false },
  family: 4,
});

pool.on('connect', () => logger.info('Pool conectado a BD'));
pool.on('error', (err) => logger.error('Error en pool PostgreSQL:', err.message));

module.exports = pool;

const { Pool } = require('pg');
const logger = require('../utils/logger');

let dbUrl = process.env.DATABASE_URL || '';
const maskedUrl = dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
logger.info(`Conectando a BD: ${maskedUrl}`);

// Limpiar parametros que puedan dar problemas
dbUrl = dbUrl.replace(/&channel_binding=[^&]*/, '').replace(/\?channel_binding=[^&]*/, '');

const pool = new Pool({
  connectionString: dbUrl,
  max: 3,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 20000,
  ssl: { rejectUnauthorized: false },
});

pool.on('connect', () => logger.info('Pool conectado a BD'));
pool.on('error', (err) => logger.error('Error en pool PostgreSQL:', err.message));

module.exports = pool;

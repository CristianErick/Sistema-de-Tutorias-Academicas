const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const logger = require('../utils/logger');

async function queryWithRetry(sql, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(sql);
    } catch (err) {
      if (i < retries - 1 && err.message?.includes('timeout')) {
        logger.info(`Reintentando conexion a BD (${i + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

async function runSetup() {
  try {
    const { rows } = await queryWithRetry(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'usuarios'
      ) AS existe
    `);

    if (rows[0].existe) {
      logger.info('Base de datos ya inicializada, saltando setup');
      return;
    }

    const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await pool.query(sql);
    logger.info('Base de datos inicializada con éxito');
  } catch (err) {
    logger.error('Error al inicializar la base de datos', err.message);
  }
}

module.exports = runSetup;

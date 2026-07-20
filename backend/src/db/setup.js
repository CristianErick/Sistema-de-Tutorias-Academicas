const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const logger = require('../utils/logger');

async function runSetup() {
  try {
    const { rows } = await pool.query(`
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
    logger.error('Error al inicializar la base de datos', err);
  }
}

module.exports = runSetup;

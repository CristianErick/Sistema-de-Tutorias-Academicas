const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const logger = require('../utils/logger');

async function runSetup() {
  const dbUrl = process.env.DATABASE_URL || '';
  const cleanUrl = dbUrl.replace(/&channel_binding=[^&]*/, '').replace(/\?channel_binding=[^&]*/, '');

  for (let i = 0; i < 5; i++) {
    let client;
    try {
      client = new Client({
        connectionString: cleanUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000,
      });
      await client.connect();
      logger.info('Cliente conectado a BD');

      const { rows } = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usuarios') AS existe`
      );

      if (rows[0].existe) {
        logger.info('BD ya inicializada');
        await client.end();
        return;
      }

      const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
      await client.query(sql);

      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO usuarios (nombre_completo, correo, contrasena, rol)
         VALUES ('Administrador', 'admin@tutorias.com', $1, 'Admin')
         ON CONFLICT (correo) DO NOTHING`,
        [hash]
      );
      logger.info('Usuario admin creado (admin@tutorias.com / admin123)');

      logger.info('BD inicializada con exito');
      await client.end();
      return;
    } catch (err) {
      logger.error(`Intento ${i + 1}/5 fallo: ${err.message}`);
      if (client) await client.end().catch(() => {});
      if (i < 4) await new Promise(r => setTimeout(r, 3000));
    }
  }
  logger.error('No se pudo inicializar la BD tras 5 intentos');
}

module.exports = runSetup;

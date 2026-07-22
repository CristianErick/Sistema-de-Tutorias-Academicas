const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
require('./config/env');
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middlewares/errorHandler');
const sanitizeInput = require('./middlewares/sanitize');
const runSetup = require('./db/setup');
const logger = require('./utils/logger');
const wsHandler = require('./websocket/handler');
const authRoutes = require('./routes/authRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const tutoriasRoutes = require('./routes/tutoriasRoutes');
const reservasRoutes = require('./routes/reservasRoutes');
const reportesRoutes = require('./routes/reportesRoutes');
const app = express();

app.set('trust proxy', 1);

app.use(compression());
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

const corsOrigins = process.env.CORS_ORIGIN === '*'
  ? '*'
  : process.env.CORS_ORIGIN.split(',').map(s => s.trim());
app.use(cors({ origin: corsOrigins }));

app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeInput);

const frontendPath = path.resolve(__dirname, '..', '..', 'frontend');
app.use(express.static(frontendPath, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
      res.set('Cache-Control', 'no-store, must-revalidate');
    }
  },
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas peticiones. Intente de nuevo en 15 minutos.' },
});
app.use('/api', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.' },
});
app.use('/api/auth/login', authLimiter);

app.get('/health', async (_req, res) => {
  try {
    const pool = require('./config/database');
    const db = await pool.query('SELECT 1');
    const pkg = require('../package.json');
    res.json({
      status: 'ok',
      version: pkg.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      memory: process.memoryUsage(),
      database: db.rows[0] ? 'connected' : 'disconnected',
    });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/tutorias', tutoriasRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/reportes', reportesRoutes);

app.use(errorHandler);

const server = http.createServer(app);
wsHandler.setup(server);

const PORT = process.env.PORT || 3000;

if (process.env.VERCEL !== '1') {
  (async () => {
    await runSetup();
    server.listen(PORT, () => {
      logger.info(`Servidor corriendo en http://localhost:${PORT}`);
      logger.info(`WebSocket en ws://localhost:${PORT}/ws`);
      logger.info(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  })();
} else {
  const setupPromise = runSetup().catch(err => logger.error('Setup error:', err));
  // Espera a que setup termine antes de procesar requests
  app.use(async (_req, _res, next) => {
    await setupPromise;
    next();
  });
}

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err);
});

module.exports = app;

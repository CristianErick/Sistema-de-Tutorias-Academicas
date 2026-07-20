const Joi = require('joi');

const schema = Joi.object({
  DATABASE_URL: Joi.string().uri().required().messages({
    'any.required': 'DATABASE_URL es obligatoria',
    'string.uri': 'DATABASE_URL debe ser una URI válida',
  }),
  JWT_SECRET: Joi.string().min(16).required().messages({
    'any.required': 'JWT_SECRET es obligatorio',
    'string.min': 'JWT_SECRET debe tener al menos 16 caracteres',
  }),
  PORT: Joi.number().port().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  CORS_ORIGIN: Joi.string().default('*'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown(true);

const { error: err, value: vars } = schema.validate(process.env, { abortEarly: false });

if (err) {
  const messages = err.details.map(d => d.message).join('\n');
  console.error('❌ Error de configuración:\n' + messages);
  process.exit(1);
}

module.exports = vars;

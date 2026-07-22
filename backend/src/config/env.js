const Joi = require('joi');

const schema = Joi.object({
  DATABASE_URL: Joi.string().pattern(/^postgres(ql)?:\/\/.+/).required().messages({
    'any.required': 'DATABASE_URL es obligatoria',
    'string.pattern.base': 'DATABASE_URL debe ser una URI postgresql:// válida',
  }),
  JWT_SECRET: Joi.string().min(10).required().messages({
    'any.required': 'JWT_SECRET es obligatorio',
    'string.min': 'JWT_SECRET debe tener al menos 10 caracteres',
  }),
  PORT: Joi.number().port().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  CORS_ORIGIN: Joi.string().default('*').messages({
    'string.base': 'CORS_ORIGIN debe ser una lista de orígenes separados por coma o *',
  }),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown(true);

const { error: err, value: vars } = schema.validate(process.env, { abortEarly: false });

if (err) {
  const messages = err.details.map(d => d.message).join('\n');
  console.error('❌ Error de configuración:\n' + messages);
  if (process.env.VERCEL !== '1') process.exit(1);
}

for (const key of Object.keys(vars)) {
  process.env[key] = String(vars[key]);
}

module.exports = vars;

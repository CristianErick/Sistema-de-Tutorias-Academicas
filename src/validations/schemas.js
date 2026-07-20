const Joi = require('joi');

const loginSchema = Joi.object({
  correo: Joi.string().email().required().messages({
    'string.email': 'Correo inválido',
    'any.required': 'El correo es obligatorio',
  }),
  contrasena: Joi.string().min(6).required().messages({
    'string.min': 'La contraseña debe tener al menos 6 caracteres',
    'any.required': 'La contraseña es obligatoria',
  }),
});

const crearUsuarioSchema = Joi.object({
  nombre_completo: Joi.string().min(3).max(150).required().messages({
    'string.min': 'El nombre debe tener al menos 3 caracteres',
    'any.required': 'El nombre es obligatorio',
  }),
  correo: Joi.string().email().required().messages({
    'string.email': 'Correo inválido',
    'any.required': 'El correo es obligatorio',
  }),
  contrasena: Joi.string().min(6).required().messages({
    'string.min': 'La contraseña debe tener al menos 6 caracteres',
    'any.required': 'La contraseña es obligatoria',
  }),
  rol: Joi.string().valid('Estudiante', 'Docente', 'Admin').required().messages({
    'any.only': 'Rol inválido. Valores: Estudiante, Docente, Admin',
    'any.required': 'El rol es obligatorio',
  }),
});

const actualizarUsuarioSchema = Joi.object({
  nombre_completo: Joi.string().min(3).max(150),
  correo: Joi.string().email(),
  contrasena: Joi.string().min(6),
  rol: Joi.string().valid('Estudiante', 'Docente', 'Admin'),
}).min(1).messages({ 'object.min': 'Debe enviar al menos un campo para actualizar' });

const crearTutoriaSchema = Joi.object({
  tema: Joi.string().min(3).max(200).required().messages({
    'string.min': 'El tema debe tener al menos 3 caracteres',
    'any.required': 'El tema es obligatorio',
  }),
  fecha_hora_inicio: Joi.date().iso().required().messages({
    'date.format': 'Fecha inválida. Use formato ISO (YYYY-MM-DD HH:MM:SS)',
    'any.required': 'La fecha de inicio es obligatoria',
  }),
  id_docente: Joi.number().integer(),
});

const actualizarTutoriaSchema = Joi.object({
  tema: Joi.string().min(3).max(200),
  fecha_hora_inicio: Joi.date().iso(),
  estado: Joi.string().valid('Disponible', 'Ocupado'),
}).min(1).messages({ 'object.min': 'Debe enviar al menos un campo para actualizar' });

const crearReservaSchema = Joi.object({
  id_tutoria: Joi.number().integer().required().messages({
    'any.required': 'id_tutoria es obligatorio',
  }),
  id_estudiante: Joi.number().integer().required().messages({
    'any.required': 'id_estudiante es obligatorio',
  }),
});

const marcarAsistenciaSchema = Joi.object({
  estado_asistencia: Joi.string().valid('Pendiente', 'Asistio', 'Falto').required().messages({
    'any.only': 'Estado inválido. Valores: Pendiente, Asistio, Falto',
    'any.required': 'El estado de asistencia es obligatorio',
  }),
});

module.exports = {
  loginSchema,
  crearUsuarioSchema,
  actualizarUsuarioSchema,
  crearTutoriaSchema,
  actualizarTutoriaSchema,
  crearReservaSchema,
  marcarAsistenciaSchema,
};

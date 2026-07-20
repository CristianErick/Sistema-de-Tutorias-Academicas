const { Router } = require('express');
const verificarTokenJWT = require('../middlewares/verificarTokenJWT');
const validarRol = require('../middlewares/validarRol');
const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { crearReservaSchema, marcarAsistenciaSchema } = require('../validations/schemas');
const {
  crearReserva,
  listarReservas,
  marcarAsistencia,
} = require('../controllers/reservasController');

const router = Router();

router.get('/', verificarTokenJWT, asyncHandler(listarReservas));
router.post('/nueva', verificarTokenJWT, validate(crearReservaSchema), asyncHandler(crearReserva));
router.put('/:id/asistencia', verificarTokenJWT, validarRol('Docente', 'Admin'), validate(marcarAsistenciaSchema), asyncHandler(marcarAsistencia));

module.exports = router;

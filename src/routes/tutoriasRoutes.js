const { Router } = require('express');
const verificarTokenJWT = require('../middlewares/verificarTokenJWT');
const validarRol = require('../middlewares/validarRol');
const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { crearTutoriaSchema, actualizarTutoriaSchema } = require('../validations/schemas');
const {
  listarTutorias,
  obtenerTutoria,
  crearTutoria,
  actualizarTutoria,
  eliminarTutoria,
} = require('../controllers/tutoriasController');

const router = Router();

router.get('/', verificarTokenJWT, asyncHandler(listarTutorias));
router.get('/:id', verificarTokenJWT, asyncHandler(obtenerTutoria));
router.post('/', verificarTokenJWT, validarRol('Docente', 'Admin'), validate(crearTutoriaSchema), asyncHandler(crearTutoria));
router.put('/:id', verificarTokenJWT, validarRol('Docente', 'Admin'), validate(actualizarTutoriaSchema), asyncHandler(actualizarTutoria));
router.delete('/:id', verificarTokenJWT, validarRol('Docente', 'Admin'), asyncHandler(eliminarTutoria));

module.exports = router;

const { Router } = require('express');
const verificarTokenJWT = require('../middlewares/verificarTokenJWT');
const validarRol = require('../middlewares/validarRol');
const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { crearUsuarioSchema, actualizarUsuarioSchema } = require('../validations/schemas');
const {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} = require('../controllers/usuariosController');

const router = Router();

router.use(verificarTokenJWT, validarRol('Admin'));

router.get('/', asyncHandler(listarUsuarios));
router.post('/', validate(crearUsuarioSchema), asyncHandler(crearUsuario));
router.get('/:id', asyncHandler(obtenerUsuario));
router.put('/:id', validate(actualizarUsuarioSchema), asyncHandler(actualizarUsuario));
router.delete('/:id', asyncHandler(eliminarUsuario));

module.exports = router;

const { Router } = require('express');
const verificarTokenJWT = require('../middlewares/verificarTokenJWT');
const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { loginSchema, olvideContrasenaSchema, restablecerContrasenaSchema, actualizarPerfilSchema } = require('../validations/schemas');
const { login, perfil, olvideContrasena, restablecerContrasena, actualizarPerfil } = require('../controllers/authController');

const router = Router();

router.post('/login', validate(loginSchema), asyncHandler(login));
router.post('/olvide-contrasena', validate(olvideContrasenaSchema), asyncHandler(olvideContrasena));
router.post('/restablecer-contrasena', validate(restablecerContrasenaSchema), asyncHandler(restablecerContrasena));
router.get('/me', verificarTokenJWT, asyncHandler(perfil));
router.put('/perfil', verificarTokenJWT, validate(actualizarPerfilSchema), asyncHandler(actualizarPerfil));

module.exports = router;

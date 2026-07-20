const { Router } = require('express');
const verificarTokenJWT = require('../middlewares/verificarTokenJWT');
const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { loginSchema } = require('../validations/schemas');
const { login, perfil } = require('../controllers/authController');

const router = Router();

router.post('/login', validate(loginSchema), asyncHandler(login));
router.get('/me', verificarTokenJWT, asyncHandler(perfil));

module.exports = router;

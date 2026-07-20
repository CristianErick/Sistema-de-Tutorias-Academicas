const { Router } = require('express');
const verificarTokenJWT = require('../middlewares/verificarTokenJWT');
const validarRol = require('../middlewares/validarRol');
const asyncHandler = require('../utils/asyncHandler');
const { resumen, tutoriasMasReservadas, tutoriasPorDocente } = require('../controllers/reportesController');

const router = Router();

router.use(verificarTokenJWT);

router.get('/resumen', asyncHandler(resumen));
router.get('/tutorias', asyncHandler(tutoriasMasReservadas));
router.get('/docentes', asyncHandler(tutoriasPorDocente));

module.exports = router;

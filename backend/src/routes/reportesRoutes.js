const { Router } = require('express');
const verificarTokenJWT = require('../middlewares/verificarTokenJWT');
const asyncHandler = require('../utils/asyncHandler');
const { resumen, tutoriasMasReservadas, tutoriasPorDocente, exportarCSV } = require('../controllers/reportesController');

const router = Router();

router.use(verificarTokenJWT);

router.get('/resumen', asyncHandler(resumen));
router.get('/tutorias', asyncHandler(tutoriasMasReservadas));
router.get('/docentes', asyncHandler(tutoriasPorDocente));
router.get('/exportar', asyncHandler(exportarCSV));

module.exports = router;

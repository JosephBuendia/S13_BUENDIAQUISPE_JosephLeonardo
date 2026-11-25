import { Router } from 'express';
import * as ctrl from '../controllers/caja.controller.js';
import { autenticar } from '../middlewares/auth.js';
import { requireRol } from '../middlewares/requireRol.js';

const router = Router();
router.use(autenticar, requireRol('cajero', 'administrador'));

router.get('/pendientes', ctrl.pendientes);
router.post('/cobrar', ctrl.cobrar);

export default router;

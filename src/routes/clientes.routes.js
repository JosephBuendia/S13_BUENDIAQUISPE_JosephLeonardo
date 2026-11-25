import { Router } from 'express';
import * as ctrl from '../controllers/clientes.controller.js';
import { autenticar } from '../middlewares/auth.js';
import { requireRol } from '../middlewares/requireRol.js';

const router = Router();
router.use(autenticar, requireRol('administrador', 'empleado'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', ctrl.crear);

export default router;

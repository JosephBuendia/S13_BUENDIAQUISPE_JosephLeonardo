import { Router } from 'express';
import * as ctrl from '../controllers/contacto.controller.js';
import { autenticar, autenticarOpcional } from '../middlewares/auth.js';
import { requireRol } from '../middlewares/requireRol.js';

const router = Router();

router.post('/', autenticarOpcional, ctrl.registrar);
router.get('/', autenticar, requireRol('administrador', 'empleado'), ctrl.listar);

export default router;

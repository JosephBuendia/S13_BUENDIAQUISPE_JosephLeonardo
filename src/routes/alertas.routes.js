import { Router } from 'express';
import * as ctrl from '../controllers/alertas.controller.js';
import { autenticar, autenticarOpcional } from '../middlewares/auth.js';
import { requireRol } from '../middlewares/requireRol.js';

const router = Router();
const gestion = requireRol('administrador', 'empleado');

router.post('/', autenticarOpcional, ctrl.crear); // el botón de auxilio funciona sin sesión
router.get('/', autenticar, gestion, ctrl.listar);
router.patch('/:codigo/estado', autenticar, gestion, ctrl.cambiarEstado);

export default router;

import { Router } from 'express';
import * as ctrl from '../controllers/incidencias.controller.js';
import { autenticar } from '../middlewares/auth.js';
import { requireRol } from '../middlewares/requireRol.js';

const router = Router();
const gestion = requireRol('administrador', 'empleado');

router.use(autenticar); // todo lo de incidencias exige token

router.get('/', ctrl.listar); // vecino: lo suyo · personal: todo
router.get('/:codigo', ctrl.obtener);
router.post('/', ctrl.crear); // cualquier usuario con sesión reporta
router.put('/:codigo', gestion, ctrl.actualizar);
router.patch('/:codigo/estado', gestion, ctrl.cambiarEstado);
router.delete('/:codigo', gestion, ctrl.eliminar);

export default router;

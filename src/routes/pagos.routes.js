import { Router } from 'express';
import * as ctrl from '../controllers/pagos.controller.js';
import { autenticar } from '../middlewares/auth.js';
import { requireRol } from '../middlewares/requireRol.js';

const router = Router();
router.use(autenticar);

// Vecino: paga en línea sus solicitudes pendientes
router.get('/pendientes', requireRol('cliente'), ctrl.pendientes);
router.post('/tarjeta', requireRol('cliente'), ctrl.pagarConTarjeta);
router.post('/billetera', requireRol('cliente'), ctrl.pagarConBilletera);

// Historial: el vecino ve los suyos; cajero y administrador ven todos
router.get('/', requireRol('cliente', 'cajero', 'administrador'), ctrl.listar);

// Auditoría: solo el administrador
router.patch('/:id/verificar', requireRol('administrador'), ctrl.verificar);

export default router;

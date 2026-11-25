// Mapa general: qué prefijo de URL atiende cada archivo de rutas.
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import incidenciasRoutes from './incidencias.routes.js';
import seguimientoRoutes from './seguimiento.routes.js';
import alertasRoutes from './alertas.routes.js';
import contactoRoutes from './contacto.routes.js';
import clientesRoutes from './clientes.routes.js';
import pagosRoutes from './pagos.routes.js';
import cajaRoutes from './caja.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/incidencias', incidenciasRoutes);
router.use('/seguimiento', seguimientoRoutes);
router.use('/alertas', alertasRoutes);
router.use('/contacto', contactoRoutes);
router.use('/clientes', clientesRoutes);
router.use('/pagos', pagosRoutes);
router.use('/caja', cajaRoutes);

export default router;

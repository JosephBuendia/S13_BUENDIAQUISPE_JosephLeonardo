import { Router } from 'express';
import * as ctrl from '../controllers/seguimiento.controller.js';

const router = Router();
router.get('/:codigo', ctrl.consultar); // pública: no lleva autenticar

export default router;

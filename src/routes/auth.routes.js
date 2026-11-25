import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { autenticar } from '../middlewares/auth.js';
import { limitarIntentos } from '../middlewares/limitarIntentos.js';

const router = Router();
const frenoLogin = limitarIntentos({ max: 10, ventanaMs: 15 * 60 * 1000 });

router.post('/registro', frenoLogin, ctrl.registro);
router.post('/login', frenoLogin, ctrl.login);
router.get('/perfil', autenticar, ctrl.perfil);

export default router;

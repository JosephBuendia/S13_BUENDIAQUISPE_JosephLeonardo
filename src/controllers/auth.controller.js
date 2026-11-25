// El controller solo traduce HTTP <-> service: lee la petición, llama al service y responde con el código correcto.
import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';

// En Express 5 req.body es undefined si no llegó JSON: por eso "?? {}".
export const registro = asyncHandler(async (req, res) => {
  const { mensaje, usuario } = await authService.registrar(req.body ?? {});
  res.status(201).json({ mensaje, usuario });
});

export const login = asyncHandler(async (req, res) => {
  res.json(await authService.iniciarSesion(req.body ?? {})); // { usuario, token }
});

export const perfil = asyncHandler(async (req, res) => {
  res.json(await authService.perfil(req.usuario.id));
});

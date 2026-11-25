import { asyncHandler } from '../utils/asyncHandler.js';
import * as service from '../services/contacto.service.js';

export const registrar = asyncHandler(async (req, res) => {
  const mensaje = await service.registrar(req.usuario, req.body ?? {});
  res.status(201).json({ mensaje: 'Mensaje registrado. Nos comunicaremos contigo en breve.', contacto: mensaje });
});

export const listar = asyncHandler(async (req, res) => {
  res.json(await service.listar());
});

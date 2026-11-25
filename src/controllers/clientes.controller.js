import { asyncHandler } from '../utils/asyncHandler.js';
import * as service from '../services/clientes.service.js';

export const listar = asyncHandler(async (req, res) => {
  res.json(await service.listar(req.query.q));
});

export const obtener = asyncHandler(async (req, res) => {
  res.json(await service.obtener(req.params.id));
});

export const crear = asyncHandler(async (req, res) => {
  const cliente = await service.crear(req.body ?? {});
  res.status(201).json({ mensaje: 'Cliente registrado.', cliente });
});

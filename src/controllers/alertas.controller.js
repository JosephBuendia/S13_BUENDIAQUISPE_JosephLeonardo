import { asyncHandler } from '../utils/asyncHandler.js';
import * as service from '../services/alertas.service.js';

export const crear = asyncHandler(async (req, res) => {
  const alerta = await service.crear(req.usuario, req.body ?? {});
  res.status(201).json({
    mensaje: 'Alerta recibida. La central despachará la unidad más cercana.',
    codigo: alerta.codigo_seguimiento,
    alerta,
  });
});

export const listar = asyncHandler(async (req, res) => {
  res.json(await service.listar(req.query));
});

export const cambiarEstado = asyncHandler(async (req, res) => {
  res.json(await service.cambiarEstado(req.params.codigo, req.body ?? {}));
});

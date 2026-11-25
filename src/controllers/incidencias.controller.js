import { asyncHandler } from '../utils/asyncHandler.js';
import * as service from '../services/incidencias.service.js';

export const listar = asyncHandler(async (req, res) => {
  res.json(await service.listar(req.usuario, req.query));
});

export const obtener = asyncHandler(async (req, res) => {
  res.json(await service.obtener(req.usuario, req.params.codigo));
});

export const crear = asyncHandler(async (req, res) => {
  const incidencia = await service.crear(req.usuario, req.body ?? {});
  res.status(201).json({
    mensaje: 'Reporte registrado.',
    codigo: incidencia.codigo,
    monto_calculado: incidencia.monto_calculado,
    estado_pago: incidencia.estado_pago,
    incidencia,
  });
});

export const actualizar = asyncHandler(async (req, res) => {
  res.json(await service.actualizar(req.params.codigo, req.body ?? {}));
});

export const cambiarEstado = asyncHandler(async (req, res) => {
  res.json(await service.cambiarEstado(req.params.codigo, req.body ?? {}));
});

export const eliminar = asyncHandler(async (req, res) => {
  await service.eliminar(req.params.codigo);
  res.json({ mensaje: 'Incidencia eliminada.' });
});

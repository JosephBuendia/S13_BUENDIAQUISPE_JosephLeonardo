import { asyncHandler } from '../utils/asyncHandler.js';
import * as pagos from '../services/pagos.service.js';

export const pendientes = asyncHandler(async (req, res) => {
  res.json(await pagos.pendientesDeCobro());
});

export const cobrar = asyncHandler(async (req, res) => {
  const pago = await pagos.cobrarEnCaja(req.usuario, req.body ?? {});
  res.status(201).json({ mensaje: 'Cobro registrado.', pago });
});

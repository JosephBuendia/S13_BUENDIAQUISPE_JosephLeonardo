import { asyncHandler } from '../utils/asyncHandler.js';
import * as pasarela from '../services/pasarela.service.js';
import * as pagos from '../services/pagos.service.js';

// Aprobado -> 201. Rechazado por la entidad -> 402 (Payment Required) con el motivo en "mensaje".
const responderPasarela = (res, r) =>
  r.aprobado
    ? res.status(201).json({ mensaje: 'Pago aprobado.', ...r })
    : res.status(402).json({ mensaje: r.motivo, ...r });

export const pagarConTarjeta = asyncHandler(async (req, res) => {
  responderPasarela(res, await pasarela.pagarConTarjeta(req.usuario, req.body ?? {}));
});

export const pagarConBilletera = asyncHandler(async (req, res) => {
  responderPasarela(res, await pasarela.pagarConBilletera(req.usuario, req.body ?? {}));
});

export const pendientes = asyncHandler(async (req, res) => {
  res.json(await pagos.pendientesDelCliente(req.usuario));
});

export const listar = asyncHandler(async (req, res) => {
  res.json(await pagos.listar(req.usuario, req.query));
});

export const verificar = asyncHandler(async (req, res) => {
  res.json({ mensaje: 'Pago verificado.', pago: await pagos.verificar(req.usuario, req.params.id) });
});

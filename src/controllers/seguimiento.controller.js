import { asyncHandler } from '../utils/asyncHandler.js';
import * as service from '../services/seguimiento.service.js';

export const consultar = asyncHandler(async (req, res) => {
  res.json(await service.consultar(req.params.codigo));
});

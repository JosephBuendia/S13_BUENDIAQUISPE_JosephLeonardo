// Consulta pública por código (sin iniciar sesión): busca en incidencias y en alertas de auxilio.
import { AppError } from '../utils/AppError.js';
import { normalizarCodigo, codigoValido } from '../utils/codigos.js';
import * as incidenciasRepo from '../repositories/incidencias.repository.js';
import * as alertasRepo from '../repositories/alertas.repository.js';

export async function consultar(codigoRuta) {
  const codigo = normalizarCodigo(codigoRuta);
  if (!codigoValido(codigo)) throw new AppError(400, 'El código no tiene un formato válido.');

  const incidencia = await incidenciasRepo.buscarSeguimiento(codigo);
  if (incidencia) return { tipo: 'incidencia', ...incidencia };

  const alerta = await alertasRepo.buscarSeguimiento(codigo);
  if (alerta) return { tipo: 'alerta', ...alerta };

  throw new AppError(404, 'No encontramos ningún reporte con ese código.');
}

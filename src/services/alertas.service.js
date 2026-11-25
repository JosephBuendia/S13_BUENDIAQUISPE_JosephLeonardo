// Botón de auxilio: no exige sesión (una emergencia no puede esperar un login).
import { AppError } from '../utils/AppError.js';
import { generarCodigo, normalizarCodigo, codigoValido } from '../utils/codigos.js';
import {
  exigirValido, validarAlerta, validarCambioEstadoAlerta, normalizarEstadoAlerta, texto,
} from '../utils/validaciones.js';
import { ESTADOS_ALERTA } from '../utils/catalogos.js';
import * as alertasRepo from '../repositories/alertas.repository.js';

export async function crear(usuario, datos) {
  exigirValido(validarAlerta(datos));
  const base = {
    idUsuario: usuario?.id ?? null,
    nombreVecino: texto(datos.nombre_vecino) || usuario?.nombre || null,
    ubicacion: texto(datos.ubicacion),
    descripcion: texto(datos.descripcion),
  };
  for (let intento = 0; intento < 3; intento++) {
    try {
      return await alertasRepo.crear({ ...base, codigo: generarCodigo('ALR') });
    } catch (error) {
      if (error.code !== '23505' || intento === 2) throw error;
    }
  }
}

export async function listar({ estado } = {}) {
  if (estado && !ESTADOS_ALERTA.includes(normalizarEstadoAlerta(estado))) {
    throw new AppError(400, `El filtro estado debe ser: ${ESTADOS_ALERTA.join(', ')}.`);
  }
  return alertasRepo.listar(estado ? normalizarEstadoAlerta(estado) : undefined);
}

export async function cambiarEstado(codigoRuta, datos) {
  exigirValido(validarCambioEstadoAlerta(datos));
  const codigo = normalizarCodigo(codigoRuta);
  if (!codigoValido(codigo)) throw new AppError(400, 'El código de la alerta no tiene un formato válido.');
  const actualizada = await alertasRepo.actualizarEstado(codigo, normalizarEstadoAlerta(datos.estado));
  if (!actualizada) throw new AppError(404, 'La alerta no existe.');
  return actualizada;
}

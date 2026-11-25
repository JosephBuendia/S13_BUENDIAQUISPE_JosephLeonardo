// Reglas de negocio de incidencias: quién ve qué, cálculo del monto en el servidor y gestión por rol.
import { AppError } from '../utils/AppError.js';
import { calcularMontoServicio, estadoPagoInicial } from '../utils/tarifario.js';
import { generarCodigo, normalizarCodigo, codigoValido } from '../utils/codigos.js';
import {
  exigirValido, validarNuevaIncidencia, validarEdicionIncidencia, validarCambioEstado,
  normalizarEstadoIncidencia, texto, entero, soloDigitos,
} from '../utils/validaciones.js';
import { ESTADOS_INCIDENCIA } from '../utils/catalogos.js';
import * as incidenciasRepo from '../repositories/incidencias.repository.js';
import * as usuariosRepo from '../repositories/usuarios.repository.js';

const ROLES_GESTION = ['administrador', 'empleado'];
const esGestion = (usuario) => ROLES_GESTION.includes(usuario.rol);

function codigoDeRuta(valor) {
  const codigo = normalizarCodigo(valor);
  if (!codigoValido(codigo)) throw new AppError(400, 'El código de la incidencia no tiene un formato válido.');
  return codigo;
}

export async function listar(usuario, { estado, estado_pago } = {}) {
  const filtros = {};
  if (estado) {
    const e = normalizarEstadoIncidencia(estado);
    if (!ESTADOS_INCIDENCIA.includes(e)) throw new AppError(400, `El filtro estado debe ser: ${ESTADOS_INCIDENCIA.join(', ')}.`);
    filtros.estado = e;
  }
  if (estado_pago) {
    if (!['pendiente', 'pagado', 'exonerado'].includes(estado_pago)) throw new AppError(400, 'El filtro estado_pago debe ser: pendiente, pagado o exonerado.');
    filtros.estadoPago = estado_pago;
  }
  // El vecino solo ve lo suyo; el personal ve todo.
  if (!esGestion(usuario)) filtros.usuarioId = usuario.id;
  return incidenciasRepo.listar(filtros);
}

export async function obtener(usuario, codigoRuta) {
  const incidencia = await incidenciasRepo.buscarPorCodigo(codigoDeRuta(codigoRuta));
  // Si es de otro vecino respondemos 404 (no 403) para no revelar que ese código existe.
  if (!incidencia || (!esGestion(usuario) && incidencia.usuario_id !== usuario.id)) {
    throw new AppError(404, 'La incidencia no existe.');
  }
  return incidencia;
}

export async function crear(usuario, datos) {
  exigirValido(validarNuevaIncidencia(datos));

  // El monto lo calcula el servidor: lo que mande el navegador se ignora.
  const horas = datos.horas_resguardo === undefined ? 0 : entero(datos.horas_resguardo);
  const efectivos = horas === 0 || datos.efectivos_adicionales === undefined ? 0 : entero(datos.efectivos_adicionales);
  const monto = calcularMontoServicio({ horas_resguardo: horas, efectivos_adicionales: efectivos });

  const dueno = await usuariosRepo.buscarPorId(usuario.id);
  if (!dueno) throw new AppError(401, 'Tu cuenta ya no existe. Inicia sesión de nuevo.');

  const base = {
    usuarioId: dueno.id,
    cliente: dueno.nombre,
    dni: dueno.dni ? String(dueno.dni).slice(0, 15) : null,
    suministroZona: `${datos.sector} — ${texto(datos.direccion)}`,
    tipoIncidente: datos.tipo_incidente,
    sustento: texto(datos.descripcion),
    montoCalculado: monto,
    estadoPago: estadoPagoInicial(monto),
    telefono: soloDigitos(datos.telefono),
    urgencia: datos.urgencia ?? (monto === 0 ? 'alta' : 'media'), // auxilio = emergencia
  };

  // El código es único en la BD; si por azar choca, reintentamos con otro.
  for (let intento = 0; intento < 3; intento++) {
    try {
      return await incidenciasRepo.crear({ ...base, codigo: generarCodigo('INC') });
    } catch (error) {
      if (error.code !== '23505' || intento === 2) throw error;
    }
  }
}

export async function actualizar(codigoRuta, datos) {
  exigirValido(validarEdicionIncidencia(datos));
  const actualizada = await incidenciasRepo.actualizar(codigoDeRuta(codigoRuta), {
    tipoIncidente: datos.tipo_incidente,
    suministroZona: texto(datos.suministro_zona),
    sustento: texto(datos.sustento),
    unidad: datos.unidad === undefined ? null : texto(datos.unidad),
    estado: datos.estado === undefined ? null : normalizarEstadoIncidencia(datos.estado),
    respuesta: datos.respuesta === undefined ? null : texto(datos.respuesta),
    urgencia: datos.urgencia ?? null,
    telefono: datos.telefono === undefined ? null : soloDigitos(datos.telefono),
  });
  if (!actualizada) throw new AppError(404, 'La incidencia no existe.');
  return actualizada;
}

export async function cambiarEstado(codigoRuta, datos) {
  exigirValido(validarCambioEstado(datos));
  const actualizada = await incidenciasRepo.actualizarEstado(
    codigoDeRuta(codigoRuta),
    normalizarEstadoIncidencia(datos.estado),
    datos.respuesta === undefined ? null : texto(datos.respuesta)
  );
  if (!actualizada) throw new AppError(404, 'La incidencia no existe.');
  return actualizada;
}

export async function eliminar(codigoRuta) {
  const incidencia = await incidenciasRepo.buscarPorCodigo(codigoDeRuta(codigoRuta));
  if (!incidencia) throw new AppError(404, 'La incidencia no existe.');
  // Un registro con pagos no se borra: se perdería el rastro contable.
  if (await incidenciasRepo.contarPagos(incidencia.id) > 0) {
    throw new AppError(409, 'No se puede eliminar: la incidencia tiene pagos registrados.');
  }
  await incidenciasRepo.eliminar(incidencia.codigo);
}

// Pagos presenciales (caja), consulta de pagos y verificación (auditoría).
import { conTransaccion } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { generarCodigo } from '../utils/codigos.js';
import { redondear } from '../utils/tarifario.js';
import { exigirValido, validarCobroCaja, texto, entero, idDeRuta } from '../utils/validaciones.js';
import * as incidenciasRepo from '../repositories/incidencias.repository.js';
import * as pagosRepo from '../repositories/pagos.repository.js';

export const pendientesDelCliente = (usuario) => incidenciasRepo.listarPendientesDeUsuario(usuario.id);
export const pendientesDeCobro = () => incidenciasRepo.listarPendientesDeCobro();

// Cliente: solo sus pagos. Cajero y administrador: todos.
export async function listar(usuario, { estado, canal } = {}) {
  if (estado && !['aprobado', 'rechazado'].includes(estado)) throw new AppError(400, 'El filtro estado debe ser: aprobado o rechazado.');
  if (canal && !['pasarela', 'caja'].includes(canal)) throw new AppError(400, 'El filtro canal debe ser: pasarela o caja.');
  return pagosRepo.listar({ usuarioId: usuario.rol === 'cliente' ? usuario.id : undefined, estado, canal });
}

export async function cobrarEnCaja(cajero, datos) {
  exigirValido(validarCobroCaja(datos));
  const registro = await incidenciasRepo.buscarParaCobro(entero(datos.id_registro));
  if (!registro) throw new AppError(404, 'La solicitud no existe.');
  if (registro.estado_pago === 'pagado') throw new AppError(409, 'Esta solicitud ya fue pagada.');
  if (registro.estado_pago === 'exonerado' || registro.monto_calculado <= 0) throw new AppError(409, 'Esta solicitud no requiere pago.');

  const monto = registro.monto_calculado;
  let montoRecibido = null;
  let vuelto = null;
  if (datos.metodo === 'efectivo') {
    montoRecibido = redondear(Number(datos.monto_recibido));
    if (montoRecibido < monto) throw new AppError(400, `El monto recibido no cubre el total (S/ ${monto.toFixed(2)}).`);
    vuelto = redondear(montoRecibido - monto);
  }

  const codigo = generarCodigo('CJ');
  return conTransaccion(async (cliente) => {
    const bloqueado = await incidenciasRepo.bloquearParaPago(cliente, registro.id);
    if (!bloqueado || bloqueado.estado_pago !== 'pendiente') throw new AppError(409, 'Esta solicitud ya fue pagada.');

    const pago = await pagosRepo.insertar(cliente, {
      codigo, idRegistro: registro.id, idUsuario: registro.usuario_id, canal: 'caja', metodo: datos.metodo,
      referencia: datos.metodo === 'pos' ? texto(datos.referencia) : null,
      monto, montoRecibido, vuelto, estado: 'aprobado', idCajero: cajero.id,
    });
    await incidenciasRepo.marcarPagada(cliente, registro.id, 'caja');
    return pago;
  });
}

// Solo el administrador verifica, y nunca un pago que cobró él mismo (separación de funciones).
export async function verificar(admin, idRuta) {
  const id = idDeRuta(idRuta);
  const pago = await pagosRepo.buscarPorId(id);
  if (!pago) throw new AppError(404, 'El pago no existe.');
  if (pago.estado !== 'aprobado') throw new AppError(409, 'Solo se verifican pagos aprobados.');
  if (pago.verificado) throw new AppError(409, 'Este pago ya fue verificado.');
  if (pago.id_cajero === admin.id) throw new AppError(403, 'No puedes verificar un pago que cobraste tú.');

  if (!(await pagosRepo.marcarVerificado(id, admin.id))) throw new AppError(409, 'Este pago ya fue verificado.');
  return pagosRepo.buscarPorId(id);
}

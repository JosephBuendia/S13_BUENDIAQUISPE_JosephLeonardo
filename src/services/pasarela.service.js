// Pasarela de pago SIMULADA. Flujo: (1) consulta a la entidad emisora/billetera, (2) autoriza o rechaza,
// (3) si aprueba: descuenta saldo + registra el pago + marca la incidencia en UNA transacción.
import { pool, conTransaccion } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { generarCodigo } from '../utils/codigos.js';
import {
  exigirValido, validarPagoTarjeta, validarPagoBilletera, validarVencimiento,
  soloDigitos, enmascararTarjeta, enmascararCelular, entero,
} from '../utils/validaciones.js';
import * as incidenciasRepo from '../repositories/incidencias.repository.js';
import * as pagosRepo from '../repositories/pagos.repository.js';

// El monto sale de la BD y el registro debe ser del usuario que paga.
async function cargarRegistroPagable(idRegistro, usuario) {
  const registro = await incidenciasRepo.buscarPropiaPorId(idRegistro, usuario.id);
  if (!registro) throw new AppError(404, 'La solicitud no existe.');
  if (registro.estado_pago === 'pagado') throw new AppError(409, 'Esta solicitud ya fue pagada.');
  if (registro.estado_pago === 'exonerado' || registro.monto_calculado <= 0) {
    throw new AppError(409, 'Esta solicitud no requiere pago.');
  }
  return registro;
}

// Todo intento rechazado también se guarda: el cajero y el auditor deben verlo.
async function rechazar({ registro, usuario, metodo, proveedor, marca, referencia, motivo }) {
  const codigo = generarCodigo('RCH');
  await pagosRepo.insertar(pool, {
    codigo, idRegistro: registro.id, idUsuario: usuario.id, canal: 'pasarela', metodo, proveedor, marca,
    referencia, monto: registro.monto_calculado, estado: 'rechazado', motivoRechazo: motivo,
  });
  return { aprobado: false, codigo, motivo };
}

// Traduce errores de PostgreSQL a mensajes para el usuario.
function motivoDesdeError(error) {
  if (error.code === '23514') return 'Saldo insuficiente al momento de confirmar.'; // CHECK saldo >= 0
  if (error.code === '23505') return 'Esta solicitud ya fue pagada.'; // índice único: un aprobado por registro
  return 'Error de comunicación con la entidad. No se realizó ningún cargo.';
}

// Las tres sentencias se confirman juntas o no se confirma ninguna.
async function confirmarCobro({ registro, usuario, metodo, proveedor, marca, referencia, monto, descontarSaldo }) {
  const codigo = generarCodigo('OP');
  try {
    await conTransaccion(async (cliente) => {
      const bloqueado = await incidenciasRepo.bloquearParaPago(cliente, registro.id);
      if (!bloqueado || bloqueado.estado_pago !== 'pendiente') throw new AppError(409, 'Esta solicitud ya fue pagada.');

      if (!(await descontarSaldo(cliente))) throw new Error('No se pudo actualizar el saldo.');
      await pagosRepo.insertar(cliente, {
        codigo, idRegistro: registro.id, idUsuario: usuario.id, canal: 'pasarela', metodo,
        proveedor, marca, referencia, monto, estado: 'aprobado',
      });
      if (!(await incidenciasRepo.marcarPagada(cliente, registro.id, 'pasarela'))) throw new AppError(409, 'Esta solicitud ya fue pagada.');
    });
    return { aprobado: true, codigo, monto };
  } catch (error) {
    if (error instanceof AppError) throw error; // ya hubo ROLLBACK; no es un rechazo del banco
    console.error(error);
    return rechazar({ registro, usuario, metodo, proveedor, marca, referencia, motivo: motivoDesdeError(error) });
  }
}

export async function pagarConTarjeta(usuario, datos) {
  const { errores, marca } = validarPagoTarjeta(datos);
  exigirValido(errores);
  const venc = validarVencimiento(datos.vencimiento);
  const registro = await cargarRegistroPagable(entero(datos.id_registro), usuario);

  const pan = soloDigitos(datos.numero);
  const referencia = enmascararTarjeta(pan); // en "pagos" solo se guardan los últimos 4 dígitos
  const monto = registro.monto_calculado;

  const tarjeta = await pagosRepo.buscarTarjetaConCuenta(pan);
  const metodo = tarjeta?.tipo === 'credito' ? 'tarjeta_credito' : 'tarjeta_debito';
  const base = { registro, usuario, metodo, marca, referencia };

  if (!tarjeta) return rechazar({ ...base, motivo: 'Tarjeta no reconocida por la entidad emisora.' });
  if (tarjeta.estado !== 'activa') return rechazar({ ...base, motivo: 'Tarjeta bloqueada. Comunícate con tu entidad.' });
  if (tarjeta.mes_venc !== venc.mes || tarjeta.anio_venc !== venc.anio) return rechazar({ ...base, motivo: 'Fecha de vencimiento incorrecta.' });
  if (tarjeta.cvv !== datos.cvv) return rechazar({ ...base, motivo: 'Código de seguridad incorrecto.' });
  if (tarjeta.saldo_disponible < monto) {
    return rechazar({ ...base, motivo: tarjeta.tipo === 'credito' ? 'Línea de crédito insuficiente.' : 'Saldo insuficiente en la cuenta de ahorros.' });
  }

  return confirmarCobro({
    ...base, monto,
    descontarSaldo: (cliente) => pagosRepo.descontarSaldoCuenta(cliente, tarjeta.id_cuenta, monto),
  });
}

export async function pagarConBilletera(usuario, datos) {
  exigirValido(validarPagoBilletera(datos));
  const registro = await cargarRegistroPagable(entero(datos.id_registro), usuario);

  const celular = soloDigitos(datos.celular);
  const base = { registro, usuario, metodo: 'billetera', proveedor: datos.proveedor, referencia: enmascararCelular(celular) };
  const monto = registro.monto_calculado;

  const billetera = await pagosRepo.buscarBilletera(datos.proveedor, celular);
  if (!billetera) return rechazar({ ...base, motivo: 'El celular no está afiliado a esa billetera.' });
  if (billetera.codigo_aprobacion !== datos.codigo_aprobacion) return rechazar({ ...base, motivo: 'Código de aprobación incorrecto.' });
  if (billetera.saldo_disponible < monto) return rechazar({ ...base, motivo: 'Saldo insuficiente en la billetera.' });

  return confirmarCobro({
    ...base, monto,
    descontarSaldo: (cliente) => pagosRepo.descontarSaldoBilletera(cliente, billetera.id, monto),
  });
}

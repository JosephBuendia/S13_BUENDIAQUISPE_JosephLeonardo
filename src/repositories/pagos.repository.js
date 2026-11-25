import { pool } from '../config/db.js';

// ---------- entidades simuladas (banco y billeteras) ----------
// REPLACE(...) tolera números guardados con o sin espacios.
export async function buscarTarjetaConCuenta(pan) {
  const { rows } = await pool.query(
    `SELECT t.tipo, t.mes_venc, t.anio_venc, t.cvv, t.estado,
            c.id AS id_cuenta, c.saldo_disponible
       FROM banco_tarjetas t
       JOIN banco_cuentas c ON c.id = t.id_cuenta
      WHERE REPLACE(t.numero, ' ', '') = $1`,
    [pan]
  );
  return rows[0] ?? null;
}

export async function buscarBilletera(proveedor, celular) {
  const { rows } = await pool.query(
    'SELECT id, saldo_disponible, codigo_aprobacion FROM billeteras WHERE proveedor = $1 AND celular = $2',
    [proveedor, celular]
  );
  return rows[0] ?? null;
}

// El CHECK (saldo_disponible >= 0) de la tabla impide quedar en negativo aunque dos pagos choquen.
export async function descontarSaldoCuenta(db, idCuenta, monto) {
  const { rowCount } = await db.query(
    'UPDATE banco_cuentas SET saldo_disponible = saldo_disponible - $1 WHERE id = $2',
    [monto, idCuenta]
  );
  return rowCount === 1;
}

export async function descontarSaldoBilletera(db, idBilletera, monto) {
  const { rowCount } = await db.query(
    'UPDATE billeteras SET saldo_disponible = saldo_disponible - $1 WHERE id = $2',
    [monto, idBilletera]
  );
  return rowCount === 1;
}

// ---------- pagos ----------
// "db" puede ser el pool (sentencia suelta) o un cliente de transacción.
export async function insertar(db, p) {
  const { rows } = await db.query(
    `INSERT INTO pagos
       (codigo_operacion, id_registro, id_usuario, canal, metodo, proveedor_billetera, marca_tarjeta,
        referencia, monto, monto_recibido, vuelto, estado, motivo_rechazo, id_cajero)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id, codigo_operacion, estado, monto, monto_recibido, vuelto, fecha_pago`,
    [p.codigo, p.idRegistro, p.idUsuario, p.canal, p.metodo, p.proveedor ?? null, p.marca ?? null,
     p.referencia ?? null, p.monto, p.montoRecibido ?? null, p.vuelto ?? null, p.estado,
     p.motivoRechazo ?? null, p.idCajero ?? null]
  );
  return rows[0];
}

const SELECT_PAGO = `
  SELECT p.id, p.codigo_operacion, p.id_registro, i.codigo AS codigo_registro, p.id_usuario, p.canal, p.metodo,
         p.proveedor_billetera, p.marca_tarjeta, p.referencia, p.monto, p.monto_recibido, p.vuelto,
         p.estado, p.motivo_rechazo, p.id_cajero, p.verificado, p.verificado_por, p.fecha_verificacion, p.fecha_pago
    FROM pagos p
    JOIN incidencias i ON i.id = p.id_registro`;

export async function listar({ usuarioId, estado, canal } = {}) {
  const condiciones = [];
  const valores = [];
  if (usuarioId) { valores.push(usuarioId); condiciones.push(`p.id_usuario = $${valores.length}`); }
  if (estado) { valores.push(estado); condiciones.push(`p.estado = $${valores.length}`); }
  if (canal) { valores.push(canal); condiciones.push(`p.canal = $${valores.length}`); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await pool.query(`${SELECT_PAGO} ${where} ORDER BY p.fecha_pago DESC, p.id DESC LIMIT 500`, valores);
  return rows;
}

export async function buscarPorId(id) {
  const { rows } = await pool.query(`${SELECT_PAGO} WHERE p.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function marcarVerificado(id, idVerificador) {
  const { rows } = await pool.query(
    `UPDATE pagos SET verificado = TRUE, verificado_por = $2, fecha_verificacion = NOW()
      WHERE id = $1 AND verificado = FALSE AND estado = 'aprobado'
      RETURNING id`,
    [id, idVerificador]
  );
  return rows[0] ?? null;
}

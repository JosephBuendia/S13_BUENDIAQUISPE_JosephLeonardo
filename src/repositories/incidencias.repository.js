import { pool } from '../config/db.js';

const COLUMNAS = `id, codigo, usuario_id, cliente, dni, suministro_zona, tipo_incidencia AS tipo_incidente, unidad, estado,
  sustento, respuesta, fecha_registro, monto_calculado, estado_pago, canal_pago, fecha_pago, telefono, urgencia`;

// Los filtros opcionales agregan condiciones; los VALORES siempre viajan aparte en el arreglo (nunca dentro del texto SQL).
export async function listar({ usuarioId, estado, estadoPago } = {}) {
  const condiciones = [];
  const valores = [];
  if (usuarioId) { valores.push(usuarioId); condiciones.push(`usuario_id = $${valores.length}`); }
  if (estado) { valores.push(estado); condiciones.push(`estado = $${valores.length}`); }
  if (estadoPago) { valores.push(estadoPago); condiciones.push(`estado_pago = $${valores.length}`); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM incidencias ${where} ORDER BY fecha_registro DESC, id DESC LIMIT 500`,
    valores
  );
  return rows;
}

export async function buscarPorCodigo(codigo) {
  const { rows } = await pool.query(`SELECT ${COLUMNAS} FROM incidencias WHERE codigo = $1`, [codigo]);
  return rows[0] ?? null;
}

export async function crear(d) {
  const { rows } = await pool.query(
    `INSERT INTO incidencias
       (codigo, usuario_id, cliente, dni, suministro_zona, tipo_incidencia, sustento,
        monto_calculado, estado_pago, telefono, urgencia)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING ${COLUMNAS}`,
    [d.codigo, d.usuarioId, d.cliente, d.dni, d.suministroZona, d.tipoIncidente, d.sustento,
     d.montoCalculado, d.estadoPago, d.telefono, d.urgencia]
  );
  return rows[0];
}

// COALESCE($n, columna): si el campo opcional no se envió (null), conserva el valor actual.
export async function actualizar(codigo, d) {
  const { rows } = await pool.query(
    `UPDATE incidencias
        SET tipo_incidencia = $2,
            suministro_zona = $3,
            sustento        = $4,
            unidad          = COALESCE($5, unidad),
            estado          = COALESCE($6, estado),
            respuesta       = COALESCE($7, respuesta),
            urgencia        = COALESCE($8, urgencia),
            telefono        = COALESCE($9, telefono)
      WHERE codigo = $1
      RETURNING ${COLUMNAS}`,
    [codigo, d.tipoIncidente, d.suministroZona, d.sustento, d.unidad, d.estado, d.respuesta, d.urgencia, d.telefono]
  );
  return rows[0] ?? null;
}

export async function actualizarEstado(codigo, estado, respuesta) {
  const { rows } = await pool.query(
    `UPDATE incidencias SET estado = $2, respuesta = COALESCE($3, respuesta)
      WHERE codigo = $1 RETURNING ${COLUMNAS}`,
    [codigo, estado, respuesta]
  );
  return rows[0] ?? null;
}

export async function contarPagos(idRegistro) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM pagos WHERE id_registro = $1', [idRegistro]);
  return rows[0].total;
}

export async function eliminar(codigo) {
  const { rows } = await pool.query('DELETE FROM incidencias WHERE codigo = $1 RETURNING id', [codigo]);
  return rows[0] ?? null;
}

// Vista pública y mínima para el seguimiento ciudadano (sin DNI, teléfono ni nombre).
export async function buscarSeguimiento(codigo) {
  const { rows } = await pool.query(
    `SELECT codigo, tipo_incidencia AS tipo_incidente, unidad, estado, respuesta, fecha_registro, estado_pago
       FROM incidencias WHERE codigo = $1`,
    [codigo]
  );
  return rows[0] ?? null;
}

// ---------- apoyo a pagos ----------
// El monto SIEMPRE se lee de la BD, nunca del formulario. "usuario_id = $2" garantiza que solo pagues lo tuyo.
export async function buscarPropiaPorId(id, usuarioId) {
  const { rows } = await pool.query(
    'SELECT id, codigo, usuario_id, monto_calculado, estado_pago FROM incidencias WHERE id = $1 AND usuario_id = $2',
    [id, usuarioId]
  );
  return rows[0] ?? null;
}

export async function buscarParaCobro(id) {
  const { rows } = await pool.query(
    'SELECT id, codigo, usuario_id, monto_calculado, estado_pago FROM incidencias WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function listarPendientesDeUsuario(usuarioId) {
  const { rows } = await pool.query(
    `SELECT id, codigo, tipo_incidencia AS tipo_incidente, monto_calculado, fecha_registro
       FROM incidencias WHERE usuario_id = $1 AND estado_pago = 'pendiente'
      ORDER BY fecha_registro DESC`,
    [usuarioId]
  );
  return rows;
}

export async function listarPendientesDeCobro() {
  const { rows } = await pool.query(
    `SELECT id, codigo, cliente, dni, tipo_incidencia AS tipo_incidente, monto_calculado, fecha_registro
       FROM incidencias WHERE estado_pago = 'pendiente'
      ORDER BY fecha_registro ASC LIMIT 500`
  );
  return rows;
}

// Dentro de una transacción: bloquea la fila para que dos pagos simultáneos no cobren dos veces.
export async function bloquearParaPago(db, id) {
  const { rows } = await db.query('SELECT id, estado_pago FROM incidencias WHERE id = $1 FOR UPDATE', [id]);
  return rows[0] ?? null;
}

export async function marcarPagada(db, id, canal) {
  const { rowCount } = await db.query(
    `UPDATE incidencias
        SET estado_pago = 'pagado', canal_pago = $2, fecha_pago = NOW()
      WHERE id = $1 AND estado_pago = 'pendiente'`,
    [id, canal]
  );
  return rowCount === 1;
}

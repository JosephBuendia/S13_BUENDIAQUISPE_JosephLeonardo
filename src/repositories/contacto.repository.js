import { pool } from '../config/db.js';

const COLUMNAS = 'id, usuario_id, nombres, apellidos, dni, telefono, correo, asunto, mensaje, fecha_envio';

export async function crear(d) {
  const { rows } = await pool.query(
    `INSERT INTO mensajes_contacto (usuario_id, nombres, apellidos, dni, telefono, correo, asunto, mensaje)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLUMNAS}`,
    [d.usuarioId, d.nombres, d.apellidos, d.dni, d.telefono, d.correo, d.asunto, d.mensaje]
  );
  return rows[0];
}

export async function listar() {
  const { rows } = await pool.query(`SELECT ${COLUMNAS} FROM mensajes_contacto ORDER BY fecha_envio DESC, id DESC LIMIT 500`);
  return rows;
}

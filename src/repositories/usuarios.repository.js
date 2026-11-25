import { pool } from '../config/db.js';

const PUBLICAS = 'id, nombre, dni, correo, rol, turno, fecha_registro'; // nunca "contrasena"

// Incluye la contraseña (hash): SOLO para el login.
export async function buscarPorCorreoConClave(correo) {
  const { rows } = await pool.query(
    `SELECT ${PUBLICAS}, contrasena FROM usuarios WHERE LOWER(correo) = LOWER($1)`,
    [correo]
  );
  return rows[0] ?? null;
}

export async function buscarPorCorreo(correo) {
  const { rows } = await pool.query(`SELECT ${PUBLICAS} FROM usuarios WHERE LOWER(correo) = LOWER($1)`, [correo]);
  return rows[0] ?? null;
}

export async function buscarPorId(id) {
  const { rows } = await pool.query(`SELECT ${PUBLICAS} FROM usuarios WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function buscarPorDni(dni) {
  const { rows } = await pool.query(`SELECT id FROM usuarios WHERE dni = $1`, [dni]);
  return rows[0] ?? null;
}

export async function crear({ nombre, correo, dni = null, contrasenaHash, rol = 'cliente' }) {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, correo, dni, contrasena, rol)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLICAS}`,
    [nombre, correo, dni, contrasenaHash, rol]
  );
  return rows[0];
}

export async function actualizarContrasena(id, contrasenaHash) {
  await pool.query('UPDATE usuarios SET contrasena = $1 WHERE id = $2', [contrasenaHash, id]);
}

// Lista de vecinos con búsqueda opcional por nombre, correo o DNI.
export async function listarClientes(busqueda) {
  const valores = ['cliente'];
  let filtro = '';
  if (busqueda) {
    // Escapamos % y _ para que el texto del usuario no actúe como comodín
    valores.push(`%${busqueda.replace(/[\\%_]/g, '\\$&')}%`);
    filtro = 'AND (nombre ILIKE $2 OR correo ILIKE $2 OR dni ILIKE $2)';
  }
  const { rows } = await pool.query(
    `SELECT ${PUBLICAS} FROM usuarios WHERE rol = $1 ${filtro} ORDER BY id DESC LIMIT 200`,
    valores
  );
  return rows;
}

export async function buscarClientePorId(id) {
  const { rows } = await pool.query(`SELECT ${PUBLICAS} FROM usuarios WHERE id = $1 AND rol = 'cliente'`, [id]);
  return rows[0] ?? null;
}

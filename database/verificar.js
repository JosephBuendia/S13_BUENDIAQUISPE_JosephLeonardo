// "npm run db:verificar": comprueba la conexión con Neon y muestra tus tablas con su cantidad de filas.
// Útil para el video: no imprime contraseñas ni la cadena de conexión.
import { pool } from '../src/config/db.js';

const TABLAS = ['usuarios', 'incidencias', 'alertas_auxilio', 'mensajes_contacto', 'pagos',
  'banco_cuentas', 'banco_tarjetas', 'billeteras']; // lista fija: nunca viene del usuario

try {
  const { rows } = await pool.query('SELECT current_database() AS bd, version() AS version');
  console.log(`Conectado a "${rows[0].bd}" (${rows[0].version.split(',')[0]})\n`);

  for (const tabla of TABLAS) {
    const r = await pool.query(`SELECT COUNT(*)::int AS filas FROM ${tabla}`);
    console.log(`${tabla.padEnd(20)} ${String(r.rows[0].filas).padStart(4)} filas`);
  }

  const roles = await pool.query('SELECT rol, COUNT(*)::int AS total FROM usuarios GROUP BY rol ORDER BY rol');
  console.log('\nUsuarios por rol:');
  roles.rows.forEach((f) => console.log(`  ${f.rol.padEnd(14)} ${f.total}`));

  const legado = await pool.query("SELECT COUNT(*)::int AS total FROM usuarios WHERE contrasena NOT LIKE '$2%'");
  console.log(`\nContraseñas sin cifrar (bcrypt) pendientes de migrar: ${legado.rows[0].total}`);
} catch (error) {
  console.error('No se pudo consultar Neon:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

// "npm run db:migrar-claves"            -> solo MUESTRA cuántas contraseñas están sin cifrar (simulacro).
// "npm run db:migrar-claves -- --aplicar" -> las convierte a bcrypt. Después los usuarios entran con la misma clave.
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

const aplicar = process.argv.includes('--aplicar');

try {
  const { rows } = await pool.query("SELECT id, contrasena FROM usuarios WHERE contrasena NOT LIKE '$2%'");
  console.log(`Contraseñas sin cifrar: ${rows.length}`);
  if (!aplicar) {
    console.log('Simulacro: no se cambió nada. Ejecuta con "-- --aplicar" para migrarlas.');
  } else {
    for (const { id, contrasena } of rows) {
      await pool.query('UPDATE usuarios SET contrasena = $1 WHERE id = $2', [await bcrypt.hash(contrasena, 10), id]);
    }
    console.log(`Migradas a bcrypt: ${rows.length}. Ya puedes poner ACEPTAR_CLAVES_LEGADO=false.`);
  }
} catch (error) {
  console.error('No se pudo migrar:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

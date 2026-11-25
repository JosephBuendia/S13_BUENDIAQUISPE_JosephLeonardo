// Conexión a Neon (PostgreSQL). Un único Pool compartido por todos los repositories.
// La cadena viene de DATABASE_URL (.env en local, Environment Variables en Render): nunca escrita en el código.
import pg from 'pg';
import { env } from './env.js';

if (!env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL. Copia .env.example como .env y pega tu cadena de Neon.');
}

// timestamp SIN zona: Neon trabaja en UTC, así que lo devolvemos como ISO con "Z".
// Así el navegador lo convierte bien a la hora de Perú.
pg.types.setTypeParser(1114, (v) => v.replace(' ', 'T') + 'Z');
// numeric llega como texto por defecto: lo convertimos a número (montos y saldos).
pg.types.setTypeParser(1700, (v) => Number(v));

const esLocal = /@(localhost|127\.0\.0\.1)/.test(env.DATABASE_URL);
const usarSsl = env.DB_SSL ? env.DB_SSL === 'true' : !esLocal;

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: usarSsl ? { rejectUnauthorized: true } : false,
  max: 5, // el plan gratuito de Neon tiene pocas conexiones
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Neon cierra conexiones inactivas; sin este manejador un cierre tumbaría el proceso.
pool.on('error', (e) => console.error('Conexión inactiva con Neon cerrada:', e.message));

// Ejecuta varias sentencias como UNA unidad: o se confirman todas (COMMIT) o ninguna (ROLLBACK).
// La usan los pagos: descontar saldo + registrar pago + marcar la incidencia.
export async function conTransaccion(trabajo) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    try { await cliente.query('ROLLBACK'); } catch { /* la conexión ya estaba rota */ }
    throw error;
  } finally {
    cliente.release();
  }
}

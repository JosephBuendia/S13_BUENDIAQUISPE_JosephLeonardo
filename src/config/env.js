// Lee las variables de entorno UNA sola vez y las expone ordenadas.
// Ningún otro archivo toca process.env directamente.
import 'dotenv/config';

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_SSL: process.env.DB_SSL, // opcional: 'true' | 'false' (por defecto, SSL salvo en localhost)
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRA: process.env.JWT_EXPIRA || '8h',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  ACEPTAR_CLAVES_LEGADO: process.env.ACEPTAR_CLAVES_LEGADO !== 'false',
};

// Se llama al arrancar el servidor: si falta algo, la API no inicia (falla rápido y con mensaje claro).
export function validarEntorno() {
  const faltan = ['DATABASE_URL', 'JWT_SECRET'].filter((n) => !process.env[n]);
  if (faltan.length) {
    throw new Error(`Faltan variables de entorno: ${faltan.join(', ')}. Copia .env.example como .env y complétalo.`);
  }
  if (env.JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET es muy corto: usa al menos 16 caracteres aleatorios.');
  }
}

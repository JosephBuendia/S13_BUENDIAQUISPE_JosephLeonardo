// Freno contra fuerza bruta: máximo N intentos por IP en una ventana de tiempo (en memoria).
import { AppError } from '../utils/AppError.js';

export function limitarIntentos({ max = 10, ventanaMs = 15 * 60 * 1000 } = {}) {
  const intentos = new Map(); // ip -> { n, reinicio }

  setInterval(() => {
    const ahora = Date.now();
    for (const [ip, d] of intentos) if (d.reinicio <= ahora) intentos.delete(ip);
  }, ventanaMs).unref();

  return (req, res, next) => {
    const ahora = Date.now();
    const dato = intentos.get(req.ip);
    if (!dato || dato.reinicio <= ahora) {
      intentos.set(req.ip, { n: 1, reinicio: ahora + ventanaMs });
      return next();
    }
    dato.n += 1;
    if (dato.n > max) {
      res.set('Retry-After', String(Math.ceil((dato.reinicio - ahora) / 1000)));
      return next(new AppError(429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'));
    }
    next();
  };
}

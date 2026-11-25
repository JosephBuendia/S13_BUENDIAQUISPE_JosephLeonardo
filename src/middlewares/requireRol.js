// Autorización: va DESPUÉS de autenticar. Deja pasar solo a los roles indicados; otro rol -> 403.
import { AppError } from '../utils/AppError.js';

export const requireRol = (...rolesPermitidos) => (req, res, next) => {
  if (!req.usuario) return next(new AppError(401, 'Debes iniciar sesión para realizar esta acción.'));
  if (!rolesPermitidos.includes(req.usuario.rol)) {
    return next(new AppError(403, 'Tu rol no tiene permiso para realizar esta acción.'));
  }
  next();
};

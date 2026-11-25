// Autenticación: lee "Authorization: Bearer <token>", verifica la firma del JWT y deja los datos en req.usuario.
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

function leerToken(req) {
  const cabecera = req.headers.authorization;
  if (!cabecera) return null;
  const [tipo, token] = cabecera.split(' ');
  if (tipo !== 'Bearer' || !token) throw new AppError(401, 'Formato de autorización inválido. Usa: Bearer <token>.');
  return token;
}

function verificar(token) {
  try {
    const { id, rol, nombre } = jwt.verify(token, env.JWT_SECRET);
    return { id, rol, nombre };
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw new AppError(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
    throw new AppError(401, 'Token inválido.');
  }
}

// Ruta protegida: sin token -> 401.
export function autenticar(req, res, next) {
  try {
    const token = leerToken(req);
    if (!token) throw new AppError(401, 'Debes iniciar sesión para realizar esta acción.');
    req.usuario = verificar(token);
    next();
  } catch (error) {
    next(error);
  }
}

// Ruta que acepta anónimos (contacto, botón de auxilio): si trae token válido se asocia al usuario.
export function autenticarOpcional(req, res, next) {
  try {
    const token = leerToken(req);
    if (token) req.usuario = verificar(token);
    next();
  } catch (error) {
    next(error);
  }
}

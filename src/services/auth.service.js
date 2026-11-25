// Reglas de negocio de la sesión: registrar, iniciar sesión y emitir el token.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { exigirValido, validarRegistro, validarLogin, texto } from '../utils/validaciones.js';
import * as usuariosRepo from '../repositories/usuarios.repository.js';

const RONDAS = 10;
// Hash falso para gastar el mismo tiempo cuando el correo no existe (evita adivinar qué correos están registrados).
const HASH_FALSO = bcrypt.hashSync('contrasena-inexistente', RONDAS);
const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos.';

const iguales = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function registrar(datos) {
  exigirValido(validarRegistro(datos));
  const correo = texto(datos.correo).toLowerCase();

  if (await usuariosRepo.buscarPorCorreo(correo)) throw new AppError(409, 'Ese correo ya está registrado.');

  const contrasenaHash = await bcrypt.hash(datos.contrasena, RONDAS);
  // El rol NO viene del body: todo registro público es "cliente" (si no, cualquiera se haría administrador).
  const usuario = await usuariosRepo.crear({ nombre: texto(datos.nombre), correo, contrasenaHash, rol: 'cliente' });
  return { mensaje: 'Cuenta creada correctamente. Ya puedes iniciar sesión.', usuario };
}

export async function iniciarSesion(datos) {
  exigirValido(validarLogin(datos));
  const correo = texto(datos.correo).toLowerCase();

  const fila = await usuariosRepo.buscarPorCorreoConClave(correo);
  const guardada = fila?.contrasena ?? '';
  const esBcrypt = guardada.startsWith('$2');

  let correcta = false;
  if (!fila) {
    await bcrypt.compare(datos.contrasena, HASH_FALSO); // mismo costo de tiempo
  } else if (esBcrypt) {
    correcta = await bcrypt.compare(datos.contrasena, guardada);
  } else if (env.ACEPTAR_CLAVES_LEGADO) {
    // Cuenta antigua con clave en texto plano: se acepta UNA vez y se convierte a bcrypt.
    correcta = iguales(datos.contrasena, guardada);
    if (correcta) await usuariosRepo.actualizarContrasena(fila.id, await bcrypt.hash(datos.contrasena, RONDAS));
  }

  if (!correcta) throw new AppError(401, MENSAJE_CREDENCIALES);

  const { contrasena, ...usuario } = fila; // la contraseña jamás sale de este archivo
  const token = jwt.sign({ id: usuario.id, rol: usuario.rol, nombre: usuario.nombre }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRA,
  });
  return { usuario, token };
}

export async function perfil(idUsuario) {
  const usuario = await usuariosRepo.buscarPorId(idUsuario);
  if (!usuario) throw new AppError(404, 'El usuario ya no existe.');
  return usuario;
}

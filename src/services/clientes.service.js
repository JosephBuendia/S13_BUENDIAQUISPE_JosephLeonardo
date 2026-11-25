// Vecinos (usuarios con rol "cliente") gestionados por el personal.
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError.js';
import { exigirValido, validarCliente, texto, idDeRuta } from '../utils/validaciones.js';
import * as usuariosRepo from '../repositories/usuarios.repository.js';

export const listar = (busqueda) => usuariosRepo.listarClientes(texto(busqueda).slice(0, 60));

export async function obtener(idRuta) {
  const cliente = await usuariosRepo.buscarClientePorId(idDeRuta(idRuta));
  if (!cliente) throw new AppError(404, 'El cliente no existe.');
  return cliente;
}

export async function crear(datos) {
  exigirValido(validarCliente(datos));
  const correo = texto(datos.correo).toLowerCase();
  const dni = texto(datos.dni) || null;

  if (await usuariosRepo.buscarPorCorreo(correo)) throw new AppError(409, 'Ese correo ya está registrado.');
  if (dni && await usuariosRepo.buscarPorDni(dni)) throw new AppError(409, 'Ese DNI ya está registrado.');

  const contrasenaHash = await bcrypt.hash(datos.contrasena, 10);
  return usuariosRepo.crear({ nombre: texto(datos.nombre), correo, dni, contrasenaHash, rol: 'cliente' });
}

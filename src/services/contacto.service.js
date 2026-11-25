import { exigirValido, validarContacto, texto, soloDigitos } from '../utils/validaciones.js';
import * as contactoRepo from '../repositories/contacto.repository.js';

export async function registrar(usuario, datos) {
  exigirValido(validarContacto(datos));
  return contactoRepo.crear({
    usuarioId: usuario?.id ?? null, // si trae sesión, el mensaje queda asociado al usuario
    nombres: texto(datos.nombres),
    apellidos: texto(datos.apellidos),
    dni: texto(datos.dni) || null,
    telefono: soloDigitos(datos.telefono),
    correo: texto(datos.correo).toLowerCase(),
    asunto: datos.asunto,
    mensaje: texto(datos.mensaje),
  });
}

export const listar = () => contactoRepo.listar();

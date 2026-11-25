// Validaciones del SERVIDOR. Funciones puras: reciben el body y devuelven { campo: "mensaje" }.
// Objeto vacío = todo correcto. Aunque el frontend ya valide, aquí se repite todo: el navegador se puede saltar.
import { AppError } from './AppError.js';
import {
  TIPOS_INCIDENTE, SECTORES, ASUNTOS_CONTACTO, ESTADOS_INCIDENCIA, ESTADOS_ALERTA, URGENCIAS,
} from './catalogos.js';

// ---------- utilidades ----------
export const soloDigitos = (t) => String(t ?? '').replace(/\D/g, '');
export const texto = (v) => (typeof v === 'string' ? v.trim() : '');

// Acepta 3 o "3"; rechaza 3.5, "", "abc", null.
export function entero(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? v : NaN;
  if (typeof v === 'string' && v.trim() !== '') return Number.isInteger(Number(v)) ? Number(v) : NaN;
  return NaN;
}

// Si hay errores, lanza 400 con el primer mensaje y el detalle completo.
export function exigirValido(errores) {
  const campos = Object.keys(errores);
  if (campos.length) throw new AppError(400, errores[campos[0]], errores);
}

export const normalizarEstadoIncidencia = (e) => texto(e).toUpperCase().replace(/\s+/g, '_');
export const normalizarEstadoAlerta = (e) => texto(e).toLowerCase().replace(/\s+/g, '_');

// ---------- campos sueltos ----------
export const validarCorreo = (c) => typeof c === 'string' && c.trim().length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim());
export const validarNombre = (n) => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]{2,100}$/.test(texto(n));
export const validarCelular = (c) => /^9\d{8}$/.test(soloDigitos(c));
export const validarDni = (d) => /^\d{8}$/.test(String(d ?? ''));

// ---------- tarjeta (misma lógica del frontend) ----------
export function validarLuhn(numero) {
  const d = soloDigitos(numero);
  if (d.length < 13 || d.length > 19) return false;
  let suma = 0;
  let duplicar = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (duplicar) { n *= 2; if (n > 9) n -= 9; }
    suma += n;
    duplicar = !duplicar;
  }
  return suma % 10 === 0;
}

export function detectarMarca(numero) {
  const n = soloDigitos(numero);
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'American Express';
  return null;
}

const LONGITUDES = { Visa: [13, 16, 19], Mastercard: [16], 'American Express': [15] };
export const longitudValida = (numero, marca) => (LONGITUDES[marca] ?? []).includes(soloDigitos(numero).length);

// "MM/AA" -> { mes, anio } si es válido y no venció; si no, null.
export function validarVencimiento(textoVenc, hoy = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(textoVenc ?? '');
  if (!m) return null;
  const mes = Number(m[1]);
  const anio = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return null;
  return new Date(anio, mes, 1) > hoy ? { mes, anio } : null; // vence al terminar el mes indicado
}

export const validarCVV = (cvv, marca) => new RegExp(`^\\d{${marca === 'American Express' ? 4 : 3}}$`).test(cvv ?? '');
export const validarTitular = (n) => /^[A-Za-zÁÉÍÓÚÑáéíóúñ ]{5,60}$/.test(texto(n));
export const validarCodigoAprobacion = (c) => /^\d{6}$/.test(c ?? '');

export const enmascararTarjeta = (numero) => '**** ' + soloDigitos(numero).slice(-4);
export const enmascararCelular = (cel) => '*** *** ' + soloDigitos(cel).slice(-3);

// ---------- validadores por formulario ----------
export function validarRegistro({ nombre, correo, contrasena } = {}) {
  const e = {};
  if (!validarNombre(nombre)) e.nombre = 'Ingresa tu nombre completo (solo letras, mínimo 2 caracteres).';
  if (!validarCorreo(correo)) e.correo = 'Ingresa un correo válido (ejemplo@dominio.com).';
  // bcrypt solo lee los primeros 72 bytes; por eso el máximo.
  if (typeof contrasena !== 'string' || contrasena.length < 4 || contrasena.length > 72) {
    e.contrasena = 'La contraseña debe tener entre 4 y 72 caracteres.';
  }
  return e;
}

export function validarLogin({ correo, contrasena } = {}) {
  const e = {};
  if (typeof correo !== 'string' || correo.trim() === '') e.correo = 'Ingresa tu correo.';
  else if (!validarCorreo(correo)) e.correo = 'El correo no tiene un formato válido.';
  if (typeof contrasena !== 'string' || contrasena === '') e.contrasena = 'Ingresa tu contraseña.';
  return e;
}

export function validarNuevaIncidencia(b = {}) {
  const e = {};
  if (!TIPOS_INCIDENTE.includes(b.tipo_incidente)) e.tipo_incidente = 'Selecciona un tipo de incidente válido.';
  if (!SECTORES.includes(b.sector)) e.sector = 'Selecciona un sector válido.';
  if (texto(b.direccion).length < 5 || texto(b.direccion).length > 120) e.direccion = 'La dirección o referencia debe tener entre 5 y 120 caracteres.';
  const d = texto(b.descripcion);
  if (d.length < 10 || d.length > 300) e.descripcion = 'La descripción debe tener entre 10 y 300 caracteres.';
  if (!validarCelular(b.telefono)) e.telefono = 'El celular debe empezar con 9 y tener 9 dígitos.';

  const horas = b.horas_resguardo === undefined ? 0 : entero(b.horas_resguardo); // 0 = alerta de auxilio
  const efectivos = b.efectivos_adicionales === undefined ? 0 : entero(b.efectivos_adicionales);
  if (!(horas >= 0 && horas <= 24)) e.horas_resguardo = 'Las horas de resguardo van de 0 a 24.';
  if (!(efectivos >= 0 && efectivos <= 10)) e.efectivos_adicionales = 'Los efectivos adicionales van de 0 a 10.';
  if (b.urgencia !== undefined && !URGENCIAS.includes(b.urgencia)) e.urgencia = `La urgencia debe ser: ${URGENCIAS.join(', ')}.`;
  return e;
}

export function validarEdicionIncidencia(b = {}) {
  const e = {};
  if (!TIPOS_INCIDENTE.includes(b.tipo_incidente)) e.tipo_incidente = 'Selecciona un tipo de incidente válido.';
  const zona = texto(b.suministro_zona);
  if (zona.length < 5 || zona.length > 200) e.suministro_zona = 'La zona/ubicación debe tener entre 5 y 200 caracteres.';
  const s = texto(b.sustento);
  if (s.length < 10 || s.length > 1000) e.sustento = 'El sustento debe tener entre 10 y 1000 caracteres.';
  if (b.unidad !== undefined && (texto(b.unidad) === '' || texto(b.unidad).length > 50)) e.unidad = 'La unidad debe tener entre 1 y 50 caracteres.';
  if (b.estado !== undefined && !ESTADOS_INCIDENCIA.includes(normalizarEstadoIncidencia(b.estado))) e.estado = `El estado debe ser: ${ESTADOS_INCIDENCIA.join(', ')}.`;
  if (b.respuesta !== undefined && texto(b.respuesta).length > 500) e.respuesta = 'La respuesta no puede pasar de 500 caracteres.';
  if (b.urgencia !== undefined && !URGENCIAS.includes(b.urgencia)) e.urgencia = `La urgencia debe ser: ${URGENCIAS.join(', ')}.`;
  if (b.telefono !== undefined && !validarCelular(b.telefono)) e.telefono = 'El celular debe empezar con 9 y tener 9 dígitos.';
  return e;
}

export function validarCambioEstado(b = {}, permitidos = ESTADOS_INCIDENCIA, normalizar = normalizarEstadoIncidencia) {
  const e = {};
  if (!permitidos.includes(normalizar(b.estado))) e.estado = `El estado debe ser: ${permitidos.join(', ')}.`;
  if (b.respuesta !== undefined && texto(b.respuesta).length > 500) e.respuesta = 'La respuesta no puede pasar de 500 caracteres.';
  return e;
}
export const validarCambioEstadoAlerta = (b) => validarCambioEstado(b, ESTADOS_ALERTA, normalizarEstadoAlerta);

export function validarContacto(b = {}) {
  const e = {};
  if (!validarNombre(b.nombres)) e.nombres = 'Ingresa tus nombres (mínimo 2 letras).';
  if (!validarNombre(b.apellidos)) e.apellidos = 'Ingresa tus apellidos (mínimo 2 letras).';
  if (texto(b.dni) !== '' && !validarDni(texto(b.dni))) e.dni = 'El DNI debe tener exactamente 8 dígitos.';
  if (!validarCelular(b.telefono)) e.telefono = 'El teléfono debe empezar con 9 y tener 9 dígitos.';
  if (!validarCorreo(b.correo)) e.correo = 'Ingresa un correo válido (ejemplo@dominio.com).';
  if (!ASUNTOS_CONTACTO.includes(b.asunto)) e.asunto = 'Selecciona un asunto válido.';
  const m = texto(b.mensaje);
  if (m.length < 10 || m.length > 1000) e.mensaje = 'El mensaje debe tener entre 10 y 1000 caracteres.';
  return e;
}

export function validarAlerta(b = {}) {
  const e = {};
  if (texto(b.ubicacion).length < 5 || texto(b.ubicacion).length > 200) e.ubicacion = 'La ubicación debe tener entre 5 y 200 caracteres.';
  const d = texto(b.descripcion);
  if (d.length < 10 || d.length > 500) e.descripcion = 'La descripción debe tener entre 10 y 500 caracteres.';
  if (b.nombre_vecino !== undefined && texto(b.nombre_vecino).length > 120) e.nombre_vecino = 'El nombre no puede pasar de 120 caracteres.';
  return e;
}

export function validarCliente(b = {}) {
  const e = validarRegistro(b);
  if (b.dni !== undefined && texto(b.dni) !== '' && !validarDni(texto(b.dni))) e.dni = 'El DNI debe tener exactamente 8 dígitos.';
  return e;
}

export function validarPagoTarjeta(b = {}) {
  const e = {};
  if (!(entero(b.id_registro) >= 1)) e.id_registro = 'Indica la solicitud que vas a pagar.';
  const marca = detectarMarca(b.numero);
  if (!marca) e.numero = 'Marca de tarjeta no reconocida.';
  else if (!longitudValida(b.numero, marca)) e.numero = `Una tarjeta ${marca} no tiene esa cantidad de dígitos.`;
  else if (!validarLuhn(b.numero)) e.numero = 'El número de tarjeta no es válido.';
  if (!validarVencimiento(b.vencimiento)) e.vencimiento = 'Fecha inválida o tarjeta vencida (formato MM/AA).';
  if (!validarCVV(b.cvv, marca)) e.cvv = marca === 'American Express' ? 'El CVV tiene 4 dígitos.' : 'El CVV tiene 3 dígitos.';
  if (!validarTitular(b.titular)) e.titular = 'Escribe el nombre como figura en la tarjeta.';
  return { errores: e, marca };
}

export function validarPagoBilletera(b = {}) {
  const e = {};
  if (!(entero(b.id_registro) >= 1)) e.id_registro = 'Indica la solicitud que vas a pagar.';
  if (!['andipay', 'pagomovil'].includes(b.proveedor)) e.proveedor = 'El proveedor debe ser andipay o pagomovil.';
  if (!validarCelular(b.celular)) e.celular = 'El celular debe empezar con 9 y tener 9 dígitos.';
  if (!validarCodigoAprobacion(b.codigo_aprobacion)) e.codigo_aprobacion = 'El código de aprobación tiene 6 dígitos.';
  return e;
}

export function validarCobroCaja(b = {}) {
  const e = {};
  if (!(entero(b.id_registro) >= 1)) e.id_registro = 'Indica la solicitud que se va a cobrar.';
  if (!['efectivo', 'pos'].includes(b.metodo)) e.metodo = 'El método debe ser efectivo o pos.';
  if (b.metodo === 'efectivo') {
    const r = Number(b.monto_recibido);
    if (b.monto_recibido === undefined || b.monto_recibido === '' || !Number.isFinite(r) || r <= 0 || r > 100000) {
      e.monto_recibido = 'Indica el monto recibido en efectivo.';
    }
  }
  if (b.metodo === 'pos') {
    const ref = texto(b.referencia);
    if (ref.length < 4 || ref.length > 30) e.referencia = 'Indica el número de voucher del POS (4 a 30 caracteres).';
  }
  return e;
}

// Parámetros de URL: ":id" debe ser un entero positivo.
export function idDeRuta(valor) {
  const n = entero(valor);
  if (!(n >= 1) || n > 2_147_483_647) throw new AppError(400, 'El identificador debe ser un número entero positivo.');
  return n;
}

import { randomInt } from 'node:crypto';

// Códigos legibles y difíciles de adivinar: PREFIJO-8 dígitos de hora + 3 aleatorios (caben en varchar(20)).
export function generarCodigo(prefijo) {
  return `${prefijo}-${Date.now().toString().slice(-8)}${randomInt(100, 1000)}`;
}

export const normalizarCodigo = (codigo) => String(codigo ?? '').trim().toUpperCase();
export const codigoValido = (codigo) => /^[A-Z0-9-]{4,20}$/.test(codigo);

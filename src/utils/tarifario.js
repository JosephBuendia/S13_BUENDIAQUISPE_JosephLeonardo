// Regla de negocio: tasa de resguardo en eventos privados. Funciones PURAS (sin BD ni red).
// El monto OFICIAL siempre lo calcula el servidor; el del frontend es solo una vista previa.
export const TARIFA_HORA = 50.0;
export const TARIFA_EFECTIVO_ADICIONAL = 20.0;

export const redondear = (valor) => Math.round(valor * 100) / 100;

// 0 horas = alerta de auxilio: nunca se cobra.
export function calcularMontoServicio({ horas_resguardo, efectivos_adicionales }) {
  const horas = Math.max(0, Math.trunc(Number(horas_resguardo) || 0));
  if (horas === 0) return 0;
  const efectivos = Math.max(0, Math.trunc(Number(efectivos_adicionales) || 0));
  return redondear(TARIFA_HORA * horas + TARIFA_EFECTIVO_ADICIONAL * efectivos);
}

export const estadoPagoInicial = (monto) => (monto === 0 ? 'exonerado' : 'pendiente');

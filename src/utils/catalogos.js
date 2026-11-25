// Listas permitidas. Son las mismas del frontend: el servidor no confía en lo que envía el navegador.
export const ROLES = ['cliente', 'empleado', 'cajero', 'administrador'];

export const TIPOS_INCIDENTE = [
  'Robo o asalto', 'Disturbios o riña', 'Accidente de tránsito',
  'Persona en riesgo', 'Ruidos molestos', 'Sospechoso en la zona', 'Otro',
];

export const SECTORES = [
  'Zona 1 — Huancayo Centro', 'Zona 2 — El Tambo', 'Zona 3 — Chilca',
  'Zona 4 — Pilcomayo', 'Zona 5 — San Agustín de Cajas',
];

export const ASUNTOS_CONTACTO = [
  'Consulta Administrativa', 'Solicitud de Capacitación / Charla Vecinal', 'Sugerencia de Mejora',
  'Felicitación al Personal', 'Queja o Reclamo', 'Otro Motivo',
];

export const ESTADOS_INCIDENCIA = ['PENDIENTE', 'EN_PROCESO', 'ATENDIDO', 'RECHAZADO'];
export const ESTADOS_ALERTA = ['registrado', 'en_proceso', 'atendido', 'rechazado']; // CHECK de la tabla
export const URGENCIAS = ['baja', 'media', 'alta'];

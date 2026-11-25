// Error "esperado" con código HTTP. Los services lo lanzan; errorHandler lo convierte en JSON.
export class AppError extends Error {
  constructor(status, mensaje, errores = null) {
    super(mensaje);
    this.status = status;
    this.errores = errores; // detalle por campo (opcional)
  }
}

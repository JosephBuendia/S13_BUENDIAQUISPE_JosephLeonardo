// Envuelve un controller async: si lanza un error, lo manda a errorHandler (evita try/catch repetidos).
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

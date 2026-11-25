// Último eslabón: convierte CUALQUIER error en una respuesta JSON { mensaje } sin filtrar detalles internos.
export function noEncontrada(req, res) {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
}

export function errorHandler(err, req, res, next) {
  // Error esperado lanzado por un service (AppError)
  if (err.status) {
    return res.status(err.status).json({ mensaje: err.message, ...(err.errores && { errores: err.errores }) });
  }
  // JSON mal formado o demasiado grande (lo detecta express.json)
  if (err.type === 'entity.parse.failed') return res.status(400).json({ mensaje: 'El cuerpo de la petición no es un JSON válido.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ mensaje: 'El cuerpo de la petición es demasiado grande.' });

  // Errores de PostgreSQL traducidos a mensajes para el usuario
  switch (err.code) {
    case '23505': return res.status(409).json({ mensaje: 'Ya existe un registro con esos datos.' });
    case '23503': return res.status(409).json({ mensaje: 'La operación choca con registros relacionados.' });
    case '23514':
    case '22001':
    case '22P02': return res.status(400).json({ mensaje: 'Algún dato no cumple el formato permitido.' });
    default: break;
  }

  console.error(err); // el detalle solo se ve en los logs del servidor
  res.status(500).json({ mensaje: 'Error interno del servidor' });
}

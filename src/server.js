// Punto de entrada: valida el entorno y enciende el servidor. No contiene lógica de negocio.
import { env, validarEntorno } from './config/env.js';

validarEntorno();
const { default: app } = await import('./app.js'); // se importa después de validar para dar errores claros

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`API Serenazgo escuchando en http://localhost:${env.PORT}/api`);
});

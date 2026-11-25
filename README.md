# Serenazgo Alerta Huancayo — Backend (Node + Express + Neon)

API REST de la Subgerencia de Serenazgo de Huancayo. Los vecinos reportan incidentes y pagan los servicios de resguardo; el personal (empleado, cajero, administrador) gestiona los reportes, cobra en caja y audita los pagos. Este repositorio contiene **solo el backend**; el frontend (React) vive en su propio repositorio y consume esta API.

## Cómo ejecutarlo

```bash
npm install
cp .env.example .env        # en Windows: copy .env.example .env
# edita .env: pega TU cadena de Neon en DATABASE_URL y define JWT_SECRET
npm run db:verificar        # comprueba la conexión y lista las tablas
npm run dev                 # http://localhost:3000/api/salud
npm test                    # pruebas de validaciones y tarifa (no usan la BD)
```

La base de datos **ya existe en Neon** (el grupo comparte las mismas tablas); esta API no crea ni modifica su estructura.

### Variables de entorno (`.env.example`)

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Neon. Nunca se escribe en el código. |
| `JWT_SECRET` / `JWT_EXPIRA` | Firma y duración de los tokens de sesión. |
| `PORT` | Puerto local (Render lo define solo). |
| `CORS_ORIGINS` | URLs del frontend autorizadas (en producción, la de Vercel). |
| `ACEPTAR_CLAVES_LEGADO` | Acepta claves antiguas en texto plano y las pasa a bcrypt al primer ingreso. |

El archivo `.env` está en `.gitignore`: nunca se sube a GitHub.

## Arquitectura por capas

```
src/
├── server.js          Enciende el servidor (valida el entorno y escucha el puerto)
├── app.js             Arma Express: CORS, JSON, rutas, 404 y manejo de errores
├── config/            env.js (variables) · db.js (Pool de Neon y transacciones)
├── routes/            Qué URL + método atiende cada controller y con qué middlewares
├── controllers/       Traducen HTTP: leen la petición, llaman al service, devuelven JSON y código
├── services/          Reglas de negocio: validar, calcular montos, permisos de datos, pasarela
├── repositories/      ÚNICO lugar con SQL (siempre con parámetros $1, $2…)
├── middlewares/       autenticar (JWT) · requireRol · limitarIntentos · errorHandler
└── utils/             AppError, validaciones, tarifa, códigos, catálogos (funciones puras)
```

Una petición recorre: **ruta → middlewares → controller → service → repository → SQL en Neon → JSON**.
Cada capa solo habla con la siguiente: un controller nunca escribe SQL y un repository nunca conoce HTTP.

### Ejemplo de punta a punta: `POST /api/auth/login`

1. `routes/auth.routes.js` — `router.post('/login', frenoLogin, ctrl.login)`; el freno limita intentos por IP.
2. `controllers/auth.controller.js` — toma `req.body`, llama al service y responde `200 { usuario, token }`.
3. `services/auth.service.js` — valida (`400` si falta algo), busca al usuario, compara la contraseña con bcrypt (`401` si no coincide) y firma el JWT.
4. `repositories/usuarios.repository.js` — `SELECT … FROM usuarios WHERE LOWER(correo) = LOWER($1)` con `[correo]`.
5. Si algo falla, el error sube hasta `middlewares/errorHandler.js`, que responde `{ "mensaje": "…" }` con el código HTTP correcto.

## Conexión con Neon y SQL seguro

`config/db.js` crea un `Pool` con `DATABASE_URL` y SSL activado. Todo valor que viene del usuario viaja **como parámetro**, nunca pegado al texto SQL:

```js
// SQL seguro: el dato del usuario va como parámetro
pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
```

Así, aunque alguien escriba `' OR 1=1 --` como correo, PostgreSQL lo trata como un texto y no como código.
Los filtros opcionales (`?estado=`) solo añaden condiciones fijas (`estado = $2`); el valor sigue yendo en el arreglo.

Tablas que usa la API: `usuarios`, `incidencias`, `alertas_auxilio`, `mensajes_contacto`, `pagos`, `banco_cuentas`, `banco_tarjetas`, `billeteras`.

## Endpoints

Todas las rutas empiezan con `/api`. Errores siempre como `{ "mensaje": "…" }` (y `errores` por campo en los `400`).

| Método | Ruta | Acceso | Respuestas |
|---|---|---|---|
| GET | `/salud` | Público | 200 (verifica Neon) |
| POST | `/auth/registro` | Público | 201 · 400 · 409 correo repetido |
| POST | `/auth/login` | Público | 200 `{usuario, token}` · 400 vacío · 401 clave mala · 429 |
| GET | `/auth/perfil` | Con token | 200 · 401 |
| GET | `/incidencias` | Con token (vecino: las suyas · personal: todas) | 200 · 401 |
| GET | `/incidencias/:codigo` | Con token | 200 · 404 |
| POST | `/incidencias` | Con token | 201 `{codigo, monto_calculado}` · 400 · 401 |
| PUT | `/incidencias/:codigo` | administrador, empleado | 200 · 400 · 401 · 403 · 404 |
| PATCH | `/incidencias/:codigo/estado` | administrador, empleado | 200 · 400 · 401 · 403 · 404 |
| DELETE | `/incidencias/:codigo` | administrador, empleado | 200 · 401 · 403 · 404 · 409 si tiene pagos |
| GET | `/seguimiento/:codigo` | Público (datos mínimos) | 200 · 404 |
| POST | `/alertas` | Público (botón de auxilio) | 201 · 400 |
| GET · PATCH | `/alertas` · `/alertas/:codigo/estado` | administrador, empleado | 200 · 403 · 404 |
| POST | `/contacto` | Público (si hay token, se asocia al usuario) | 201 · 400 |
| GET | `/contacto` | administrador, empleado | 200 · 403 |
| GET · POST | `/clientes` · `/clientes/:id` | administrador, empleado | 200 · 201 · 400 · 404 · 409 |
| GET | `/pagos/pendientes` | cliente | 200 |
| POST | `/pagos/tarjeta` · `/pagos/billetera` | cliente | 201 aprobado · 402 rechazado · 400 · 404 · 409 |
| GET | `/pagos` | cliente (los suyos), cajero, administrador | 200 |
| PATCH | `/pagos/:id/verificar` | administrador | 200 · 403 · 404 · 409 |
| GET · POST | `/caja/pendientes` · `/caja/cobrar` | cajero, administrador | 200 · 201 · 400 · 409 |

Rutas protegidas: sin token → `401`; con un rol no permitido → `403`.

## Reglas de negocio importantes

- **El monto lo calcula el servidor** (S/ 50 por hora + S/ 20 por efectivo adicional; el auxilio es gratis). Lo que mande el navegador se ignora.
- **El rol nunca viene del body**: todo registro público es `cliente`.
- **Pagos con transacción**: descontar saldo + registrar el pago + marcar la incidencia como pagada se confirman juntos o no se confirma nada (`conTransaccion` en `config/db.js`). La fila se bloquea con `FOR UPDATE` para impedir dobles cobros.
- **Todo intento rechazado se registra** en `pagos` (con su motivo) para que caja y auditoría lo vean.
- **Separación de funciones**: el administrador verifica pagos, pero no uno que cobró él mismo.
- **Contraseñas con bcrypt**; el token JWT dura 8 h; el login tiene límite de intentos por IP.
- **Un vecino no puede ver ni pagar lo de otro**: se responde `404`, sin revelar que el código existe.
- Los errores internos nunca muestran SQL ni la pila al cliente.

## Seguridad del repositorio

`.gitignore` excluye `node_modules/` y todo `.env*` (menos `.env.example`). Antes de subir: `git status` no debe listar `.env`.

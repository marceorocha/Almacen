# USO — Cómo probar OSE en local

Guía práctica para levantar **API (NestJS)** y **panel (React + Vite)** en tu máquina antes de una demo o revisión de precio.

## Requisitos

- **Node.js** 18 o superior (recomendado 20 LTS) y **npm**.
- **Docker Desktop** (o Docker Engine + Compose) si quieres PostgreSQL sin instalarlo a mano.
- Opcional: **Postman**, **Insomnia** o **curl** para probar rutas que aún no tienen formulario en el front.

## 1. Base de datos PostgreSQL

### Opción A — Docker (recomendado)

Desde la carpeta del backend:

```bash
cd backend
docker-compose up -d
```

Eso levanta Postgres **16** con usuario `postgres`, contraseña `postgres` y base `ose_inventory` en el puerto **5432** (coincide con `backend/.env.example`).

### Opción B — Postgres ya instalado

Crea una base llamada `ose_inventory` (o ajusta `DB_NAME` en tu `.env`).

### Postgres en macOS (Homebrew)

Si al arrancar la API ves **`role "postgres" does not exist`**, casi seguro estás usando el Postgres del Mac (Homebrew), donde el superusuario suele ser **tu usuario de sistema** (`usuario`, etc.), no `postgres`.

En `backend/.env` pon, por ejemplo:

- `DB_USERNAME=` el mismo nombre que devuelve `whoami` (o el usuario con el que entras a `psql`).
- `DB_PASSWORD=` vacío si no configuraste contraseña para ese rol.

Crea la base si hace falta: `createdb ose_inventory` o `psql -c "CREATE DATABASE ose_inventory;"`.

Si quieres usar el usuario `postgres` como en Docker, créalo en tu Postgres local o usa **solo** la base del contenedor Docker y deja `DB_USERNAME=postgres` en `.env` (asegúrate de que el puerto 5432 sea el del contenedor y no el de Homebrew, o cambia el puerto de uno de los dos).

## 2. Variables de entorno del backend

```bash
cd backend
cp .env.example .env
```

Revisa al menos:

| Variable        | Uso breve |
|-----------------|-----------|
| `PORT`          | Puerto de la API (por defecto **3000**). |
| `DB_*`          | Conexión a Postgres; deben coincidir con tu instancia. |
| `JWT_SECRET`    | Secreto para firmar tokens; en producción debe ser largo y único. |
| `TYPEORM_SYNC`  | En **desarrollo** puedes dejar `true` para que TypeORM sincronice el esquema. En **producción** debe ser `false` y usar migraciones. |
| `PUBLIC_APP_URL`| URL pública de la API (sin barra final); se guarda en `pdfUrl` de movimientos. En local: `http://localhost:3000`. |
| `SEED_*`        | Credenciales del primer **admin** al ejecutar `npm run seed` (solo si la tabla de usuarios está vacía). |

## 3. Instalar dependencias y semilla

```bash
cd backend
npm install
npm run seed
```

- **`npm run seed`**: si no hay usuarios, crea un administrador con `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` del `.env`.
- Si la base está vacía y `TYPEORM_SYNC=true`, al arrancar la API TypeORM creará tablas según las entidades.

### Usuario y contraseña del seed (login en el panel)

Si copiaste `.env.example` a `.env` **sin cambiar** las variables `SEED_*`, el administrador inicial es el que define el ejemplo:

| Campo    | Valor por defecto (`.env.example`) |
|----------|--------------------------------------|
| **Email**    | `admin@example.com`              |
| **Contraseña** | `ChangeMe123!`                 |

Úsalos en **`http://localhost:5173/login`** (o en `POST /api/auth/login` con ese email y contraseña).

Si modificaste `SEED_ADMIN_EMAIL` o `SEED_ADMIN_PASSWORD` en tu `.env` **antes** de ejecutar `npm run seed`, el login es el que tengas ahí. Si el seed ya se ejecutó con otros datos y luego cambiaste el `.env`, la contraseña en base de datos **no** se actualiza sola: o creas otro usuario por API/admin, o borras usuarios y vuelves a sembrar (solo en desarrollo).

## 4. Arrancar la API

```bash
cd backend
npm run start:dev
```

Deberías tener la API en **`http://localhost:3000`** con prefijo global **`/api`** (por ejemplo login: `POST http://localhost:3000/api/auth/login`).

Los PDFs generados se sirven fuera de `/api`, en **`http://localhost:3000/files/...`** (carpeta `uploads/` bajo el directorio de trabajo del proceso, salvo que definas `UPLOAD_ROOT`).

## 5. Arrancar el frontend

En **otra terminal**:

```bash
cd frontend
npm install
npm run dev
```

Abre **`http://localhost:5173`**. El proxy de Vite envía `/api` y `/files` al backend en el puerto **3000**, así que el navegador solo habla con el front en desarrollo.

Inicia sesión con el email y contraseña del **seed** (o con un usuario que hayas creado después).

## 6. Cómo “hacerlo funcionar” en una demo rápida

1. **Login** en el panel con usuario **admin** o **almacén** (según lo que hayas sembrado/creado).
2. Navega por **Artículos**, **Stock**, **Movimientos**, **Transferencias**, **Pedidos**, **Alertas** (según rol verás más o menos datos).
3. **Transferencias** en el front hoy es sobre todo **consulta**; el flujo completo (pendiente → PDF → en tránsito → recepción → stock) está en la **API**:
   - Crear movimiento tipo `transferencia` en `pendiente` (origen y destino distintos, líneas con cantidad para no trazables o `serieId` para trazables).
   - `POST /api/movimientos/:id/pdf` con JWT (rol admin o almacén con acceso al movimiento).
   - `PATCH /api/movimientos/:id/estado` con `en_transito` (origen; requiere PDF ya generado).
   - `POST /api/movimientos/:id/confirmar-recepcion` o `PATCH .../estado` con `recibido` (destino, desde `en_transito`).

Si algo falla, revisa la consola del backend (Nest) y que Postgres esté escuchando en el host/puerto del `.env`.

## 7. Comandos útiles

| Comando | Dónde | Descripción |
|---------|--------|-------------|
| `npm run build` | `backend/` | Compila TypeScript a `dist/`. |
| `npm run start:prod` | `backend/` | Ejecuta `node dist/main` (tras `build`). |
| `npm run migration:run` | `backend/` | Aplica migraciones cuando uses `TYPEORM_SYNC=false`. |
| `npm run build` | `frontend/` | Build de producción (`tsc` + Vite). |

## 8. Producción / demo en servidor (nota corta)

- `TYPEORM_SYNC=false`, migraciones aplicadas, `JWT_SECRET` fuerte.
- `PUBLIC_APP_URL` y `CORS_ORIGIN` alineados con la URL real del API y del front.
- `UPLOAD_ROOT` persistente si generas PDFs en disco.

---

*Rutas y enums detallados: ver también `backend/INSTRUCCIONES.md`.*

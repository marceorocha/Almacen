Cómo arrancar
Copia .env.example a .env y ajusta credenciales y JWT_SECRET.
docker compose up -d (opcional) y TYPEORM_SYNC=true solo en desarrollo; en producción usa TYPEORM_SYNC=false y migraciones (npm run migration:generate -- …, npm run migration:run).
Primera base vacía + variables SEED_* del ejemplo: npm run seed (crea un admin si no hay usuarios).
npm run start:dev – API bajo prefijo /api.
Comandos útiles
Comando	Uso
npm run build
Compilación
npm run start:prod
node dist/main
npm run seed
Admin inicial si la BD está vacía
npm run migration:run
Aplicar migraciones (con data-source configurado)
Login: POST /api/auth/login con { "email", "password" } → { accessToken, user }. Resto de rutas: header Authorization: Bearer &lt;token&gt;.

Reglas de transición (resumen)
Entrada: sin reservado; pendiente → en_transito | recibido | rechazado.
Salida / transferencia: incluye reservado, en_transito, etc.; transferencia no puede ir reservado → recibido sin pasar por en_transito.
Con TYPEORM_SYNC=true TypeORM recrea el esquema en desarrollo; en bases ya existentes hace falta una migración manual que sustituya la tabla antigua de movimientos por el nuevo diseño.

Dependency
pdfkit (+ @types/pdfkit)
MovimientoPdfService (src/movimientos/movimiento-pdf.service.ts)
Builds an A4 PDF with:
Movement ID, date (fecha), creator (name + email)
Type / status
Origin and destination warehouse names (or —)
Lines: internal code, description (truncated), quantity, serial (serie.numeroSerie, numeroSerie on the line, or —)
Signature block (label + line + “Name / date”)
Writes to {UPLOAD_ROOT}/movimientos/{movimientoId}.pdf (default uploads/movimientos/ under the process cwd).
Returns the public URL: {PUBLIC_APP_URL}/files/movimientos/{id}.pdf.
API
POST /api/movimientos/:id/pdf (JWT, roles admin / almacén, same warehouse access as other movement routes)
Generates/overwrites the PDF and sets movimiento.pdfUrl in the database.
Static files (src/main.ts)
Uses NestExpressApplication and app.useStaticAssets(uploadRoot, { prefix: '/files/' }) so PDFs are available at GET http://<host>:<port>/files/movimientos/<id>.pdf (outside the /api prefix).
Config (.env.example)
PUBLIC_APP_URL – base URL stored in pdfUrl (no trailing slash), default in code falls back to http://localhost:<PORT>.
UPLOAD_ROOT – optional absolute path for uploads in production.
.gitignore
uploads/ so generated files are not committed.
Set PUBLIC_APP_URL in production to the real public origin (e.g. https://api.example.com) so pdfUrl is correct behind proxies or other hosts.

xLógica
Crear pedido – POST /api/pedidos (cualquier usuario autenticado): detalles[], opcional fecha. Estado inicial pendiente.
Listar – GET /api/pedidos: user solo ve los suyos; admin y almacén ven todos.
Detalle – GET /api/pedidos/:id: user solo el propio; admin/almacén cualquiera.
Aprobar – PATCH /api/pedidos/:id/aprobar (admin o almacén):
Solo si está pendiente.
Solo si todas las líneas son artículos no trazables (los trazables devuelven 400 hasta que exista flujo con series).
Almacén: reserva en su user.almacenId.
Admin: debe enviar { "almacenOrigenId": "<uuid>" } en el body.
Crea un Movimiento tipo salida con estado reservado (misma lógica que en movimientos: Stock.reservado / reserva de series).
Marca el pedido aprobado y guarda el id en movimientoReservaId.
Rechazar – PATCH /api/pedidos/:id/rechazar (admin o almacén), solo desde pendiente → rechazado.
Integración
MovimientosModule exporta MovimientosService; PedidosModule lo importa y reutiliza create() para el movimiento de reserva.
Otros ajustes
Almacen: quitada la relación pedidos.
Articulo: pedidoDetalles en lugar de pedidoLineas.
Enum PedidoEstado actualizado en src/common/enums/pedido-estado.enum.ts.
En bases ya existentes hace falta migración o recrear con TYPEORM_SYNC si cambian tablas/enums de Postgres.

Qué hace
AlertasService recorre filas de Stock con articulo y almacen cargados.
Considera disponible = cantidad − reservado y marca alerta si disponible ≤ stockMinimo del artículo (así se respeta reserva y el mínimo del catálogo).
severidad: critica si disponible ≤ 0, si no advertencia.
sugerenciaCompra: deficit = max(0, stockMinimo − disponible), unidadesSugeridas = deficit + 1 (buffer fijo SUGGESTION_BUFFER = 1), más codigoProveedor, almacén, motivo en texto.
La respuesta incluye items (detalle + sugerenciaCompra anidada) y sugerenciasCompra (misma información en lista plana para compras).
Endpoint
GET /api/alertas (JWT; sin rol extra)
Admin: todos los almacenes.
Almacén / user: solo stock de user.almacenId (si no tienen almacén → 403).
Archivos
src/alertas/alertas.module.ts
src/alertas/alertas.service.ts
src/alertas/alertas.controller.ts
src/alertas/interfaces/stock-alert-response.interface.ts
AppModule importa AlertasModule.
Si prefieres comparar cantidad bruta frente al mínimo en lugar de disponible, se puede cambiar en una línea en el servicio.

***************

Frontend:

Aquí tienes la app React en /Users/usuario/Ose/frontend (Vite + TypeScript + MUI + Axios + React Router 7).

Páginas y rutas
Ruta	Contenido
/login
Login con email/contraseña → JWT en localStorage
/
Dashboard (rol y almacén)
/articulos
Tabla desde GET /api/articulos
/stock
GET /api/stock
/movimientos
GET /api/movimientos
/transferencias
Misma API, filtrado tipo === 'transferencia'
/pedidos
GET /api/pedidos
/alertas
GET /api/alertas (severidad + unidades sugeridas)
/usuarios
GET /api/users (solo admin; el menú solo lo muestra a admin)
Comportamiento
Axios (src/api/client.ts): token en Authorization, 401 limpia el token.
Auth (src/context/AuthContext.tsx): login con POST /api/auth/login, perfil con GET /api/users/me.
UI por rol: enlace Usuarios solo si role === 'admin'; ruta /usuarios protegida con RoleGuard.
Responsive: Drawer temporal en móvil, permanente en md+; padding y tipografía adaptados.
Proxy Vite: /api y /files → http://localhost:3000 (mismo origen en dev sin VITE_API_URL).
Comandos
cd frontend && npm run dev    # http://localhost:5173
cd frontend && npm run build
CORS (backend)
Con el front en 5173, en el backend conviene CORS_ORIGIN=http://localhost:5173 (o el valor que uses) para cookies/credenciales si las activas más adelante; con axios sin withCredentials suele bastar el proxy en desarrollo.

Variable opcional
VITE_API_URL: URL base del API en producción (sin barra final); si está vacío, las peticiones van al mismo host (útil tras proxy inverso).
Fuentes: DM Sans (en index.html). Tema MUI en src/theme.ts.

*******

Flujo

**********

Está implementado el flujo de transferencias en el backend. Resumen:

Comportamiento
Alta – Las transferencias solo se pueden crear en pendiente. Si en el DTO viene otro estado, responde 400 con mensaje claro (no se salta el paso 1 con un solo POST).

PDF – POST /api/movimientos/:id/pdf solo admite transferencias en pendiente. Así el documento queda asociado al envío antes del despacho.

en_transito – En PATCH /api/movimientos/:id/estado con en_transito:

Debe existir pdfUrl (PDF generado antes).
Usuario almacén: solo quien pertenece al almacén origen (los admin siguen pudiendo todo).
Recepción en destino – De en_transito a recibido:

Usuario almacén: solo el almacén destino (admin sin restricción).
Endpoint dedicado: POST /api/movimientos/:id/confirmar-recepcion, equivalente a poner recibido con las mismas comprobaciones.
Stock – Sin cambios en la lógica que ya tenías: al pasar a en_transito se ejecuta consumeOrigin (no trazable por cantidad en Stock; trazable por serie → EN_TRANSITO); al recibido, receiveTransferAtDestination suma cantidad en destino o mueve la serie al destino en DISPONIBLE.

Reglas extra de transferencia
Reserva (pendiente → reservado) y liberación / rechazo desde reservado (pendiente o rechazado): solo origen (no admin: mismo criterio que arriba).
rechazado desde en_transito (devolución en tránsito): solo origen (revertTransitToOrigin).
La compilación del backend (npm run build) termina correctamente.

La UI de Transferencias sigue siendo solo listado; el flujo se cumple vía API (o puedes pedir después botones concretos en esa pantalla sin tocar el resto del diseño).
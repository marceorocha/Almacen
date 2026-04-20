# Informe comercial — Plataforma de inventario OSE

Documento breve para **presentación en práctica** y **conversación de precio**: qué es el producto, qué problema resuelve y en qué estado está.

## Resumen ejecutivo

**OSE** es un sistema de **gestión de inventario multi-almacén** con API REST segura (JWT y roles), modelo de **stock con reservas**, artículos **trazables por número de serie** y **no trazables por cantidad**, **movimientos** (entradas, salidas, transferencias), **pedidos internos** con aprobación, **alertas de reposición** y **documentación en PDF** para transferencias. Incluye un **panel web** (React) para consulta operativa y administración básica.

Orientación: PYMEs, logística interna, talleres o distribución con varios depósitos que necesitan trazabilidad sin ERP completo.

## Problema que aborda

- Stock repartido en **varios almacenes** sin una única fuente de verdad.
- Riesgo de **doble asignación** o salidas sin control si no hay reservas ni estados de movimiento.
- Productos **con serie** (equipos, herramientas) vs **consumibles por unidad**: el sistema trata ambos modelos de forma explícita.
- Transferencias sin **huella documental** ni reglas claras de quién despacha y quién recibe.

## Solución propuesta

1. **Catálogo y almacenes** con usuarios asignados a un almacén y rol (administrador, almacén, usuario de consulta/pedidos).
2. **Stock** por artículo y almacén, con cantidad **reservada** descontada del disponible.
3. **Movimientos** con estados (pendiente, reservado, en tránsito, recibido, rechazado) y efectos coherentes sobre stock y series.
4. **Transferencias** con flujo reforzado: alta en pendiente → **PDF** → salida en tránsito desde **origen** → **confirmación de recepción** en **destino** → actualización de stock (cantidad o serie según tipo de artículo).
5. **Pedidos**: los usuarios solicitan material; admin/almacén **aprueban** generando reserva de salida cuando el flujo lo permite.
6. **Alertas**: comparación de disponible frente a **stock mínimo** con sugerencia de compra.
7. **Panel web** para login, listados y navegación por módulos, listo para ampliar formularios donde haga falta.

## Stack técnico (valor para el cliente)

| Capa | Tecnología |
|------|------------|
| API | **NestJS**, **TypeORM**, **PostgreSQL** |
| Seguridad | **JWT**, **Passport**, contraseñas con **bcrypt**, validación de DTOs |
| Front | **React**, **TypeScript**, **Vite**, **Material UI** |
| Documentos | **PDF** en servidor (**pdfkit**), enlaces públicos bajo `/files/` |

Implica: código mantenible, despliegue habitual en **Node + Postgres** (VPS, nube, contenedores), y posibilidad de integrar otras apps vía API.

## Diferenciación frente a “un Excel compartido”

- **Reglas de negocio en servidor**, no en cabeza del operario.
- **Roles y alcance por almacén** reducen errores y fugas de información.
- **Trazabilidad real** para series (estado y almacén de la unidad).
- **Transferencias auditables** (PDF + transiciones controladas por origen/destino).
- **Base preparada** para crecer (más reportes, integración ERP, app móvil de picking) sin rediseñar desde cero.

## Estado actual y mensaje honesto para precio

- **Listo para demo técnica** en local o servidor de pruebas: API estable, front funcional para visualización y autenticación.
- Algunos flujos avanzados (por ejemplo alta de movimientos complejos) pueden probarse hoy vía **API** o ampliando formularios en el front; eso se puede presupuestar como **fase 2** (UX operativa, impresión desde UI, etc.).
- **Producción** exige checklist: migraciones (`TYPEORM_SYNC=false`), secretos, backups, HTTPS, dominios en CORS y `PUBLIC_APP_URL`, almacenamiento persistente de PDFs.

Eso permite ofrecer un **precio por fases**: núcleo inventario + API + panel consulta (entrega actual) vs. **hardening producción** vs. **mejoras de pantalla** a medida.

## Ideas de argumento en la reunión de precio

- Menor coste total que un ERP genérico si solo necesitas **inventario multi-almacén + trazabilidad + pedidos internos**.
- Propiedad del código y despliegue en infra del cliente (sin vendor lock-in de hoja de cálculo).
- Escalabilidad por **módulos**: hoy movimientos y alertas; mañana compras, proveedores o barcode.

## Próximo paso operativo

Para que cualquier evaluador lo pruebe sin fricción, seguir **`USO.MD`** en la raíz del repositorio (PostgreSQL, `.env`, `seed`, `npm run start:dev` + `npm run dev` en front).

---

*Documento orientado a presentación; ajustar cifras y alcance contractual con el cliente final.*

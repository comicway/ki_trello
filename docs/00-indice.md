# Kitrello — Índice de Documentación

#kitrello #indice #documentacion

Bienvenido al vault de documentación técnica de **Kitrello**, un tablero colaborativo tipo Trello construido sobre Next.js y Firebase. Usa este índice como punto de entrada para navegar entre todas las notas.

---

## Mapa del Vault

```
docs/
├── 00-indice.md               ← estás aquí
├── 01-arquitectura.md         ← visión general del sistema
├── 02-modelo-datos.md         ← colecciones Firestore y estructuras
├── 03-firebase-capa-db.md     ← lógica de src/firebase/db.js paso a paso
├── 04-vistas-y-componentes.md ← UI: vistas Board/Boards, TareaModal, Comments
├── 05-api-routes.md           ← rutas API de Next.js
├── 06-cloud-functions.md      ← Firebase Cloud Functions y sus triggers
├── 07-notificaciones.md       ← sistema de notificaciones y email end-to-end
├── 08-dependencias.md         ← librerías y justificación de uso
├── 09-infra-capacity.md       ← auditoría de capacidad en Free Tier
├── 10-autenticacion-y-navegacion.md ← SignIn, Account, PrivateRoute, Nav, Firebase SDK
└── 11-componentes-secundarios.md    ← HomeDashboard, AddMemberModal, Subtarea, ui/, utils/
```

---

## Navegación por tema

### Arquitectura y estructura
- [[01-arquitectura]] — Stack tecnológico, diagrama de capas, flujo de datos general
- [[02-modelo-datos]] — Esquema de Firestore: colecciones, campos, relaciones y reglas de seguridad

### Lógica de negocio
- [[03-firebase-capa-db]] — Todas las funciones de lectura/escritura en Firestore explicadas paso a paso
- [[04-vistas-y-componentes]] — Cómo funcionan las pantallas principales y sus componentes React
- [[07-notificaciones]] — Pipeline completo: trigger → Cloud Function → webhook → email → feed

### Autenticación y UI complementaria
- [[10-autenticacion-y-navegacion]] — SignIn, Account, PrivateRoute, Nav, Firebase SDK init, user.js
- [[11-componentes-secundarios]] — HomeDashboard, AddMemberModal, Subtarea, componentes ui/, utils/

### Backend y API
- [[05-api-routes]] — Rutas `/api/notifications/*` en Next.js App Router
- [[06-cloud-functions]] — Los tres triggers de Firestore desplegados en Firebase Functions v2

### Infraestructura y dependencias
- [[08-dependencias]] — Todas las librerías del `package.json` con su justificación
- [[09-infra-capacity]] — Cuántos usuarios soporta el Free Tier antes de caer

---

## Glosario rápido

| Término | Significado en este proyecto |
|---|---|
| **Board** | Tablero principal, equivalente al board de Trello |
| **List** | Columna dentro de un board (ej: "En progreso", "Finalizado") |
| **Tarea** | Tarjeta/card dentro de una lista |
| **Subtarea** | Ítem hijo dentro de una tarea |
| **Finalizado** | Lista especial cuyo título exacto marca tareas como completadas automáticamente |
| **Owner** | Usuario con permisos de administrador sobre un board |
| **Miembro** | Usuario con acceso de lectura/escritura a un board |
| **Feed** | Historial de notificaciones de un usuario almacenado en Firestore |
| **Idempotency Key** | Clave única que evita enviar la misma notificación dos veces |

---

## Flujo de usuario en 30 segundos

```
1. Login (Google o email/password)
      ↓
2. /boards → Home Dashboard (lista de boards + tareas pendientes propias)
      ↓
3. /b/[id] → Board view (columnas Kanban con drag & drop)
      ↓
4. Click en tarea → Drawer lateral (detalle, descripción, subtareas, comentarios)
      ↓
5. Acción (completar, mencionar, mover) → Cloud Function → Email + Feed
```

---

*Generado el 2026-07-09 | Ver [[09-infra-capacity]] para el análisis de costos en Free Tier.*

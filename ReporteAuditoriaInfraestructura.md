Now I have a comprehensive picture of the entire codebase. Let me compile the final analysis.Now let me gather additional key files for the deep analysis:Tengo toda la información necesaria para producir el reporte. Ahora verifico los límites actuales del Free Tier de Firebase y Vercel:Tengo todos los datos necesarios. Ahora procedo a elaborar el reporte completo.---

# Reporte de Auditoría de Infraestructura Cloud — Kitrello

**Fecha:** 9 de julio de 2026  
**Rol:** Auditor de Infraestructura Cloud & Software  
**Alcance:** Firebase (Spark/Free) + Vercel (Hobby/Free)

---

## Parte 1 — Cuotas del Free Tier (referencia)

### Firebase Spark Plan (confirmado en [firebase.google.com/pricing](https://firebase.google.com/pricing))

| Recurso | Límite gratuito |
|---|---|
| Firestore — Lecturas | **50,000 / día** |
| Firestore — Escrituras | **20,000 / día** |
| Firestore — Eliminaciones | **20,000 / día** |
| Firestore — Almacenamiento | **1 GiB total** |
| Firestore — Egreso de red | **10 GiB / mes** |
| Cloud Functions — Invocaciones | **2,000,000 / mes** *(plan Blaze, no disponible en Spark)* |
| Firebase Auth — MAUs | **50,000 MAUs** |

> **Importante:** Las Cloud Functions (`functions/index.js`) **no están disponibles en Spark**. Requieren plan Blaze. Si el equipo está usando Cloud Functions actualmente, ya está en Blaze. Los límites de Firestore aplican igual en ambos planes (Spark incluye el free tier).

### Vercel Hobby Plan (confirmado en [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby) y [vercel.com/docs/accounts/plans](https://vercel.com/docs/accounts/plans))

| Recurso | Límite gratuito |
|---|---|
| Fast Data Transfer (Bandwidth) | **100 GB / mes** |
| Function Invocations | **1,000,000 / mes** |
| Active CPU | **4 CPU-hours / mes** |
| Provisioned Memory | **360 GB-hours / mes** |
| Build minutes | **6,000 min / mes** |
| Edge Requests | Hasta 1,000,000 / mes |
| Duración máxima por función | **300 segundos** |

---

## Parte 2 — Análisis del Código: Consumo de Firestore por Acción

Esta es la sección más crítica. A continuación se detalla exactamente qué lee y escribe cada acción del usuario, extraído directamente del código.

### 2.1 — Login + Carga de Home (`/boards`)

Esto ocurre cada vez que un usuario abre la aplicación y va a la pantalla principal.

**Paso 1 — `doClaimMembership()` (src/firebase/db.js)**
```
3 queries de colección boards (por memberEmails, ownerIds, ownerId)
= 3 lecturas de colección + N documentos de boards encontrados
Ejemplo: usuario con 5 boards → 3 queries = 5+5+5 = 15 lecturas de documentos
+ batch.commit() = 1 escritura por boardRef + posibles updates de members
```

**Paso 2 — `onceGetBoards()` (src/firebase/db.js:70)**
```
Mismas 3 queries de colección boards (repetidas, no cacheadas)
= +15 lecturas adicionales para el mismo usuario con 5 boards
```

**Paso 3 — `onceGetHomeDashboard()` (src/firebase/db.js:355) ← CUELLO DE BOTELLA PRINCIPAL**
```javascript
for (const board of boards) {           // por cada board
  lists = await onceGetLists(board.key); // 1 query → N lecturas de listas
  for (const list of lists) {
    tareas = await onceGetTarea(board.key, list.key); // 1 query → M lecturas de tareas
  }
}
```
Esto es un **doble loop secuencial sin cache ni límite**:

| Escenario | Boards | Listas/Board | Tareas/Lista | Lecturas home |
|---|---|---|---|---|
| Equipo pequeño | 5 | 4 | 10 | 5×4 + 5×4×10 = **220 lecturas** |
| Equipo mediano | 10 | 5 | 15 | 10×5 + 10×5×15 = **800 lecturas** |
| Equipo activo | 15 | 6 | 20 | 15×6 + 15×6×20 = **1,890 lecturas** |

**Total lecturas al cargar `/boards` (escenario pequeño):**
```
15 (claimMembership) + 15 (onceGetBoards) + 220 (dashboard) = ~250 lecturas / carga
```

### 2.2 — Carga de un Board (`/b/[id]`)

**`Board/index.jsx` — carga inicial:**
```
onceGetBoard()   → 1 lectura (doc del board)
onceGetLists()   → 1 query → N lecturas (1 por lista)
onceGetMembers() → 1 lectura (está dentro del doc del board, sin costo extra)
```

**`List/index.jsx` — useEffect por cada columna:**
```javascript
// Cada componente List monta su propio useEffect y llama:
db.onceGetTarea(boardKey, listKey) // 1 query → M lecturas por lista
```
Esto ocurre **una vez por columna** al cargar el board:

| Board con | Lecturas al abrir |
|---|---|
| 4 listas × 10 tareas | 1 (board) + 1 (lists) + 4 listas + 4×10 tareas = **50 lecturas** |
| 6 listas × 15 tareas | 1 + 1 + 6 + 6×15 = **98 lecturas** |
| 8 listas × 20 tareas | 1 + 1 + 8 + 8×20 = **170 lecturas** |

> **Bug N+1 identificado:** El `Board/index.jsx` en modo lista ya descarga todas las tareas, pero el `List/index.jsx` las vuelve a pedir igualmente en su `useEffect` al montarse. En BOARD mode (el default), el board NO pre-fetcha tareas, por lo que sí es correcto que cada List lo haga. Sin embargo no hay deduplicación ni cache entre renders.

### 2.3 — Acciones del usuario en un Board

| Acción | Lecturas Firestore | Escrituras Firestore | Cloud Functions |
|---|---|---|---|
| Crear tarea | 1 (contar tareas) + 1 (write) | **1 escritura** | `onTareaNotification` → 2 lecturas adicionales |
| Editar tarea (cualquier campo) | 0 | **1 escritura** | `onTareaNotification` → 2 lecturas |
| Mover tarea (drag & drop) | 1 (get tarea original) | **N escrituras** (toda la lista destino reindexada) | `onTareaNotification` → 2 lecturas |
| Marcar tarea como completada | 0 | **1 escritura** | `onTareaNotification` → 2 lecturas + envío de email |
| Crear lista | 1 (contar listas) | **1 escritura** | — |
| Eliminar lista | N+1 lecturas (N tareas) | **N+1 escrituras** | — |
| Abrir detalle de tarea + ver comentarios | `onceGetComments()` → M lecturas | — | — |
| Agregar comentario | 0 | **1 escritura** | `onTareaCommentCreated` → 3 lecturas |
| Agregar comentario con @mención | 0 | **1 escritura** | → 3 lecturas + email + 2 escrituras (feed) |

**Caso especial — `doAddTareaAtStart()` (agregar tarea al inicio):**
```javascript
const snap = await ref.orderBy("index").get(); // Lee TODA la lista
const batch = db.batch();
snap.forEach(doc => batch.update(...index + 1)); // Escribe 1 doc por tarea existente
```
Con 20 tareas en la lista → **20 lecturas + 21 escrituras** por una sola acción.

### 2.4 — Carga del Panel de Notificaciones (`/api/notifications`)

Ocurre cada vez que el usuario abre el icono de notificaciones:

```javascript
// notificationFeed.js — listUserNotifications()
Promise.all([
  loadEmailFeed(email, limit),      // 1 query → hasta 10 lecturas
  loadUidFeed(uid, limit),           // 1 query → hasta 10 lecturas
  loadDeliveryFallback(email, limit) // 1 collectionGroup query → hasta 10 lecturas
])
```
**30 lecturas Firestore por cada apertura del panel de notificaciones**, además de 1 invocación de Vercel Function.

---

## Parte 3 — Cálculo de Capacidad: Usuarios Simultáneos y Diarios

### Supuestos del modelo

- Equipo en pruebas: boards medianos (5 boards, 4 listas, 10 tareas/lista)
- Jornada activa: 8 horas, con uso intenso de 3-4 horas
- Patrones de uso estimados por usuario activo al día:
  - 1 carga de home (`/boards`): **~250 lecturas**
  - 3 cargas de boards distintos (4 listas × 10 tareas): **3 × 50 = 150 lecturas**
  - 10 ediciones/creaciones de tareas: **10 × 1 + 10 × 2 (CF) = 30 lecturas / 10 escrituras**
  - 5 movimientos drag&drop: **5 × 1 lectura + 5 × 10 escrituras = 5 lecturas / 50 escrituras**
  - 3 aperturas de comentarios (5 comentarios c/u): **15 lecturas**
  - 2 comentarios nuevos: **2 escrituras + 2 × 3 lecturas (CF) = 6 lecturas**
  - 2 aperturas del panel de notificaciones: **2 × 30 = 60 lecturas**

**Total por usuario activo/día (estimación conservadora):**

| Tipo | Cantidad |
|---|---|
| **Lecturas Firestore/usuario/día** | **~516 lecturas** |
| **Escrituras Firestore/usuario/día** | **~62 escrituras** |
| **Invocaciones Vercel Function/usuario/día** | **~25 invocaciones** |

### Capacidad máxima con Free Tier

**Firebase Firestore:**
```
Límite lecturas/día:  50,000
Lecturas/usuario/día: ~516
Usuarios diarios máx: 50,000 / 516 ≈ 96 usuarios/día

Límite escrituras/día: 20,000
Escrituras/usuario/día: ~62
Usuarios diarios máx:  20,000 / 62 ≈ 322 usuarios/día
```

**El cuello de botella son las lecturas.** El límite real es:

> **≈ 96 usuarios activos diarios** antes de agotar el free tier de lecturas Firestore.

**Simultáneos (hora pico):**
Si 96 usuarios se distribuyen en 8 horas y el 30% están activos a la vez:
```
96 × 0.30 = ~29 usuarios simultáneos
```

**Vercel Hobby:**
```
Límite invocaciones/mes: 1,000,000
Invocaciones/usuario/día: ~25
Días/mes: 22 (laborales)
Usuarios: 1,000,000 / (25 × 22) ≈ 1,818 usuarios/mes activos

CPU-hours/mes: 4 hrs
Duración media por función: ~500ms (operaciones de Firestore Admin SDK)
Invocaciones posibles: 4 × 3,600 / 0.5 = 28,800 invocaciones antes de agotar CPU
```

**El cuello de botella en Vercel son las CPU-hours**, no las invocaciones:
```
28,800 invocaciones CPU-limitadas / 22 días / 25 inv/usuario/día
≈ 52 usuarios activos/día antes de agotar CPU en Vercel
```

---

## Parte 4 — Diagnóstico: Cuellos de Botella Exactos

### 🔴 Cuello de Botella #1 — `onceGetHomeDashboard()` (CRÍTICO)

**Archivo:** `src/firebase/db.js`, función `onceGetHomeDashboard` (línea ~355)

**El problema:** Cada vez que un usuario carga `/boards`, la aplicación ejecuta un doble `for` loop secuencial que descarga **todos los documentos de todas las listas de todos los boards** del usuario para construir el dashboard. No hay límites, no hay paginación, no hay cache.

```
Un usuario con 10 boards × 5 listas × 15 tareas:
= 10 queries de listas + 50 queries de tareas + todos los documentos
= ~800 lecturas en UN solo pageload
```

Con ese patrón, el límite de 50,000 lecturas/día se agota con **solo 62 pageloads del home en todo el día** entre todos los usuarios.

**Impacto:** Una sola recarga en el home de un usuario activo con muchos boards puede consumir 800–1,890 lecturas de un presupuesto diario de 50,000.

---

### 🔴 Cuello de Botella #2 — `doClaimMembership()` llamado en cada render de `/boards`

**Archivo:** `src/views/Boards/index.jsx` (línea ~33) + `src/views/Board/index.jsx` (línea ~41)

`doClaimMembership()` ejecuta **3 queries a la colección `boards`** (por `memberEmails`, `ownerIds`, `ownerId`) para actualizar los UIDs de los miembros. Se llama en el `useEffect` de ambas páginas, es decir, en cada navegación del usuario.

`onceGetBoards()` luego repite exactamente las mismas 3 queries. Son **6 queries de colección idénticas por visita** que retornan los mismos documentos.

---

### 🟠 Cuello de Botella #3 — Reindexación en `doAddTareaAtStart()`

**Archivo:** `src/firebase/db.js`, función `doAddTareaAtStart`

Al agregar una tarea al inicio de una lista, la función lee y rescribe **cada tarea existente en la lista** para incrementar su índice en 1. Con 30 tareas en una lista: **30 lecturas + 31 escrituras** para agregar una tarea. Esto escala pésimamente y agotará el cupo de escrituras rápido en boards activos.

---

### 🟠 Cuello de Botella #4 — Panel de Notificaciones: Triple lectura paralela

**Archivo:** `src/lib/notifications/notificationFeed.js`, función `listUserNotifications`

Cada apertura del panel hace 3 queries en paralelo (por email, por UID, y un `collectionGroup` query de toda la base de datos). El `collectionGroup` query sobre `_notificationDeliveries` escanea potencialmente todos los boards de todos los usuarios.

---

### 🟡 Cuello de Botella #5 — Cloud Functions en cada escritura de tarea

**Archivo:** `functions/index.js`

`onTareaNotification` se dispara **en cada escritura de cualquier tarea**, incluso actualizaciones triviales (cambiar la descripción, mover en el tablero). Cada invocación hace 2 lecturas adicionales a Firestore (board + list). Esto duplica el costo de escritura en Firestore para el backend.

---

## Parte 5 — Resumen Ejecutivo y Tabla de Capacidad

### Tabla de capacidad bajo Free Tier

| Métrica | Límite Free Tier | Consumo/usuario/día | Usuarios máximos |
|---|---|---|---|
| Firestore Lecturas | 50,000 / día | ~516 | **~96 usuarios/día** |
| Firestore Escrituras | 20,000 / día | ~62 | ~322 usuarios/día |
| Firestore Almacenamiento | 1 GiB | ~0.5 MB/usuario | ~2,000 usuarios acumulados |
| Vercel Invocaciones | 1,000,000 / mes | ~550/mes | ~1,818 usuarios activos/mes |
| Vercel CPU-hours | 4 hrs / mes | ~0.08 hrs/mes | **~50 usuarios activos/mes** |

### Límite operativo real

| Escenario | Usuarios simultáneos | Usuarios activos/día | Cuota que falla primero |
|---|---|---|---|
| Free Tier actual | **≤ 29 simultáneos** | **≤ 96 diarios** | Lecturas Firestore |
| Sin home dashboard | ≤ 200 simultáneos | ≤ 500 diarios | Escrituras Firestore |
| Con plan Blaze | Sin límite duro | Depende del presupuesto | Costo económico |

### ¿Cuándo cae el servicio?

- **Día 1 con 100 usuarios activos:** Se agotan las 50,000 lecturas antes de las 3pm (hora pico).
- **Vercel CPU:** Con 55+ usuarios activos que usen notificaciones frecuentemente, se agota el crédito de CPU del mes en ~2 semanas.
- **Almacenamiento Firestore:** No es el cuello de botella en pruebas, pero con un equipo de 50 personas y 6 meses de actividad se aproxima al 1 GiB.

---

## Parte 6 — Recomendaciones de Optimización

Ordenadas de mayor a menor impacto, sin cambiar la arquitectura principal:

**1. Eliminar `onceGetHomeDashboard()` o cachearla en servidor**
El mayor ahorro posible. En lugar de leer todos los boards/listas/tareas al cargar la home, se puede mostrar solo la lista de boards y calcular el dashboard en background, o agregar un campo `pendingCount` desnormalizado en el documento del board que se actualice por Cloud Functions. Esto reduce el costo de la home de 250 a ~15 lecturas.

**2. Deduplicar `doClaimMembership()` y `onceGetBoards()`**
Hacer un solo batch de queries al inicio de sesión y compartir el resultado. Guardar el estado en `sessionStorage` para evitar re-queries en navegación dentro de la misma sesión. Ahorro: ~30 lecturas por cada visita a `/boards`.

**3. Reemplazar `doAddTareaAtStart()` con índices de punto flotante**
Usar índices como `0.5`, `0.25`, etc. (similar al algoritmo LexoRank) para evitar reescribir todas las tareas. Solo se escribe el documento nuevo. Ahorro: hasta 30 escrituras por acción en listas llenas.

**4. Limitar el `collectionGroup` query en notificaciones**
El `loadDeliveryFallback()` escanea toda la base de datos. Eliminarlo o usarlo solo como último recurso cuando `loadEmailFeed` y `loadUidFeed` estén vacíos. Ahorro: 10 lecturas por apertura del panel.

**5. Considerar plan Blaze para Cloud Functions**
Las Cloud Functions (triggers de tareas y comentarios) no están disponibles en Spark plan. Si están activas, ya están en Blaze. El gasto adicional por invocaciones es mínimo (las primeras 2M son gratuitas), pero el gasto en lecturas de Firestore que generan sí cuenta contra el límite diario.

---

> Fuentes: [Firebase Pricing](https://firebase.google.com/pricing) · [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby) · [Vercel Account Plans](https://vercel.com/docs/accounts/plans)
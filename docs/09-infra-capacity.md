# Auditoría de Capacidad — Free Tier

#infraestructura #firebase #vercel #capacidad #optimizacion

← [[08-dependencias]] | [[00-indice]]

---

## Resumen ejecutivo

Bajo los planes gratuitos de Firebase (Spark) y Vercel (Hobby), Kitrello soporta aproximadamente:

| Métrica | Límite real |
|---|---|
| **Usuarios activos simultáneos** | ≤ 29 |
| **Usuarios activos por día** | ≤ 96 |
| **Cuota que falla primero** | Lecturas Firestore (50,000/día) |
| **Lecturas por usuario activo/día** | ~516 |
| **Cuota Vercel CPU** | ~50 usuarios/mes con notificaciones intensas |

---

## Límites del Free Tier (2026)

### Firebase Spark Plan

| Recurso | Límite gratuito |
|---|---|
| Firestore — Lecturas | 50,000 / día |
| Firestore — Escrituras | 20,000 / día |
| Firestore — Eliminaciones | 20,000 / día |
| Firestore — Almacenamiento | 1 GiB total |
| Firestore — Egress de red | 10 GiB / mes |
| Firebase Auth — MAUs | 50,000 / mes |

> **Nota sobre Cloud Functions:** Requieren plan Blaze (pago). Sin embargo, Firestore y Auth siguen siendo gratuitos hasta sus límites incluso en Blaze.

### Vercel Hobby Plan

| Recurso | Límite gratuito |
|---|---|
| Fast Data Transfer (Bandwidth) | 100 GB / mes |
| Function Invocations | 1,000,000 / mes |
| Active CPU | 4 CPU-hours / mes |
| Provisioned Memory | 360 GB-hours / mes |
| Edge Requests | 1,000,000 / mes |
| Duración máxima por función | 300 segundos |

---

## Consumo por acción de usuario

### Carga de `/boards` (Home Dashboard)

| Operación | Lecturas | Escrituras |
|---|---|---|
| `doClaimMembership()` — 3 queries a boards | ~15 lecturas | 0-N batch |
| `onceGetBoards()` — 3 queries duplicadas | ~15 lecturas | 0 |
| `onceGetHomeDashboard()` — loop nested | **~220 lecturas** | 0 |
| **Total por carga de home** | **~250 lecturas** | — |

> Basado en: 5 boards × 4 listas × 10 tareas.

### Carga de un Board `/b/[id]`

| Operación | Lecturas |
|---|---|
| `onceGetBoard()` | 1 |
| `onceGetLists()` | 1 + N listas |
| Cada `List` monta y llama `onceGetTarea()` | N queries + N×M tareas |
| **Total (4 listas × 10 tareas)** | **~50 lecturas** |

### Acciones en un board

| Acción | Lecturas | Escrituras | Cloud Function |
|---|---|---|---|
| Crear tarea (al final) | 1 | 1 | +2 lecturas CF |
| `doAddTareaAtStart()` | N | N+1 | +2 lecturas CF |
| Editar tarea | 0 | 1 | +2 lecturas CF |
| Mover tarea (DnD) | 2 | M+1 | +2 lecturas CF |
| Marcar completada | 0 | 1 | +2 lecturas CF + email |
| Crear lista | 1 | 1 | — |
| Abrir comentarios (5 comentarios) | 6 | 0 | — |
| Añadir comentario | 0 | 1 | +3 lecturas CF |
| Panel de notificaciones | 30 | 0 | — |

---

## Estimación de consumo diario por usuario activo

Patrón de uso asumido (jornada típica):

| Actividad | Cantidad | Lecturas | Escrituras |
|---|---|---|---|
| Carga de home | 1 | 250 | ~5 |
| Cargas de board | 3 | 3 × 50 = 150 | 0 |
| Ediciones de tarea | 10 | 10 × 2 CF = 20 | 10 |
| Movimientos DnD | 5 | 5 × 2 CF = 10 | 5 × 11 = 55 |
| Ver comentarios | 3 sesiones | 3 × 6 = 18 | 0 |
| Nuevos comentarios | 2 | 2 × 3 CF = 6 | 2 |
| Panel notificaciones | 2 | 2 × 30 = 60 | 0 |
| **Total estimado** | | **~516 lecturas** | **~62 escrituras** |

---

## Capacidad máxima en Free Tier

### Por cuota de lecturas (cuello de botella principal)

```
Presupuesto diario:        50,000 lecturas
Consumo por usuario:       ~516 lecturas/día
─────────────────────────────────────────
Usuarios diarios máximos:  50,000 / 516 ≈ 96 usuarios/día
Usuarios simultáneos:      96 × 0.30 (30% activos a la vez) ≈ 29
```

### Por cuota de escrituras

```
Presupuesto diario:        20,000 escrituras
Consumo por usuario:       ~62 escrituras/día
─────────────────────────────────────────
Usuarios diarios máximos:  20,000 / 62 ≈ 322 usuarios/día
```

Las lecturas son el cuello de botella — limitan a 96 usuarios antes que las escrituras.

### Por cuota de CPU en Vercel

```
Presupuesto mensual:       4 CPU-hours = 14,400 CPU-seconds
Duración media por API call: ~500ms (0.5s)
Invocaciones posibles:     14,400 / 0.5 = 28,800/mes

Por usuario (22 días laborales):
  ~25 API calls/día × 22 días = 550 calls/mes

Usuarios máximos:          28,800 / 550 ≈ 52 usuarios activos/mes
```

---

## Los 5 cuellos de botella identificados en el código

### 🔴 #1 — `onceGetHomeDashboard()` (CRÍTICO)

**Archivo:** `src/firebase/db.js`

```javascript
for (const board of boards) {
  lists = await onceGetLists(board.key);   // 1 query + N docs
  for (const list of lists) {
    tareas = await onceGetTarea(board.key, list.key); // 1 query + M docs
  }
}
```

**El problema:** Loop secuencial sin límites. Con 10 boards × 5 listas × 15 tareas = ~800 lecturas en un solo pageload. El límite de 50,000 lecturas diarias se agota con solo 62 cargas del home.

**Optimización propuesta:** Desnormalizar un campo `pendingCount` en el documento del board, actualizado por Cloud Functions. La home leería solo los docs de boards (N lecturas) en lugar del árbol completo.

---

### 🔴 #2 — `doClaimMembership()` llamado en cada navegación

**Archivos:** `src/views/Boards/index.jsx` (línea ~33), `src/views/Board/index.jsx` (línea ~41)

**El problema:** Se ejecuta 3 queries a la colección `boards` en cada carga de página. Estas queries son idénticas a las que hace `onceGetBoards()` — 6 queries repetidas por visita.

**Optimización propuesta:** Ejecutar `doClaimMembership` solo en el primer login de la sesión. Usar `sessionStorage` para marcar que ya se ejecutó.

---

### 🟠 #3 — `doAddTareaAtStart()` — reindexación masiva

**Archivo:** `src/firebase/db.js`

```javascript
// Lee y reescribe TODAS las tareas para incrementar su índice
const snap = await ref.orderBy("index").get();
snap.forEach(doc => batch.update(doc.ref, { index: doc.data().index + 1 }));
```

**El problema:** Agregar una tarea al inicio de una lista con 30 tareas genera 30 lecturas + 31 escrituras.

**Optimización propuesta:** Usar índices de punto flotante (LexoRank). Al insertar al inicio, asignar `index: -1` o `index: existingMin - 1`. Solo 1 escritura independientemente del tamaño de la lista.

---

### 🟠 #4 — Panel de notificaciones: triple query con collectionGroup

**Archivo:** `src/lib/notifications/notificationFeed.js`

```javascript
const [byEmail, byUid, fromDeliveries] = await Promise.all([
  loadEmailFeed(email, limit),        // 1 query
  loadUidFeed(uid, limit),            // 1 query
  loadDeliveryFallback(email, limit)  // collectionGroup — escanea toda la BD
]);
```

**El problema:** El `collectionGroup` query sobre `_notificationDeliveries` escanea potencialmente todos los boards de todos los usuarios.

**Optimización propuesta:** Eliminar el fallback o usarlo solo si las otras dos fuentes están vacías. Ahorra ~10 lecturas por apertura del panel.

---

### 🟡 #5 — Cloud Functions en cada escritura de tarea

**Archivo:** `functions/index.js`

**El problema:** `onTareaNotification` se dispara en CUALQUIER escritura de tarea, incluyendo reordenamientos de drag & drop. Aunque no envía email, sí hace 2 lecturas de Firestore (board + list) en cada invocación.

**Optimización propuesta:** Comparar solo los campos relevantes antes de cargar el contexto:
```javascript
if (!wasTareaJustCompleted(before, after) && !hasNewMentions(before, after) && ...) {
  return; // Salir temprano sin lecturas adicionales
}
```

---

## Tabla de capacidad final

| Plan | Usuarios/día | Usuarios simultáneos | Límite que falla |
|---|---|---|---|
| Firebase Spark + Vercel Hobby | **≤ 96** | **≤ 29** | Lecturas Firestore |
| Con optimización #1 (dashboard) | ≤ 500 | ≤ 150 | Escrituras Firestore |
| Plan Blaze + Vercel Hobby | Sin límite duro | Depende del presupuesto | CPU Vercel (4h/mes) |
| Plan Blaze + Vercel Pro | Sin límite duro | Depende del presupuesto | Costo económico |

---

## ¿Cuándo se cae el servicio?

- **100 usuarios activos en un día:** Las 50,000 lecturas se agotan antes del mediodía. Después, Firestore empieza a rechazar requests hasta las 00:00 UTC.
- **55+ usuarios activos con notificaciones frecuentes:** Las 4 CPU-hours de Vercel se agotan en ~2 semanas del mes.
- **Almacenamiento Firestore:** No es problema en pruebas. Con 50 usuarios y 6 meses de actividad intensa se aproxima a 1 GiB.

---

## Recomendaciones priorizadas

1. **Inmediata:** Implementar `sessionStorage` para que `doClaimMembership` no se ejecute en cada navegación.
2. **Alta prioridad:** Reemplazar `onceGetHomeDashboard()` con campos desnormalizados `pendingCount` en el board.
3. **Media prioridad:** Migrar `doAddTareaAtStart()` a índices de punto flotante.
4. **Baja prioridad:** Eliminar el `collectionGroup` fallback del panel de notificaciones.
5. **Cuando escale:** Considerar plan Blaze para Cloud Functions + Vercel Pro para CPU y bandwidth adicional.

---

*Ver también: [[03-firebase-capa-db]] para el código fuente de las funciones analizadas | [[01-arquitectura]] para el diagrama del sistema*

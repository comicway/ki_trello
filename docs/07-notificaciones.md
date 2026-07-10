# Sistema de Notificaciones

#notificaciones #email #backend #resend #firestore

← [[06-cloud-functions]] | Siguiente: [[08-dependencias]]

---

## Visión general

El sistema de notificaciones de Kitrello es un pipeline de varios pasos que conecta eventos de Firestore con emails enviados por Resend y un feed de notificaciones persistido en Firestore.

```
Evento en Firestore
        ↓
Cloud Function (trigger)
        ↓
Webhook POST → /api/notifications/dispatch
        ↓
Orquestador (orchestrator.js)
    ├── Verificación de idempotencia (Firestore transaction)
    ├── Email (Resend)
    └── Feed (escritura en usersByEmail/.../notifications)
```

---

## Tipos de eventos

Definidos en `src/lib/notifications/eventTypes.js`:

| Evento | Cuándo ocurre |
|---|---|
| `task_completed` | Una tarea pasa de `done: false` a `done: true` |
| `subtask_completed` | Una subtarea pasa a completada |
| `salesforce_ready` | El switch "Ready for Salesforce" se activa |
| `mention` | Alguien usa @email en un comentario o descripción |
| `assignee_changed` | Se asigna o cambia el responsable de una tarea |
| `status_changed` | Una tarea se mueve a otra lista |

**Nota:** `assignee_changed` y `status_changed` están detectados pero **no generan emails** actualmente (filtrados en `buildTareaEvents`). Están preparados para activarse.

---

## Flujo detallado: tarea completada

### Paso 1 — Escritura en Firestore (cliente)

```javascript
// En TareaModal / Tarea.jsx
db.doEditTarea(boardKey, listKey, tareaKey, { done: true, doneAt: "...", doneBy: "María" })
```

### Paso 2 — Cloud Function `onTareaNotification` se activa

```javascript
// functions/index.js
const before = event.data.before.data(); // { done: false, ... }
const after  = event.data.after.data();  // { done: true, doneAt: "...", doneBy: "María" }
```

### Paso 3 — Carga del contexto

```javascript
const context = await loadBoardListContext(boardId, listId);
// Lee boards/{boardId} y boards/{boardId}/lists/{listId}
// Resultado:
{
  boardTitle: "Proyecto Alfa",
  listTitle: "Finalizado",
  listIsFinalizado: true,
  members: [{ uid, email, displayName, photoURL }, ...],
  memberEmails: ["maria@empresa.com", "carlos@empresa.com"],
  boardId,
  listId,
}
```

### Paso 4 — Detección del evento

```javascript
const events = buildTareaEvents(before, after, { ...context, tareaId });
// Genera:
[{
  eventType: "task_completed",
  idempotencyKey: "task_completed:tarea:tareaId:2026-07-09T10:00:00Z",
  itemType: "tarea",
  itemTitle: "Diseñar mockups",
  assigneeEmail: "maria@empresa.com",
  completedBy: "Carlos López",
  completedAt: "2026-07-09T10:00:00Z",
}]
```

### Paso 5 — Webhook al servidor

```javascript
await fetch(NOTIFICATION_WEBHOOK_URL, {
  method: "POST",
  headers: { Authorization: `Bearer ${NOTIFICATION_WEBHOOK_SECRET}` },
  body: JSON.stringify({ ...context, ...event }),
});
```

### Paso 6 — Orquestador en el servidor

**Archivo:** `src/lib/notifications/orchestrator.js`

```
dispatchNotification(payload)
    ↓
1. resolveNotificationRecipients(payload)
   → Determina a quién enviar el email
   
2. claimNotificationDelivery(boardId, idempotencyKey)
   → Transacción Firestore: si ya existe el doc, retorna { claimed: false }
   → Si no existe, crea el doc y retorna { claimed: true }
   
3. Si claimed === false: return { ok: true, skipped: true, duplicate: true }
   (el evento ya fue procesado — no se envía email)
   
4. buildNotificationEmail(payload)
   → Construye subject, html y text del email
   
5. resend.emails.send({ from, to, subject, html, text })
   → Envía el email
   
6. recordFeedEntries(recipients, payload)
   → Escribe en usersByEmail/{email}/notifications/{idempotencyKey}
   → Y en users/{uid}/notifications/{idempotencyKey} si tiene uid
```

---

## Módulo: recipients.js — ¿A quién se notifica?

`src/lib/notifications/recipients.js` implementa `resolveNotificationRecipients(payload)`.

La lógica varía según el tipo de evento:

### `task_completed` / `subtask_completed`

```
Candidatos:
  1. assigneeEmail del item (si existe)
  2. Todos los owners del board (memberEmails de owners)

Filtros:
  - Excluir al actor (quien completó la tarea no se notifica a sí mismo)
  - Solo emails válidos
```

### `mention`

```
Destinatarios:
  - parsedTargetEmails: los emails mencionados con @

Filtros:
  - Excluir al autor del comentario (no se auto-notifica)
  - Solo miembros activos del board
```

### `salesforce_ready`

```
Destinatarios:
  - Todos los miembros del board
  
Filtros:
  - Excluir al actor
```

---

## Idempotencia — evitar notificaciones duplicadas

### El problema

Las Cloud Functions pueden ejecutarse más de una vez si hay errores de red. Sin idempotencia, una tarea completada podría generar 2-3 emails.

### La solución

Cada evento tiene un `idempotencyKey` único:
```
"task_completed:tarea:{tareaId}:{doneAt}"
"subtask_completed:{tareaId}:{subtaskId}:{doneAt}"
"mention:comment:{commentId}"
"salesforce_ready:tarea:{tareaId}"
```

Antes de enviar el email, `claimNotificationDelivery` ejecuta una **transacción Firestore**:

```javascript
// src/lib/notifications/idempotency.js
return db.runTransaction(async (tx) => {
  const snap = await tx.get(ref); // ref = boards/{boardId}/_notificationDeliveries/{key}
  
  if (snap.exists) {
    return { claimed: false, duplicate: true }; // Ya fue procesado
  }
  
  tx.set(ref, { ...metadata, idempotencyKey, createdAt: "..." });
  return { claimed: true }; // Primera vez — proceder con el email
});
```

La transacción garantiza atomicidad: si dos invocaciones llegan simultáneamente, solo una obtiene `claimed: true`.

---

## Feed de notificaciones

Además del email, cada notificación se guarda en Firestore para el panel de notificaciones del usuario.

### `recordFeedEntries(recipients, payload)`

```javascript
// src/lib/notifications/notificationFeed.js
const batch = db.batch();

for (const email of recipients) {
  const encoded = encodeEmailKey(email);
  
  // Índice por email (siempre)
  batch.set(
    db.doc(`usersByEmail/${encoded}/notifications/${payload.idempotencyKey}`),
    entry
  );
  
  // Índice por UID (si está disponible)
  if (recipientUid) {
    batch.set(
      db.doc(`users/${recipientUid}/notifications/${payload.idempotencyKey}`),
      entry
    );
  }
}

await batch.commit();
```

### Lectura del feed — `listUserNotifications(email, uid, limit)`

Cuando el usuario abre el panel de notificaciones, se leen **tres fuentes en paralelo**:

```javascript
const [byEmail, byUid, fromDeliveries] = await Promise.all([
  loadEmailFeed(email, limit),       // usersByEmail/{email}/notifications
  loadUidFeed(uid, limit),           // users/{uid}/notifications
  loadDeliveryFallback(email, limit) // collectionGroup query (fallback)
]);
```

Las tres fuentes se fusionan y deduplicán por `idempotencyKey`. El fallback de `collectionGroup` actúa cuando las otras dos colecciones están vacías (ej: usuario recién migrado).

**Costo:** 3 queries por apertura del panel. Ver [[09-infra-capacity]].

---

## Módulo: buildEmail.js — Plantillas de email

`src/lib/notifications/buildEmail.js` construye los emails según el tipo de evento.

Cada email tiene tres versiones:
- `subject`: línea de asunto
- `html`: versión visual con estilos inline
- `text`: versión texto plano (para clientes de email que no soportan HTML)

Ejemplo de subject por evento:

| Evento | Subject |
|---|---|
| `task_completed` | `✅ "Diseñar mockups" completada — Proyecto Alfa` |
| `subtask_completed` | `✅ Subtarea "Wireframes mobile" completada` |
| `mention` | `💬 Te mencionaron en "Diseñar mockups"` |
| `salesforce_ready` | `🚀 "Diseñar mockups" lista para Salesforce` |

---

## Notificaciones de @menciones en comentarios — flujo del cliente

Las menciones en comentarios tienen un flujo alternativo iniciado por el cliente:

```
1. Usuario escribe comentario con @email@empresa.com
2. El cliente parsea el texto y extrae mentionedEmails
3. db.doAddComment() guarda el comentario con mentionedEmails
4. requestCommentMentionNotifications() envía:
   POST /api/notifications/mention
   Authorization: Bearer <firebase_id_token>
   {
     boardId, listId, tareaId, commentId,
     mentionedEmails: ["email@empresa.com"]
   }
5. La API route verifica el JWT y el acceso al board
6. Lee el comentario de Firestore y lo combina con los emails del cliente
7. buildCommentEvents() genera el evento mention
8. dispatchNotification() → email + feed
```

**Paralelismo con Cloud Functions:** `onTareaCommentCreated` también detecta menciones. El sistema de idempotencia previene el doble envío: el que llegue primero "reclama" el `idempotencyKey: "mention:comment:{commentId}"`.

---

## Diagrama resumen del sistema completo

```
CLIENTE                    VERCEL SERVERLESS        FIREBASE
──────────────────────     ──────────────────────   ──────────────────
TareaModal.handleSave() ──→ Firestore.update()
                                   │
                                   │ trigger
                                   ↓
                        Cloud Function               Firestore
                        onTareaNotification ──────→  Lee board + list
                                   │
                                   │ POST
                                   ↓
                        /api/notifications/dispatch
                                   │
                                   ├── Idempotency check ──→ Firestore
                                   ├── Resend.send()
                                   └── recordFeedEntries ──→ Firestore

Comments.onSubmit() ─────→ Firestore.add()
         │                          │
         │                          │ trigger
         │                          ↓
         │               Cloud Function
         │               onTareaCommentCreated ──→ (mismo path)
         │
         └── POST /api/notifications/mention ──→ (mismo path, primero en llegar gana)
```

---

*Ver también: [[05-api-routes]] | [[06-cloud-functions]] | [[02-modelo-datos]] para la estructura de `usersByEmail`*

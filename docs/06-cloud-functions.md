# Firebase Cloud Functions

#firebase #cloud-functions #backend #triggers #notificaciones

← [[05-api-routes]] | Siguiente: [[07-notificaciones]]

---

## Visión general

Las Cloud Functions de Kitrello son funciones Node.js que se ejecutan en los servidores de Google cuando ocurren eventos en Firestore. No son invocadas por el cliente directamente — son **triggers automáticos**.

```
functions/
├── index.js              → Entry point: exporta las 3 funciones
├── detectEvents.js       → Lógica de detección de eventos
├── detectFinalization.js → Detección específica de finalización (legacy)
└── mentions.js           → Parser de @menciones en texto
```

**Importante:** Las Cloud Functions requieren **plan Blaze** (pago) de Firebase. No están disponibles en el plan Spark gratuito. Sin embargo, tienen su propia capa gratuita (2 millones de invocaciones/mes).

---

## Función 1: `onTareaNotification`

**Trigger:** `onDocumentWritten` sobre `boards/{boardId}/lists/{listId}/tareas/{tareaId}`

Se activa en **cualquier escritura** sobre un documento de tarea: creación, actualización o eliminación.

### Configuración

```javascript
exports.onTareaNotification = onDocumentWritten(
  {
    document: "boards/{boardId}/lists/{listId}/tareas/{tareaId}",
    secrets: [notificationWebhookUrl, notificationWebhookSecret],
  },
  async (event) => { ... }
);
```

Los secrets se inyectan con `defineSecret` de Firebase Functions Params. Esto evita hardcodear credenciales en el código.

### Flujo paso a paso

```
1. Firestore entrega el evento con:
   - event.data.before → estado del documento ANTES de la escritura
   - event.data.after  → estado del documento DESPUÉS
   - event.params      → { boardId, listId, tareaId }

2. Si after no existe (fue eliminada), la función termina sin hacer nada
   if (!after) return;

3. loadBoardListContext(boardId, listId)
   → Lee 2 documentos en paralelo (Promise.all):
     a. boards/{boardId}      → título del board, miembros
     b. boards/{boardId}/lists/{listId}  → título de la lista

4. buildTareaEvents(before, after, context)
   → Analiza qué cambió y genera eventos
   → Ver sección "Detección de eventos" más abajo

5. Si hay eventos: postNotification() para cada uno
   → POST /api/notifications/dispatch con el webhook secret

Total lecturas Firestore por trigger: 2
Total escrituras: 0 (las hace el webhook handler)
```

### ¿Cuándo NO genera notificaciones?

- Si solo cambia el campo `index` (reordenamiento por drag & drop)
- Si la tarea fue eliminada (`after` es null)
- Si el evento ya fue procesado (idempotencia en el dispatch)

---

## Función 2: `onTareaCommentCreated`

**Trigger:** `onDocumentCreated` sobre `boards/{boardId}/lists/{listId}/tareas/{tareaId}/comments/{commentId}`

Se activa solo al **crear** un comentario nuevo en una tarea (no al editar ni eliminar).

### Flujo paso a paso

```
1. Obtiene el comentario recién creado:
   const comment = event.data?.data();
   if (!comment) return;

2. Llama handleCommentCreated({ boardId, listId, tareaId, commentId, comment })

3. Dentro de handleCommentCreated:
   a. loadBoardListContext() → 2 lecturas (board + list)
   b. Lee la tarea para obtener su título y assignee
      → 1 lectura adicional (total: 3 por invocación)
   
   c. buildCommentEvents(comment, context)
      → Analiza si el comentario contiene @menciones
      → Ver módulo mentions.js

   d. Si hay menciones: postNotification() para cada una
      → POST /api/notifications/dispatch

Total lecturas por trigger: 3
```

---

## Función 3: `onSubtaskCommentCreated`

**Trigger:** `onDocumentCreated` sobre `boards/{boardId}/lists/{listId}/tareas/{tareaId}/subtaskComments/{subtaskId}/comments/{commentId}`

Idéntica a `onTareaCommentCreated` pero para comentarios en subtareas. La única diferencia es que también pasa `subtaskId` a `handleCommentCreated` para resolver el título correcto de la subtarea.

```javascript
exports.onSubtaskCommentCreated = onDocumentCreated(
  { document: "boards/.../subtaskComments/{subtaskId}/comments/{commentId}" },
  async (event) => {
    const { boardId, listId, tareaId, subtaskId, commentId } = event.params;
    await handleCommentCreated({ boardId, listId, tareaId, commentId, subtaskId, comment });
  }
);

// Alias por compatibilidad
exports.onTareaFinalized = exports.onTareaNotification;
```

---

## Módulo: detectEvents.js

### `buildTareaEvents(before, after, context)`

Analiza la diferencia entre el estado anterior y posterior de una tarea y genera un array de eventos a notificar.

#### Eventos que detecta

**1. Tarea completada (`task_completed`)**
```javascript
const wasTareaJustCompleted = (before, after) =>
  !before?.done && !!after?.done;
// Condición: done era false (o inexistente) y ahora es true
```

**2. Subtarea completada (`subtask_completed`)**
```javascript
const findNewlyCompletedSubtasks = (before, after) => {
  const beforeMap = new Map(before?.subtasks.map(s => [s.id, s]));
  return after?.subtasks.filter(s => s.done && !beforeMap.get(s.id)?.done);
};
// Compara el array de subtareas antes y después por ID
```

**3. Lista de listo para Salesforce (`salesforce_ready`)**
```javascript
if (!before?.readyForSalesforce && after.readyForSalesforce) {
  // El switch pasó de false a true
}
```

**4. Asignación de responsable (`assignee_changed`)**
```javascript
if (after.assigneeEmail && before?.assigneeEmail !== after.assigneeEmail) {
  // El email del responsable cambió
}
```

**5. Cambio de estado / lista (`status_changed`)**
```javascript
if (after.lastStatusChange?.changedAt !== before?.lastStatusChange?.changedAt) {
  // Se movió a otra lista (lastStatusChange es escrito por doMoveTarea)
}
```

**6. Mención en descripción (`mention`)**
```javascript
if (before?.description !== after.description) {
  extractNewMentionTargets(before.description, after.description, members)
  // Solo notifica menciones NUEVAS (no las que ya estaban)
}
```

#### Filtro de eventos permitidos

```javascript
const allowedEvents = new Set([
  "salesforce_ready",
  "task_completed",
  "subtask_completed",
  "mention",
]);
return events.filter(e => allowedEvents.has(e.eventType));
```

`status_changed` y `assignee_changed` se detectan pero están **filtrados** — no generan notificaciones en la versión actual. Están preparados para activarse en el futuro.

### `buildCommentEvents(comment, context)`

Genera un evento de mención para cada email mencionado en un comentario.

```
1. extractMentionTargetsFromComment(comment, members)
   → Combina las menciones almacenadas (comment.mentionedEmails)
     con las encontradas parseando el texto del comentario

2. Si no hay targets: retorna array vacío (sin notificación)

3. Genera UN solo evento de tipo "mention" con parsedTargetEmails = [todos los emails]
   (una sola llamada al webhook por comentario, no una por mención)
```

---

## Módulo: mentions.js

Parser de @menciones en texto libre.

### Estrategia de detección

El parser busca únicamente **emails completos** precedidos de `@`:

```javascript
const emailRegex = /@([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
```

Ejemplo de texto válido:
- `"@maria@empresa.com revisa esto"` → detecta `maria@empresa.com`
- `"@María"` → NO detecta nada (no es un email válido)

**¿Por qué solo emails?** Simplifica la resolución de a quién notificar. No hay ambigüedad con nombres que podrían no ser únicos en el equipo.

### `extractMentionTargetsFromComment(comment, members)`

Combina dos fuentes de información:
1. `comment.mentionedEmails` — array almacenado en el documento (puesto por el cliente al guardar)
2. Texto del comentario — parseado con la regex de emails

Fusiona ambas con un `Map` para deduplicar, priorizando la información almacenada.

### `extractNewMentionTargets(beforeText, afterText, members)`

Para menciones en descripciones: devuelve solo los emails que aparecen en `afterText` pero no en `beforeText`. Evita re-notificar menciones que ya estaban ahí antes de la edición.

---

## Comunicación con el servidor Vercel

Cada Cloud Function llama al webhook de Vercel para ejecutar el dispatch:

```javascript
const postNotification = async (payload) => {
  const url = notificationWebhookUrl.value()?.trim();
  const secret = notificationWebhookSecret.value()?.trim();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed (${response.status}): ${body}`);
  }
};
```

`notificationWebhookUrl` y `notificationWebhookSecret` son **Firebase Secrets** — credenciales cifradas que Firebase inyecta automáticamente al ejecutar la función. Nunca aparecen en el código fuente.

---

## Resumen de triggers y su costo

| Función | Trigger | Lecturas/invoc. | Se activa cuando |
|---|---|---|---|
| `onTareaNotification` | onDocumentWritten tarea | 2 | Cualquier escritura en una tarea |
| `onTareaCommentCreated` | onDocumentCreated comment | 3 | Se crea un comentario en una tarea |
| `onSubtaskCommentCreated` | onDocumentCreated subtaskComment | 3 | Se crea un comentario en subtarea |

**Nota sobre frecuencia:** `onTareaNotification` se activa en CADA escritura de tarea, incluyendo reordenamientos por drag & drop que no deberían generar notificaciones. El filtro de `allowedEvents` previene el envío, pero las 2 lecturas de contexto siempre ocurren.

---

*Ver también: [[07-notificaciones]] para el flujo completo de notificación | [[05-api-routes]] para el endpoint que recibe el webhook*

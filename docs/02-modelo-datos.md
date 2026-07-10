# Modelo de Datos — Firestore

#firestore #modelo-datos #backend #seguridad

← [[01-arquitectura]] | Siguiente: [[03-firebase-capa-db]]

---

## Visión general

Firestore es una base de datos NoSQL documental. Los datos se organizan en **colecciones** (carpetas) que contienen **documentos** (objetos JSON). Los documentos pueden tener **subcolecciones** anidadas.

Kitrello usa la siguiente jerarquía:

```
firestore/
│
├── boards/                          # Todos los tableros
│   └── {boardId}/                   # Documento de un board
│       ├── lists/                   # Subcolección: columnas
│       │   └── {listId}/            # Documento de una lista
│       │       └── tareas/          # Subcolección: tarjetas
│       │           └── {tareaId}/   # Documento de una tarea
│       │               ├── comments/               # Comentarios de tarea
│       │               │   └── {commentId}/
│       │               └── subtaskComments/         # Comentarios de subtarea
│       │                   └── {subtaskId}/
│       │                       └── comments/
│       │                           └── {commentId}/
│       └── _notificationDeliveries/ # Registro de idempotencia
│           └── {idempotencyKey}/
│
├── users/                           # Perfiles de usuario
│   └── {uid}/
│       ├── (campos del perfil)
│       └── boardRefs/               # Boards a los que pertenece
│           └── {boardId}/
│
└── usersByEmail/                    # Índice por email (para notificaciones)
    └── {encodedEmail}/
        └── notifications/
            └── {idempotencyKey}/
```

---

## Colección `boards`

Cada documento representa un tablero completo. Los miembros y sus roles se almacenan **desnormalizados** dentro del documento del board para evitar joins.

### Campos del documento `boards/{boardId}`

```json
{
  "title": "Proyecto Alfa",
  "ownerId": "uid_legacy",
  "ownerIds": ["uid1", "uid2"],
  "members": [
    {
      "uid": "uid1",
      "email": "usuario@empresa.com",
      "displayName": "María García",
      "photoURL": "https://lh3.googleusercontent.com/..."
    }
  ],
  "memberEmails": ["usuario@empresa.com", "otro@empresa.com"]
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `title` | string | Nombre del board |
| `ownerId` | string | UID del owner original (campo legacy) |
| `ownerIds` | string[] | Lista de UIDs con rol Owner (campo actual) |
| `members` | object[] | Objetos con uid, email, displayName, photoURL |
| `memberEmails` | string[] | Emails de todos los miembros (para queries `array-contains`) |

**Por qué `memberEmails` existe como campo separado:** Firestore no permite queries `array-contains` sobre arrays de objetos. Para buscar "todos los boards donde este email es miembro", se necesita un array plano de strings.

---

## Subcolección `boards/{boardId}/lists`

### Campos del documento `lists/{listId}`

```json
{
  "title": "En progreso",
  "index": 2
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `title` | string | Nombre de la columna |
| `index` | number | Posición de la columna (para ordenar) |

**Lista especial:** Cualquier lista cuyo `title.trim().toLowerCase() === "finalizado"` activa el marcado automático de tareas como completadas. Esto se valida en el cliente (`src/utils/completion.js`) y en las Cloud Functions.

---

## Subcolección `lists/{listId}/tareas`

Esta es la colección más rica en campos. Representa una tarjeta Kanban.

### Campos del documento `tareas/{tareaId}`

```json
{
  "title": "Diseñar mockups",
  "description": "Descripción en **Markdown** con @menciones",
  "index": 0,
  "done": false,
  "doneAt": null,
  "doneBy": null,
  "dueDate": "2026-08-01T00:00:00.000Z",
  "country": "MX",
  "assigneeEmail": "maria@empresa.com",
  "readyForSalesforce": false,
  "lastEditedBy": "Carlos López",
  "lastEditedByEmail": "carlos@empresa.com",
  "lastStatusChange": {
    "fromListId": "listId_anterior",
    "toListId": "listId_nueva",
    "fromListTitle": "En progreso",
    "toListTitle": "Revisión",
    "changedAt": "2026-07-09T10:00:00.000Z",
    "changedBy": "Carlos López"
  },
  "subtasks": [
    {
      "id": "1720520000000",
      "title": "Wireframes mobile",
      "description": "",
      "dueDate": null,
      "assigneeEmail": null,
      "done": false,
      "doneAt": null,
      "doneBy": null,
      "readyForSalesforce": false
    }
  ]
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `title` | string | Título de la tarea |
| `description` | string | Descripción en Markdown, soporta @menciones |
| `index` | number | Posición dentro de la lista (para ordenar) |
| `done` | boolean | Si la tarea está completada |
| `doneAt` | string ISO | Timestamp de cuándo se completó |
| `doneBy` | string | Nombre del usuario que la completó |
| `dueDate` | string ISO | Fecha de vencimiento |
| `country` | string | Código de país (ISO 3166-1 alpha-2) |
| `assigneeEmail` | string | Email del responsable asignado |
| `readyForSalesforce` | boolean | Flag de integración con Salesforce |
| `lastEditedBy` | string | Nombre del último editor (para Cloud Functions) |
| `lastEditedByEmail` | string | Email del último editor |
| `lastStatusChange` | object | Historial del último movimiento entre listas |
| `subtasks` | object[] | Array embebido de subtareas (no subcolección) |

**¿Por qué las subtareas están embebidas?** Al ser parte del mismo documento, actualizarlas es una sola operación de escritura. La desventaja es que el documento crece con cada subtarea. Se volvería un problema si una tarea tuviera cientos de subtareas (límite Firestore: 1 MiB por documento).

---

## Subcolección `tareas/{tareaId}/comments`

### Campos del documento `comments/{commentId}`

```json
{
  "text": "Revisado. @carlos@empresa.com puedes continuar.",
  "authorEmail": "maria@empresa.com",
  "authorName": "María García",
  "authorPhoto": "https://...",
  "mentionedEmails": ["carlos@empresa.com"],
  "createdAt": "2026-07-09T10:30:00.000Z",
  "updatedAt": null
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `text` | string | Contenido del comentario (soporta Markdown) |
| `authorEmail` | string | Email del autor (verificado en Security Rules) |
| `authorName` | string | Nombre de display del autor |
| `mentionedEmails` | string[] | Emails mencionados con @ (parseados en el cliente) |
| `createdAt` | string ISO | Timestamp de creación |
| `updatedAt` | string ISO | Timestamp de última edición (null si no fue editado) |

Los comentarios de subtareas siguen la misma estructura pero viven en `tareas/{tareaId}/subtaskComments/{subtaskId}/comments/{commentId}`.

---

## Colección `users`

### Campos del documento `users/{uid}`

```json
{
  "uid": "abc123",
  "email": "usuario@empresa.com",
  "firstName": "María",
  "lastName": "García",
  "displayName": "María García",
  "photoURL": "https://firebasestorage.googleapis.com/...",
  "createdAt": "2026-01-15T08:00:00.000Z",
  "updatedAt": "2026-07-01T12:00:00.000Z"
}
```

La subcolección `users/{uid}/boardRefs` guarda referencias a los boards del usuario:

```json
{ "boardId": "boardId_abc" }
```

Esto permite recuperar los boards de un usuario con una query local, aunque actualmente `onceGetBoards()` en `db.js` no la usa — hace queries directas a `boards`.

---

## Colección `usersByEmail`

Índice secundario para el feed de notificaciones. La clave del documento es el email **codificado** (los puntos `.` se reemplazan para evitar conflictos con la ruta de Firestore).

### Subcolección `usersByEmail/{encodedEmail}/notifications`

```json
{
  "idempotencyKey": "task_completed:tarea:abc:2026-07-09T10:00:00Z",
  "eventType": "task_completed",
  "boardId": "boardId_abc",
  "tareaId": "tareaId_xyz",
  "boardTitle": "Proyecto Alfa",
  "itemTitle": "Diseñar mockups",
  "actorName": "Carlos López",
  "actorEmail": "carlos@empresa.com",
  "messageFragment": "Tarea completada",
  "recipientEmail": "maria@empresa.com",
  "recipientUid": "uid_maria",
  "createdAt": "2026-07-09T10:00:05.000Z"
}
```

---

## Reglas de seguridad de Firestore

Las reglas se encuentran en `firestore.rules`. La lógica se basa en funciones helper:

### Funciones clave

```javascript
// ¿El usuario está autenticado?
function isSignedIn() {
  return request.auth != null;
}

// ¿El usuario es owner del board?
function isBoardOwner(board) {
  return isSignedIn() && request.auth.uid in board.ownerIds;
}

// ¿El email del usuario está en la lista de miembros?
function isBoardMemberEmail(board) {
  return isSignedIn()
    && request.auth.token.email in board.memberEmails;
}

// ¿Puede acceder al board? (owner O miembro)
function canAccessBoard(board) {
  return isBoardOwner(board) || isBoardMemberEmail(board);
}
```

### Resumen de permisos

| Recurso | Leer | Crear | Actualizar | Eliminar |
|---|---|---|---|---|
| `boards/{id}` | miembro o owner | cualquier autenticado | owner (todo) / miembro (sin cambiar roles ni miembros) | solo owner |
| `lists/{id}` | miembro o owner | miembro o owner | miembro o owner | miembro o owner |
| `tareas/{id}` | miembro o owner | miembro o owner | miembro o owner | miembro o owner |
| `comments/{id}` | miembro o owner | miembro o owner (solo su email) | autor del comentario | autor del comentario |
| `users/{uid}` | cualquier autenticado | propio usuario | propio usuario | propio usuario |

**Restricción importante en comentarios:** La regla `create` verifica que `request.resource.data.authorEmail == request.auth.token.email`. Esto impide que un usuario cree comentarios en nombre de otro.

---

*Ver también: [[03-firebase-capa-db]] para las funciones que leen/escriben estas colecciones | [[07-notificaciones]] para el uso de `usersByEmail`*

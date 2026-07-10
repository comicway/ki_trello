# Componentes Secundarios y Utilidades

#react #componentes #ui #utils #frontend

← [[04-vistas-y-componentes]] | Ver también: [[10-autenticacion-y-navegacion]] | [[00-indice]]

---

## Visión general

Este archivo documenta los componentes de soporte, la capa de componentes base (`ui/`), las utilidades del servidor de notificaciones, y las funciones helper restantes que no fueron cubiertas en las notas principales.

---

## Componente: HomeDashboard

**Archivo:** `src/components/HomeDashboard/index.jsx`

Panel central de la página `/boards`. Recibe datos pre-calculados de la vista `Boards` y los renderiza.

### Props

| Prop | Tipo | Descripción |
|---|---|---|
| `myPendingTareas` | array | Tareas asignadas al usuario actual que no están completadas |
| `membersWithPendingCounts` | array | Todos los miembros con su conteo de tareas pendientes |
| `currentUserEmail` | string | Email del usuario activo (para marcar "(tú)" en la lista) |

### Secciones

**1. Mis tareas pendientes** — Lista scrollable de tareas propias. Cada ítem es un enlace a `/b/{boardKey}`. Muestra board, lista y título de la tarea. Las subtareas tienen la etiqueta `[Subtarea]` prefijada.

**2. Miembros · tareas pendientes** — Lista de todos los miembros con un badge numérico de tareas pendientes. Ordenado de mayor a menor por `pendingCount`. Útil para ver quién tiene más carga de trabajo.

**3. RecentNotifications** — Cargado con `next/dynamic` y `ssr: false`:

```javascript
const RecentNotifications = dynamic(() => import("../RecentNotifications"), {
  ssr: false,
  loading: () => <section>Cargando notificaciones…</section>,
});
```

`ssr: false` es necesario porque `RecentNotifications` usa `firebase.auth` directamente, que no puede ejecutarse en el servidor.

---

## Componente: RecentNotifications

**Archivo:** `src/components/RecentNotifications/index.jsx`

Panel de las últimas 10 notificaciones del usuario. Se carga de forma lazy desde `HomeDashboard`.

### Flujo de carga

```
1. onAuthStateChanged detecta usuario autenticado
2. user.getIdToken() → obtiene el Firebase JWT fresco
3. fetch("/api/notifications?limit=10", { Authorization: Bearer <token> })
4. Renderiza lista de notificaciones con formato:
   [fecha] [actorName] [messageFragment]
```

La variable `cancelled` evita actualizaciones de estado si el componente se desmonta antes de que la promesa resuelva (previene memory leaks):

```javascript
let cancelled = false;
// ...dentro del fetch:
if (!cancelled) {
  setItems(body.notifications || []);
}
return () => { cancelled = true; unsubscribe(); };
```

---

## Componente: AddMemberModal

**Archivo:** `src/components/AddMemberModal/index.jsx`

Modal para gestión de miembros del board. Solo visible y funcional para usuarios con rol Owner.

### Funcionalidades

**Agregar miembros:** Acepta múltiples emails separados por coma, punto y coma o salto de línea:
```javascript
const emails = emailInput.split(/[,\n;]/).map(e => e.trim()).filter(Boolean);
```

Valida cada email antes de enviar. Si alguno es inválido, muestra todos los inválidos juntos y no procede.

**Gestión de roles:** Botón "Owner / Quitar" por cada miembro:
```javascript
const isOwner = isMemberOwner(member, ownerIds);
isOwner
  ? await db.doDemoteOwner(boardKey, member.uid)
  : await db.doPromoteToOwner(boardKey, member.uid);
```

Solo se puede promover a miembros que ya tienen `uid` (es decir, que ya hicieron login). Los invitados pendientes (uid: null) no tienen botón de rol.

**Remover miembros:** Solo para no-owners. Los owners deben ser degradados antes de ser removidos.

### Estados de carga granulares

| Estado | Descripción |
|---|---|
| `loading` | Al agregar miembro(s) |
| `removingEmail` | Almacena el email del miembro que se está removiendo actualmente |
| `roleLoadingUid` | Almacena el UID cuyo rol se está cambiando |

Esto permite que múltiples operaciones se distingan visualmente en la UI (ej: el spinner solo aparece en el botón del miembro que se está procesando).

---

## Componente: Subtarea

**Archivo:** `src/components/Subtarea/index.jsx`

Fila compacta dentro del `TareaModal` que representa una subtarea.

### Controles inline

Muestra tres controles en la misma fila:
1. **DoneToggle** → checkbox que llama `buildDoneUpdate(!subtask.done, currentUser, ...)`
2. **DateField (DatePicker)** → muestra "hoy" o "DD MMM" si hay fecha; abre el picker al click
3. **Dropdown de Assignee** → muestra el avatar del asignado o un ícono vacío. Al hacer click abre un menú con todos los miembros

### Apertura del panel detallado

Click en el título → abre `SubtareaModal` (el mismo drawer que `TareaModal` pero para subtareas).

---

## Componente: SubtareaModal

**Archivo:** `src/components/SubtareaModal/index.jsx`

Drawer de detalle para subtareas. Estructura idéntica a `TareaModal` pero simplificada: sin campo "Estado" (las subtareas no se mueven entre listas), sin sección de subtareas anidadas.

**Diferencia clave con TareaModal:** Los comentarios se cargan pasando `subtaskId`:
```jsx
<Comments
  boardKey={boardKey}
  listKey={listKey}
  tareaKey={tareaKey}
  subtaskId={subtask.id}   ← esto indica que son comentarios de subtarea
  members={members}
/>
```

Esto hace que `onceGetComments` y `doAddComment` usen la ruta `subtaskComments/{subtaskId}/comments` en lugar de `comments`.

---

## Componente: BoardListView

**Archivo:** `src/components/BoardListView/index.jsx`

Vista alternativa del board en formato tabla (modo lista). Activada con el toggle de vista en el Board.

### Diferencias con el modo Kanban

| Aspecto | Modo Board (Kanban) | Modo Lista |
|---|---|---|
| Layout | Columnas horizontales | Secciones verticales por lista |
| Componente de tarea | `Tarea` + `TareaModal` | `TareaListItem` |
| Drag & Drop | Completo (entre listas y dentro de listas) | Solo dentro de listas (Droppable por sección) |
| Carga de tareas | En cada `List` por separado | Todas juntas desde el Board padre |

Cuando no hay tareas en una lista, muestra un área de drop con el mensaje "Arrastra tareas aquí" que desaparece cuando una tarea entra (`snapshot.isDraggingOver`).

---

## Componentes UI base (src/components/ui/)

Estos son los bloques de construcción compartidos por todos los componentes:

### Drawer.jsx
Panel lateral deslizante. Recibe `open`, `onClose`, `width` y `zIndex`. El `TareaModal` y el `SubtareaModal` lo usan como contenedor base. El `zIndex` configurable permite que el `SubtareaModal` (1300) aparezca encima del `TareaModal` (1200 por defecto).

### Modal.jsx
Ventana modal centrada. Usa overlay oscuro y cierre al hacer click fuera. Lo usan `AddMemberModal`, `CreateBoardModal`, `DeleteBoardModal`.

### Dropdown.jsx
Menú contextual flotante. Recibe un `trigger` (el elemento que lo activa) y un array `items`. Lo usa el selector de responsable en `Subtarea`.

### DateField.jsx
Wrapper sobre el date picker nativo. Maneja la conversión entre valores ISO y el formato `YYYY-MM-DD` que espera el `<input type="date">`. Usa `dayjs` para las conversiones.

### AssigneeSelect.jsx
Selector de responsable. Muestra los avatares de los miembros disponibles. Versión más elaborada que el `Dropdown` de `Subtarea`.

### icons.jsx
Exporta todos los íconos del proyecto como componentes SVG inline. Incluye: `HomeIcon`, `LogoutIcon`, `BellIcon`, `EditIcon`, `DeleteIcon`, `CrownIcon`, `SwapIcon`, `CheckCircleIcon`, `UserIcon`, `PlusIcon`, `ListIcon`, `AlignLeftIcon`, `CalendarIcon`, `LinkIcon`, `CloseIcon`, `CameraIcon`, `EyeIcon`, `EyeOffIcon`, `GoogleIcon`, `MailIcon`, `UserAddIcon`, etc.

### styles.js
Clases de Tailwind predefinidas como constantes:
```javascript
export const inputClass = "bg-ki-black text-pearl-white border border-border-ki ...";
export const selectClass = "...";
export const btnPrimary = "flex items-center gap-2 px-4 py-2 bg-ki-purple ...";
export const btnIcon = "...";
```
Garantiza consistencia visual en todos los inputs y botones del sistema.

---

## Utilidades: src/utils/

### `src/utils/index.js`

```javascript
// Convierte un objeto { key: value } en array [{ ...value, key }]
// Útil para datos de Firebase RTDB (legado)
export function mergeDataWithKey(data) { ... }

// Obtiene el boardKey desde props o de la URL actual
export function getBoardKey(boardId) {
  if (boardId) return boardId;
  // Fallback: extrae el ID de /b/{id} en la URL
  const parts = window.location.pathname.split("/");
  const bIndex = parts.indexOf("b");
  return parts[bIndex + 1] || "";
}

// Helper para setState de React por nombre de propiedad (legado)
export function byPropKey(propertyName, value) {
  return { [propertyName]: value };
}
```

### `src/utils/tareaCountryFilter.js`

```javascript
export const filterTareasByCountry = (tareasByList, countryCode) => {
  if (!countryCode) return tareasByList || [];

  return tareasByList.map(({ listKey, tareas }) => ({
    listKey,
    tareas: tareas.filter((tarea) => tarea.country === countryCode),
  }));
};
```

Filtrado **en memoria** (sin queries Firestore). Recorre el estado ya cargado de tareas y devuelve solo las que tienen el `country` especificado. El `CountryFilterButton` en el Board usa esta función a través de `useMemo`.

### `src/utils/tareasState.js`

Helpers para manejar el estado local del array de tareas agrupado por lista:

```javascript
// Garantiza que cada lista del board tenga su entrada en el array de tareas
export const ensureTareasForLists = (lists, tareas) => {
  return lists.map((list) => {
    const existing = tareas.find(t => String(t.listKey) === String(list.key));
    return existing
      ? { listKey: list.key, tareas: [...(existing.tareas || [])] }
      : { listKey: list.key, tareas: [] };
  });
};

// Encuentra el índice de una lista en el array de tareas
export const getListTareasIndex = (tareasClone, listKey) =>
  tareasClone.findIndex(e => String(e.listKey) === String(listKey));
```

La comparación con `String()` es importante porque los IDs de Firestore son strings, pero en algunos lugares podrían llegar como números (datos legados de RTDB).

### `src/utils/datePicker.js`

```javascript
export const toDayjs = (value) => {
  if (value == null || value === "") return null;
  if (dayjs.isDayjs(value)) return value;                        // ya es dayjs
  if (typeof value?.toDate === "function") return dayjs(value.toDate()); // Timestamp de Firestore
  return dayjs(value);                                           // string ISO u otro
};
```

Convierte cualquier representación de fecha (string ISO, Firestore Timestamp, objeto dayjs, o null) en un objeto dayjs normalizado. Usado por `DateField` para manejar los diferentes formatos de fechas que pueden llegar de Firestore o del estado local.

---

## Módulos de notificaciones del servidor (src/lib/notifications/)

Módulos que no tenían nota propia:

### `requestCommentMentionNotifications.js` — Llamada desde el cliente

```javascript
export async function requestCommentMentionNotifications({
  boardId, listId, tareaId, commentId, subtaskId, mentionedEmails
}) {
  const user = auth?.currentUser;
  if (!user || !mentionedEmails.length) return; // sale silenciosamente si no hay menciones

  const token = await user.getIdToken();
  await fetch(`${window.location.origin}/api/notifications/mention`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ boardId, listId, tareaId, commentId, subtaskId, mentionedEmails }),
  });
}
```

Función cliente que llama a la API Route de menciones. Se ejecuta en el componente `Comments` después de guardar el comentario. Falla silenciosamente (solo logea el error) para no bloquear al usuario si hay problemas de red.

### `loadNotificationContext.js` — Contexto para el servidor

```javascript
export async function loadNotificationContext({ boardId, listId, tareaId, itemType, subtaskId }) {
  // Lee board + list + tarea en paralelo (3 lecturas)
  const [boardSnap, listSnap, tareaSnap] = await Promise.all([
    db.doc(`boards/${boardId}`).get(),
    db.doc(`boards/${boardId}/lists/${listId}`).get(),
    db.doc(`boards/${boardId}/lists/${listId}/tareas/${tareaId}`).get(),
  ]);
  // Construye y retorna el contexto con la info necesaria para el email
}

export async function assertBoardMember(boardId, email) {
  // Verifica que email está en memberEmails del board
  // Lanza Error("Forbidden") si no lo está
}
```

Usado por las API Routes para cargar el contexto completo de una notificación. `assertBoardMember` es el guard de autorización que verifica membresía antes de procesar notificaciones del cliente.

### `sendTaskCompletedEmail.js` y `buildTaskCompletedEmail.js`

Ambos son wrappers de compatibilidad:

```javascript
// sendTaskCompletedEmail.js — re-exporta desde el orquestador
export { dispatchNotification, sendTaskCompletedNotifications } from "./orchestrator";

// buildTaskCompletedEmail.js — adaptador del formato legacy al nuevo
export function buildTaskCompletedEmail(legacyParams) {
  return buildNotificationEmail({ eventType: "task_completed", ...legacyParams });
}
```

Existen para que código anterior que importaba de estas rutas siga funcionando sin cambios.

### `eventTypes.js`

Exporta las constantes de tipos de evento como objeto y como strings individuales:
```javascript
export const EVENT_TYPES = {
  TASK_COMPLETED: "task_completed",
  SUBTASK_COMPLETED: "subtask_completed",
  SALESFORCE_READY: "salesforce_ready",
  MENTION: "mention",
  ASSIGNEE_CHANGED: "assignee_changed",
  STATUS_CHANGED: "status_changed",
};
```

---

## Estructura de src/firebase/index.js

```javascript
import * as auth from "./auth";
import * as db from "./db";
import * as user from "./user";
import * as firebase from "./firebase";

export { auth, db, user, firebase };
```

Punto de entrada unificado. Permite importar todo desde `@/firebase` en lugar de paths específicos:
```javascript
import { auth, db, firebase } from "../../firebase";
// en lugar de:
import { auth } from "../../firebase/auth";
import { db } from "../../firebase/db";
```

---

*Ver también: [[04-vistas-y-componentes]] | [[07-notificaciones]] | [[10-autenticacion-y-navegacion]]*

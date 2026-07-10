# Vistas y Componentes React

#react #frontend #componentes #ui

← [[03-firebase-capa-db]] | Siguiente: [[05-api-routes]]

---

## Árbol de componentes general

```
app/layout.js
└── Providers (app/providers.jsx)
    └── UserProvider (src/providers/UserProvider.js)
        └── [página activa]
            ├── /boards → Boards (src/views/Boards/index.jsx)
            │   ├── HomeDashboard
            │   ├── CreateBoardModal
            │   └── CreateBoardTarea
            │
            └── /b/[id] → Board (src/views/Board/index.jsx)
                ├── BoardTitle
                ├── CountryFilterButton
                ├── BoardListView (modo lista)
                ├── DragDropContext (@hello-pangea/dnd)
                │   └── List (×N)
                │       ├── ListHeader
                │       ├── Tarea (×M)
                │       │   └── TareaModal (Drawer)
                │       │       ├── DoneToggle
                │       │       ├── AssigneeSelect
                │       │       ├── CountrySelect
                │       │       ├── Subtarea (×P)
                │       │       ├── Comments
                │       │       │   └── CommentItem (×C)
                │       │       ├── ReadyForSalesforceSwitch
                │       │       └── DoneFooter
                │       └── CreateTarea
                └── CreateList
```

---

## Provider: UserProvider

**Archivo:** `src/providers/UserProvider.js`

```javascript
export const UserContext = createContext({ user: null });

export default function UserProvider(props) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    firebase.auth.onAuthStateChanged((userAuth) => {
      setUser(userAuth);
    });
  }, []);

  return (
    <UserContext.Provider value={user}>{props.children}</UserContext.Provider>
  );
}
```

**Paso a paso:**
1. Crea un Context de React que expone el usuario autenticado
2. El `useEffect` se ejecuta una sola vez al montar el componente
3. `onAuthStateChanged` es un listener de Firebase Auth — se activa automáticamente cuando el usuario hace login o logout
4. Cuando cambia el estado de auth, `setUser(userAuth)` actualiza el contexto
5. Todos los componentes hijos pueden acceder al usuario con `useContext(UserContext)`

**Uso en componentes:**
```javascript
const currentUser = useContext(UserContext);
// currentUser es null si no hay sesión, o el objeto Firebase User
```

---

## Vista: Boards (Home Dashboard)

**Archivo:** `src/views/Boards/index.jsx`

Esta es la pantalla principal que ve el usuario al hacer login. Muestra todos los boards y el dashboard de tareas pendientes.

### Flujo de carga

```
1. onAuthStateChanged detecta usuario autenticado
         ↓
2. setLoading(true)
         ↓
3. doClaimMembership(user)
   → Vincula UID con boards donde el usuario fue invitado por email
   → Operación de "primer login": después no hace cambios
         ↓
4. onceGetBoards(uid, email)
   → 3 queries a Firestore → array de boards
         ↓
5. setBoards(result)
         ↓
6. onceGetHomeDashboard(result, email)
   → Loop nested sobre boards/listas/tareas
   → Calcula tareas pendientes del usuario y de cada miembro
         ↓
7. setMyPendingTareas + setMembersWithPendingCounts
         ↓
8. setLoading(false) → renderiza la UI
```

### Estado local

| Estado | Tipo | Descripción |
|---|---|---|
| `boards` | array | Lista de todos los boards del usuario |
| `myPendingTareas` | array | Tareas asignadas al usuario que no están completadas |
| `membersWithPendingCounts` | array | Miembros con su conteo de tareas pendientes |
| `currentUserEmail` | string | Email del usuario para el HomeDashboard |
| `loading` | boolean | Controla el spinner de carga |
| `modalOpen` | boolean | Controla la visibilidad del modal de crear board |

---

## Vista: Board (Tablero Kanban)

**Archivo:** `src/views/Board/index.jsx`

La vista central de la aplicación. Muestra columnas (lists) con tarjetas (tareas) que se pueden arrastrar.

### Flujo de carga

```
1. useEffect al montar con boardId
         ↓
2. doClaimMembership()  ← vinculación de membresía
         ↓
3. Promise.all([
     onceGetBoard(bKey),    → 1 lectura
     onceGetLists(bKey),    → 1 query
     onceGetMembers(bKey)   → 1 lectura (datos en el doc del board)
   ])
         ↓
4. setBoard / setLists / setMembers / setLoading(false)
```

Nota: las tareas **no se cargan aquí** en modo BOARD. Cada componente `List` las carga individualmente en su propio `useEffect`.

### Modos de vista

```
viewMode === "board"  → columnas Kanban con drag & drop
viewMode === "list"   → vista tabla plana (BoardListView)
```

En modo lista, el Board sí carga todas las tareas de todas las listas con `Promise.all(lists.map(l => onceGetTarea(...)))`.

### Drag & Drop

El componente usa `@hello-pangea/dnd` (fork de `react-beautiful-dnd`):

```
DragDropContext
├── Droppable (para listas — mover columnas)
│   └── Draggable (cada columna)
│       └── Droppable (para tareas — mover tarjetas)
│           └── Draggable (cada tarjeta)
```

Al soltar una tarjeta, se llama `doMoveTarea` con la posición nueva. Al soltar una columna, se llama `onListMove` con el nuevo orden.

### Filtro por país

```javascript
const filteredTareas = useMemo(
  () => filterTareasByCountry(tareas, countryFilter),
  [tareas, countryFilter]
);
```

El filtro es puramente en memoria — no hace queries adicionales a Firestore.

---

## Componente: List

**Archivo:** `src/components/List/index.jsx`

Cada columna del tablero. Se monta una instancia por cada lista del board.

### Carga de tareas

```javascript
useEffect(() => {
  if (!boardKey || !listKey) return;
  db.onceGetTarea(boardKey, listKey).then((tareaArray) => {
    setTareas({ listKey, tareas: tareaArray });
  });
}, [boardKey, listKey]);
```

**Paso a paso:**
1. Al montarse el componente, dispara una lectura de Firestore
2. Cada columna hace su propia query — no hay coordinación entre columnas
3. Si hay 5 columnas, se disparan 5 queries simultáneas al cargar el board
4. El resultado se guarda en el estado local `tareas`

Después, las tareas se pasan "hacia arriba" al Board con `handleSetTareas`.

---

## Componente: Tarea (tarjeta Kanban)

**Archivo:** `src/components/Tarea/index.jsx`

La tarjeta individual en el tablero. Es un componente presentacional — no hace queries a Firestore directamente.

### Comportamiento

- Muestra el título con línea tachada si `done === true`
- En hover muestra íconos de editar y eliminar
- Click en el título abre el `TareaModal` (Drawer lateral)
- Click en el checkbox llama `handleToggleDone` → `buildDoneUpdate()` → `handleEditTarea`

### Auto-focus

```javascript
useEffect(() => {
  if (autoFocus) {
    setEditing(true);         // Pone el input en modo edición
    onAutoFocusConsumed?.();  // Notifica al padre que ya se consumió
  }
}, [autoFocus]);
```

Esto permite que al crear una tarea nueva, el cursor quede directamente en el campo de título.

---

## Componente: TareaModal (Drawer de detalle)

**Archivo:** `src/components/TareaModal/index.jsx`

El panel lateral que aparece al hacer click en una tarjeta. Es el componente más complejo de la UI.

### Características

- **Ancho redimensionable:** usa el hook `useResizableDrawer` — el usuario puede arrastrarlo
- **Edición inline:** todos los campos se editan directamente, sin botón "Guardar" global
- **Auto-guardado por campo:** cada cambio llama `handleSave()` inmediatamente

### Lógica de `handleSave(updates)`

```
Paso 1: Combina el estado actual con los updates parciales que llegan
        (ej: si solo cambió el assignee, los demás campos se mantienen)
        
Paso 2: Si done pasa a true y no había doneAt, captura timestamp + usuario

Paso 3: Si done pasa a false, limpia doneAt y doneBy

Paso 4: Añade lastEditedBy y lastEditedByEmail (para Cloud Functions)

Paso 5: Llama handleEditTarea({ listKey, tareaKey, tarea: updatedTarea })
        → que llega hasta db.doEditTarea() → 1 escritura Firestore
```

### Auto-completado al mover a "Finalizado"

```javascript
useEffect(() => {
  if (!visible || doneAt || !isFinalizadoList(lists, listKey)) return;
  const meta = buildDoneUpdate(true, currentUser, { doneAt, doneBy });
  setDone(true);
  handleEditTarea({ listKey, tareaKey, tarea: meta });
}, [visible, listKey]);
```

Cuando se abre el modal de una tarea que está en la lista "Finalizado" y aún no tiene `doneAt`, se marca automáticamente como completada.

---

## Componente: Comments

**Archivo:** `src/components/Comments/index.jsx`

Sistema de comentarios dentro del Drawer de tarea.

### Flujo de carga

```
1. Al montar el componente Comments:
   db.onceGetComments(boardKey, listKey, tareaKey)
   → 1 query Firestore → array de comentarios

2. Al enviar un comentario:
   db.doAddComment(..., { text, authorEmail, authorName, mentionedEmails })
   → 1 escritura Firestore
   → Si hay @menciones, llama requestCommentMentionNotifications()
     → POST /api/notifications/mention con Bearer token

3. Al editar un comentario:
   db.doEditComment(..., text)
   → 1 escritura Firestore (actualiza text + updatedAt)

4. Al eliminar:
   db.doDeleteComment(...)
   → 1 eliminación Firestore
```

---

## Hook: useResizableDrawer

**Archivo:** `src/hooks/useResizableDrawer.js`

Hook personalizado que permite redimensionar el Drawer lateral con el mouse.

```javascript
const [width, handleMouseDown] = useResizableDrawer(520);
```

**Paso a paso:**
1. El estado `width` define el ancho en píxeles del drawer (inicial: 520px)
2. `handleMouseDown` se asigna a un borde invisible del drawer
3. Al hacer mousedown en ese borde, escucha mousemove en `window`
4. Calcula el delta (diferencia entre posición inicial y actual)
5. Usa `requestAnimationFrame` para actualizar el ancho de forma fluida
6. Al soltar el mouse (mouseup), limpia los event listeners
7. Límites: mínimo 320px, máximo 95% del ancho de pantalla

---

## Utilidades

### `src/utils/boardRoles.js`

```javascript
// Obtiene los IDs de owners del board (compatibilidad con campo legacy)
export const getOwnerIds = (board) => {
  if (board?.ownerIds?.length) return board.ownerIds;  // campo actual
  if (board?.ownerId) return [board.ownerId];           // campo legacy
  return [];
};

// Verifica si un UID es owner del board
export const isBoardOwnerUser = (board, uid) =>
  uid && getOwnerIds(board).includes(uid);
```

### `src/utils/completion.js`

```javascript
// ¿La lista actual es "Finalizado"?
export const isFinalizadoList = (lists, listKey) => {
  const list = lists?.find((l) => l.key === listKey);
  return list?.title?.trim().toLowerCase() === "finalizado";
};

// Construye el objeto de actualización para marcar done
export const buildDoneUpdate = (nextDone, currentUser, existing = {}) => {
  if (nextDone) {
    return {
      done: true,
      doneAt: existing.doneAt || new Date().toISOString(),
      doneBy: existing.doneBy || currentUser?.displayName || currentUser?.email || null,
    };
  }
  return { done: false, doneAt: null, doneBy: null };
};
```

La función `buildDoneUpdate` se usa en varios lugares del sistema. Garantiza que `doneAt` no se sobreescriba si ya existía (ej: al abrir el modal de una tarea ya completada).

---

## Flujo completo de una acción de usuario (ejemplo: marcar tarea como completada)

```
1. Usuario hace click en el checkbox (DoneToggle)
            ↓
2. handleToggleDone() en Tarea.jsx
            ↓
3. buildDoneUpdate(!done, currentUser, { doneAt, doneBy })
   → { done: true, doneAt: "2026-07-09T...", doneBy: "María" }
            ↓
4. handleEditTarea({ listKey, tareaKey, tarea: update })
   (prop del Board → sube por el árbol de componentes)
            ↓
5. db.doEditTarea(boardKey, listKey, tareaKey, tarea)
   → Firestore: boards/{b}/lists/{l}/tareas/{t}.update(update)
   → 1 escritura
            ↓
6. [Cloud Function trigger] onTareaNotification se activa
            ↓
7. detectEvents.buildTareaEvents(before, after, context)
   → Detecta que done pasó de false a true
   → Genera evento { eventType: "task_completed", ... }
            ↓
8. postNotification() → POST /api/notifications/dispatch
            ↓
9. dispatchNotification() en el servidor:
   - Verifica idempotencia → 1 transacción Firestore
   - Envía email con Resend al assignee o a los owners
   - Escribe entrada en usersByEmail/.../notifications
```

---

*Ver también: [[05-api-routes]] | [[06-cloud-functions]] | [[07-notificaciones]]*

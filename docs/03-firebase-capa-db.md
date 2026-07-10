# Capa de Datos Firebase — src/firebase/db.js

#firebase #firestore #backend #lectura-escritura

← [[02-modelo-datos]] | Siguiente: [[04-vistas-y-componentes]]

---

## ¿Qué es este archivo?

`src/firebase/db.js` es el **único punto de acceso de Firestore en el cliente**. Todos los componentes y vistas importan funciones de este módulo. Nunca acceden a Firestore directamente.

Esto permite:
- Centralizar la lógica de Firestore
- Cambiar la implementación sin tocar los componentes
- Ver en un solo lugar el costo en lecturas/escrituras

---

## Referencia helper

```javascript
// src/firebase/db.js — línea 1
const globalBoardRef = (boardKey) =>
  db.collection("boards").doc(boardKey);
```

**Paso a paso:**
1. `db` es la instancia de Firestore del SDK v8 (obtenida desde `src/firebase/firebase.js`)
2. `.collection("boards")` apunta a la colección raíz
3. `.doc(boardKey)` apunta al documento específico del board
4. Esta referencia se reutiliza en casi todas las funciones del módulo

---

## Sección: Boards

### `doCreateBoard(board)`

Crea un tablero nuevo y registra la referencia en el perfil del usuario.

```
Paso 1: Espera a que Firebase Auth resuelva el usuario
        (usa waitForAuthUser para evitar race condition)
        
Paso 2: Construye boardData con:
        - title del board
        - ownerId = uid del usuario actual
        - ownerIds = [uid]
        - members = [{ uid, email, displayName, photoURL }]
        - memberEmails = [email]
        
Paso 3: db.collection("boards").add(boardData)
        → Firestore genera un ID automático
        → 1 escritura
        
Paso 4: db.collection("users").doc(uid)
          .collection("boardRefs").doc(ref.id).set(...)
        → Registra que este usuario tiene acceso al board
        → 1 escritura adicional
        
Total: 2 escrituras Firestore
```

### `onceGetBoards(uid, email)`

Recupera todos los boards a los que pertenece un usuario. Usa tres queries para cubrir casos legacy.

```
Paso 1: Query 1 — boards donde memberEmails contiene email
        (cubre invitados que ya tienen cuenta)
        
Paso 2: Query 2 — boards donde ownerIds contiene uid
        (cubre boards creados por el usuario)
        
Paso 3: Query 3 — boards donde ownerId == uid
        (compatibilidad con boards creados antes del campo ownerIds)
        
Paso 4: Combina los resultados en un Map para deduplicar
        (un board puede aparecer en las 3 queries)
        
Paso 5: Backfill — si encuentra boards sin memberEmails o sin ownerIds,
        los actualiza automáticamente para futuras queries
        → N escrituras opcionales (solo si hay datos legacy)

Total: 3 lecturas de colección + N documentos + posibles escrituras de backfill
```

### `doClaimMembership(user)`

Llamada en cada login. Vincula el UID del usuario con los boards donde ya estaba invitado por email.

```
Contexto: Cuando alguien invita a "nuevo@empresa.com", ese miembro
aún no tiene UID (no se ha registrado). Al hacer login por primera vez,
doClaimMembership completa ese vínculo.

Paso 1: Busca todos los boards donde memberEmails contiene el email
        → Query 1: boards donde es miembro

Paso 2: Para cada board encontrado:
        - Registra boardRef en users/{uid}/boardRefs/{boardId}
        - Si el miembro en board.members no tiene uid, lo actualiza

Paso 3: Busca boards donde ownerIds contiene uid
        → Query 2

Paso 4: Busca boards donde ownerId == uid
        → Query 3

Paso 5: batch.commit() — consolida todos los cambios en una sola operación

Total: 3 queries + 1 batch write
⚠️ Se ejecuta en cada carga de /boards y /b/[id] — ver [[09-infra-capacity]]
```

---

## Sección: Members

### `doAddMember(boardKey, memberEmail)`

```
Paso 1: Lee el board (1 lectura) y verifica que el usuario actual es owner
Paso 2: Verifica que el email no está ya en memberEmails
Paso 3: Crea objeto newMember con uid: null y displayName: email
        (se completará cuando el usuario haga login)
Paso 4: Actualiza el board con members y memberEmails nuevos
        → 1 escritura (update del documento boards/{boardKey})

Total: 1 lectura + 1 escritura
```

### `doRemoveMember(boardKey, memberEmail)`

```
Paso 1: Lee el board (1 lectura), verifica permisos de owner
Paso 2: Verifica que el miembro existe y no es owner
Paso 3: Actualiza board filtrando el miembro de members y memberEmails
        → 1 escritura
Paso 4: Si el miembro tiene uid, elimina su boardRef
        → 1 escritura adicional opcional

Total: 1 lectura + 1-2 escrituras
```

### `doPromoteToOwner` / `doDemoteOwner`

```
Paso 1: Lee board, verifica que el solicitante es owner actual
Paso 2: Modifica el array ownerIds
Paso 3: Actualiza el campo ownerId (legacy) con el primer owner del array
Paso 4: 1 escritura (update del board)
```

---

## Sección: Lists

### `onceGetLists(boardKey)`

```
Paso 1: globalBoardRef(boardKey).collection("lists").orderBy("index").get()
Paso 2: Itera sobre los docs y construye array con { key: doc.id, ...doc.data() }

Total: 1 query → devuelve N documentos (1 lectura por lista)
```

### `doCreateList(boardKey, list)`

```
Paso 1: Lee la colección de listas para contar cuántas hay (snap.size)
        → 1 lectura de colección
Paso 2: Usa snap.size como índice de la nueva lista
Paso 3: listsRef.add({ ...list, index }) → 1 escritura

Total: 1 lectura + 1 escritura
```

### `onListMove(params)`

Cuando el usuario arrastra una columna a otra posición:

```
Paso 1: Recibe el array de listas en su nuevo orden
Paso 2: Crea un batch
Paso 3: Para cada lista, actualiza su campo index al nuevo valor
        → 1 escritura por lista
Paso 4: batch.commit()

Total: N escrituras (1 por cada lista del board)
```

### `doDeleteList(boardKey, listKey)`

```
Paso 1: Lee todas las tareas de la lista (1 query)
Paso 2: Crea un batch que elimina cada tarea + la lista misma
Paso 3: batch.commit()

Total: 1 lectura + N+1 eliminaciones
```

---

## Sección: Tareas

### `onceGetTarea(boardKey, listKey)`

```javascript
tareasColRef(boardKey, listKey).orderBy("index").get()
```

```
Paso 1: Construye la referencia a la subcolección tareas
        boards/{boardKey}/lists/{listKey}/tareas
Paso 2: Ordena por index
Paso 3: Devuelve array de tareas con su key (doc.id)

Total: 1 query → N lecturas (1 por tarea)
Llamado por: List component al montarse, Board en modo lista
```

### `doAddTarea(boardKey, listKey, tareaTitle)`

Agrega una tarea **al final** de una lista.

```
Paso 1: Lee la colección de tareas para obtener snap.size como nuevo index
        → 1 lectura
Paso 2: ref.add({ title: tareaTitle, index })
        → 1 escritura

Total: 1 lectura + 1 escritura
```

### `doAddTareaAtStart(boardKey, listKey, tareaTitle)`

Agrega una tarea **al inicio** (índice 0). Este es el método más costoso.

```
Paso 1: Lee TODAS las tareas ordenadas por index
        → 1 query = N lecturas

Paso 2: Crea un batch:
        - Para cada tarea existente: incrementa su index en 1
          → N escrituras (una por tarea)
        - Agrega la nueva tarea con index: 0
          → 1 escritura

Paso 3: batch.commit()

Total: N lecturas + N+1 escrituras
⚠️ Con 30 tareas en la lista: 30 lecturas + 31 escrituras por una sola acción
Ver optimización propuesta en [[09-infra-capacity]]
```

### `doMoveTarea(params)`

Mueve una tarea entre listas (drag & drop entre columnas).

```
Paso 1: Lee el documento de la tarea original
        → 1 lectura

Paso 2: Crea un batch:
        - Elimina la tarea del listado original
        - Si cambió de lista, agrega lastStatusChange al documento
        - Escribe todas las tareas del nuevo listado con índices actualizados
          → M escrituras (M = tareas en la lista destino)

Paso 3: batch.commit()

Paso 4: Llama a onceGetTarea para refrescar el estado del cliente
        → 1 query adicional

Total: 1+1 lecturas + M+1 escrituras (M = tareas en lista destino)
```

---

## Sección: Comentarios

### `onceGetComments(boardKey, listKey, tareaKey, subtaskId?)`

```
Construye la ruta correcta según si es comentario de tarea o de subtarea:
- Tarea:    boards/{b}/lists/{l}/tareas/{t}/comments
- Subtarea: boards/{b}/lists/{l}/tareas/{t}/subtaskComments/{s}/comments

Ordena por createdAt asc → devuelve todos los comentarios

Total: 1 query (llamado al abrir el modal de tarea)
```

### `doAddComment(boardKey, listKey, tareaKey, comment, subtaskId?)`

```
Paso 1: Construye la referencia a la subcolección correcta
Paso 2: ref.add({ ...comment, createdAt: new Date().toISOString() })
        → 1 escritura
Nota: createdAt se agrega aquí, no en el cliente, para consistencia

Total: 1 escritura
→ Dispara Cloud Function onTareaCommentCreated o onSubtaskCommentCreated
```

---

## Sección: Home Dashboard

### `onceGetHomeDashboard(boards, userEmail)`

Esta es la función más costosa del sistema. Construye el panel de inicio.

```
Objetivo: Para cada tarea de cada lista de cada board,
          contar cuántas tareas pendientes tiene cada miembro.

Paso 1: Inicializa un Map de miembros a partir de board.members
        (sin queries, solo en memoria)

Paso 2: for (board of boards)              ← loop exterior
          lists = await onceGetLists()     ← 1 query por board
          
          for (list of lists)              ← loop interior
            tareas = await onceGetTarea()  ← 1 query por lista

Paso 3: Para cada tarea:
        - Si está pendiente y tiene assigneeEmail → incrementPending()
        - Si es del usuario actual → añadir a myPendingTareas
        - Para cada subtarea pendiente → lo mismo

Paso 4: Retorna { myPendingTareas, membersWithPendingCounts }

Total de lecturas:
  boards: B
  listas totales: B × L
  tareas totales: B × L × T
  
Ejemplo con 5 boards, 4 listas, 10 tareas:
  = 5 queries de listas + 20 queries de tareas + ~220 docs leídos
  = ~250 lecturas solo para cargar el home

⚠️ CUELLO DE BOTELLA PRINCIPAL — ver [[09-infra-capacity]]
```

---

## Resumen de costos por operación

| Función | Lecturas | Escrituras | Notas |
|---|---|---|---|
| `onceGetBoards` | 3 queries + N docs | 0-N backfill | 3 queries siempre |
| `doClaimMembership` | 3 queries | 1 batch | En cada login |
| `onceGetHomeDashboard` | ~250 (5b×4l×10t) | 0 | Escala O(b×l×t) |
| `onceGetLists` | 1 + N | 0 | N = número de listas |
| `onceGetTarea` | 1 + M | 0 | M = número de tareas |
| `doAddTarea` | 1 | 1 | Al final de la lista |
| `doAddTareaAtStart` | N | N+1 | ⚠️ Escala con tamaño de lista |
| `doEditTarea` | 0 | 1 | Simple update |
| `doMoveTarea` | 2 | M+1 | M = tareas en lista destino |
| `doAddComment` | 0 | 1 | Dispara Cloud Function |
| `onceGetComments` | 1 + C | 0 | C = número de comentarios |

---

*Ver también: [[02-modelo-datos]] para la estructura de datos | [[09-infra-capacity]] para el análisis de capacidad en Free Tier*

# Arquitectura del Sistema — Kitrello

#arquitectura #nextjs #firebase #vercel #react

← [[00-indice]] | Siguiente: [[02-modelo-datos]]

---

## Visión general

Kitrello es una aplicación web colaborativa de gestión de tareas (tipo Trello) con la siguiente distribución de capas:

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser)                    │
│  React 18 SPA  │  Tailwind CSS  │  Firebase SDK v8      │
└───────────────────────┬─────────────────────────────────┘
                        │  HTTPS
┌───────────────────────▼─────────────────────────────────┐
│                  VERCEL (Edge + Serverless)               │
│  Next.js 15 App Router                                   │
│  ├── /app/page.js          → redirect a /boards          │
│  ├── /app/boards/page.jsx  → Home Dashboard              │
│  ├── /app/b/[id]/page.jsx  → Board view                  │
│  ├── /app/sign-in/page.jsx → Login                       │
│  ├── /app/account/page.jsx → Perfil de usuario           │
│  └── /app/api/notifications/* → Serverless Functions     │
└────────────┬──────────────────────┬─────────────────────┘
             │  Firebase SDK v8     │  Firebase Admin SDK
             │  (cliente)           │  (servidor)
┌────────────▼──────────┐  ┌───────▼─────────────────────┐
│  Firebase Auth        │  │  Cloud Firestore             │
│  Google + Email/Pass  │  │  Base de datos principal     │
└───────────────────────┘  └───────────────────────────────┘
                                       ▲
                           ┌───────────┴───────────────────┐
                           │  Firebase Cloud Functions v2  │
                           │  (triggers sobre Firestore)   │
                           └───────────────────────────────┘
```

---

## Stack tecnológico

### Frontend
| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js App Router | 15.x |
| UI Library | React | 18.x |
| Estilos | Tailwind CSS | 3.x |
| Drag & Drop | @hello-pangea/dnd | 18.x |
| Fechas | moment + dayjs | - |
| Markdown | react-markdown + remark-gfm | - |

### Backend / BaaS
| Capa | Tecnología | Versión |
|---|---|---|
| Base de datos | Cloud Firestore | SDK v8 (compat) |
| Autenticación | Firebase Auth | SDK v8 |
| Almacenamiento | Firebase Storage | SDK v8 (solo fotos) |
| Funciones serverless | Firebase Cloud Functions | v2 (Node.js) |
| Email | Resend | 6.x |

### Servidor (Next.js API Routes)
| Capa | Tecnología | Versión |
|---|---|---|
| Admin SDK | firebase-admin | 14.x |
| Verificación JWT | jose | 5.x |
| Validación | ajv | 8.x |

### Infraestructura
| Servicio | Uso |
|---|---|
| Vercel (Hobby) | Deploy del frontend + API Routes |
| Firebase (Spark/Blaze) | Firestore + Auth + Storage + Functions |

---

## Estructura de directorios

```
kitrello/
├── app/                        # Next.js App Router (páginas + API)
│   ├── api/notifications/      # Serverless functions de notificaciones
│   ├── b/[id]/                 # Página de board dinámico
│   ├── boards/                 # Home dashboard
│   ├── sign-in/                # Autenticación
│   ├── account/                # Perfil de usuario
│   ├── layout.js               # Layout raíz (Providers + metadata)
│   └── providers.jsx           # ChunkError recovery + UserProvider
│
├── src/
│   ├── components/             # Componentes React reutilizables
│   │   ├── Tarea/              # Tarjeta Kanban
│   │   ├── TareaModal/         # Drawer de detalle de tarea
│   │   ├── List/               # Columna del board
│   │   ├── Comments/           # Sistema de comentarios
│   │   ├── Subtarea/           # Subtareas dentro de una tarea
│   │   └── ui/                 # Componentes base (Drawer, icons, styles)
│   ├── views/
│   │   ├── Board/              # Vista Kanban principal
│   │   └── Boards/             # Home con lista de boards
│   ├── firebase/
│   │   ├── firebase.js         # Inicialización Firebase SDK v8
│   │   ├── db.js               # Todas las operaciones Firestore del cliente
│   │   └── auth.js             # Operaciones de autenticación
│   ├── providers/
│   │   └── UserProvider.js     # Contexto React del usuario autenticado
│   ├── hooks/
│   │   └── useResizableDrawer.js # Hook para redimensionar el drawer lateral
│   ├── lib/
│   │   ├── firebaseAdmin.js    # Inicialización Admin SDK + JWT verification
│   │   └── notifications/      # Módulos del pipeline de notificaciones
│   └── utils/
│       ├── boardRoles.js       # Helpers de roles (owner/member)
│       └── completion.js       # Lógica de tareas completadas
│
├── functions/                  # Firebase Cloud Functions (Node.js)
│   ├── index.js                # Entry point con los 3 triggers
│   ├── detectEvents.js         # Lógica para detectar qué evento ocurrió
│   ├── detectFinalization.js   # Detección específica de finalización
│   └── mentions.js             # Parser de @menciones en texto
│
└── docs/                       # ← este vault
```

---

## Flujo de datos: acción del usuario → base de datos

### Caso 1: usuario edita una tarea

```
1. Usuario escribe en el Drawer (TareaModal)
         ↓
2. handleSave() construye el objeto tarea completo
         ↓
3. db.doEditTarea(boardKey, listKey, tareaKey, tarea)
         ↓  [Firebase SDK v8 — cliente]
4. Firestore: boards/{id}/lists/{id}/tareas/{id}.update(data)
         ↓  [Firestore trigger — Cloud Function]
5. onTareaNotification se activa
         ↓
6. Lee board + list (2 lecturas Firestore con Admin SDK)
         ↓
7. detectEvents.buildTareaEvents() detecta qué cambió
         ↓
8. POST webhook → /api/notifications/dispatch
         ↓
9. dispatchNotification() en el servidor:
   a. Verifica idempotencia (1 transacción Firestore)
   b. Envía email con Resend
   c. Escribe feed en usersByEmail/.../notifications
```

### Caso 2: usuario abre el home (/boards)

```
1. onAuthStateChanged detecta usuario autenticado
         ↓
2. doClaimMembership() — 3 queries a boards + batch write
         ↓
3. onceGetBoards() — 3 queries a boards (deduplicadas en Map)
         ↓
4. onceGetHomeDashboard() — loop boards × listas × tareas
   ⚠️ CUELLO DE BOTELLA: O(boards × listas × tareas) lecturas
         ↓
5. Renderiza HomeDashboard + lista de boards
```

---

## Seguridad

La seguridad se implementa en dos niveles:

### 1. Firestore Security Rules (cliente)
Ver [[02-modelo-datos]] para detalles. Resumen:
- Solo usuarios autenticados pueden leer/escribir
- Solo `ownerIds` pueden modificar miembros y roles
- Comentarios solo pueden ser editados/eliminados por su autor

### 2. Verificación JWT en API Routes (servidor)
Cada ruta API usa `verifyFirebaseIdToken(token)` de `src/lib/firebaseAdmin.js`:
- Extrae el Bearer token del header `Authorization`
- Verifica la firma JWT contra las claves públicas de Google (JWKS)
- Valida `issuer` y `audience` del proyecto Firebase
- La librería `jose` hace esta verificación sin el Admin SDK completo

---

## Modo de renderizado

| Página | Modo | Motivo |
|---|---|---|
| `/` | Server (redirect) | Simple redirect, no necesita cliente |
| `/boards` | Client Component | Requiere `onAuthStateChanged` |
| `/b/[id]` | Client Component | Requiere estado de board reactivo |
| `/sign-in` | Client Component | Formulario interactivo |
| `/account` | Client Component | Formulario interactivo |
| `/api/notifications/*` | Node.js Serverless | Admin SDK + Resend (solo servidor) |

El `layout.js` es Server Component. Envuelve todo en `<Providers>` que es el único Client Component en el árbol raíz.

---

*Ver también: [[03-firebase-capa-db]] | [[05-api-routes]] | [[06-cloud-functions]] | [[10-autenticacion-y-navegacion]]*

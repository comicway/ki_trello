# API Routes — Next.js

#nextjs #api #backend #notificaciones #autenticacion

← [[04-vistas-y-componentes]] | Siguiente: [[06-cloud-functions]]

---

## Visión general

Las API Routes de Kitrello viven en `app/api/` y son **funciones serverless de Node.js** que se ejecutan en Vercel. Su única responsabilidad es el sistema de notificaciones — toda la demás lógica de datos ocurre directamente desde el cliente vía Firebase SDK.

```
app/api/
└── notifications/
    ├── route.js               → GET  /api/notifications
    ├── dispatch/
    │   └── route.js           → GET|POST /api/notifications/dispatch
    ├── mention/
    │   └── route.js           → POST /api/notifications/mention
    └── task-completed/
        └── route.js           → alias de dispatch/route.js
```

Todas las rutas tienen:
```javascript
export const runtime = "nodejs";      // Node.js, no Edge runtime
export const dynamic = "force-dynamic"; // Sin caché, siempre ejecuta
```

---

## Autenticación compartida

Todas las rutas extraen y verifican el token del header `Authorization`:

```javascript
const getBearerToken = (request) => {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
};
```

**¿Cómo funciona la verificación?**

```javascript
const decoded = await verifyFirebaseIdToken(token);
// decoded contiene: { email, uid, ... }
```

La función `verifyFirebaseIdToken` (en `src/lib/firebaseAdmin.js`):
1. Obtiene las claves públicas de Firebase desde `googleapis.com/service_accounts/...`
2. Las cachea en memoria (variable `remoteJwks`)
3. Usa `jose.jwtVerify` para validar la firma del JWT
4. Verifica que el `issuer` y `audience` correspondan al proyecto Firebase
5. Devuelve el payload decodificado (con `email` y `uid`)

---

## GET /api/notifications

**Archivo:** `app/api/notifications/route.js`

Devuelve el feed de notificaciones del usuario autenticado.

### Flujo paso a paso

```
1. Extrae Bearer token del header Authorization
2. Verifica token → obtiene decoded.email y decoded.uid
3. Lee parámetro ?limit= (entre 1 y 50, default 10)
4. Llama listUserNotifications(decoded.email, decoded.uid, limit)
   ↓ este función hace 3 queries en paralelo:
   a. loadEmailFeed(email, limit)
      → users/byEmail/{encodedEmail}/notifications, top N por fecha
   b. loadUidFeed(uid, limit)
      → users/{uid}/notifications, top N por fecha
   c. loadDeliveryFallback(email, limit)
      → collectionGroup query sobre _notificationDeliveries
5. Fusiona y deduplica los resultados por idempotencyKey
6. Devuelve { ok: true, notifications: [...] }
```

### Respuesta

```json
{
  "ok": true,
  "notifications": [
    {
      "id": "task_completed:tarea:abc:2026-07-09T...",
      "eventType": "task_completed",
      "boardTitle": "Proyecto Alfa",
      "itemTitle": "Diseñar mockups",
      "actorName": "Carlos López",
      "createdAt": "2026-07-09T10:00:05.000Z"
    }
  ]
}
```

---

## GET|POST /api/notifications/dispatch

**Archivo:** `app/api/notifications/dispatch/route.js`

Ruta central de despacho de notificaciones. Es llamada por las Cloud Functions a través de un webhook.

### GET — Estado del entorno

```
GET /api/notifications/dispatch
→ { ok: true, env: { hasResendKey: true, hasWebhookSecret: true, ... } }
```

Útil para diagnosticar si las variables de entorno están configuradas.

### POST — Despachar notificación

#### Autenticación dual

Esta ruta acepta **dos tipos de autenticadores**:

```
Opción A: Webhook secret (para Cloud Functions)
  Authorization: Bearer <NOTIFICATION_WEBHOOK_SECRET>
  → isWebhookAuthorized() verifica contra la variable de entorno
  → No necesita ser un usuario real

Opción B: Firebase ID Token (para el cliente)
  Authorization: Bearer <firebase_id_token>
  → verifyFirebaseIdToken() verifica el JWT
  → assertBoardMember() verifica que el usuario es miembro del board
```

#### Compatibilidad con payload legacy

```javascript
const mapLegacyPayload = (body) => {
  // Si el payload ya tiene eventType e idempotencyKey, pasa directo
  if (body.eventType && body.idempotencyKey) return body;

  // Si es el formato antiguo (sin eventType), lo normaliza
  const itemType = body.itemType || "tarea";
  const eventType = itemType === "subtask" ? "subtask_completed" : "task_completed";
  const idempotencyKey = `${eventType}:${body.tareaId}:...`;
  return { ...body, eventType, idempotencyKey };
};
```

Esto garantiza retrocompatibilidad si había integraciones con el formato anterior.

#### Flujo completo de POST

```
1. Extrae token y verifica autorización (webhook secret o Firebase JWT)
2. Parsea el body y normaliza el payload (mapLegacyPayload)
3. dispatchNotification(payload)
   ↓ ver orquestador en [[07-notificaciones]]
4. Retorna el resultado del dispatch
```

### Códigos de error

| Código | Situación |
|---|---|
| 401 | Sin token |
| 403 | Token válido pero no es miembro del board |
| 503 | RESEND_FROM_EMAIL no configurado |
| 500 | Error interno |

---

## POST /api/notifications/mention

**Archivo:** `app/api/notifications/mention/route.js`

Ruta específica para notificaciones de @menciones en comentarios. Es llamada directamente desde el cliente cuando se publica un comentario con menciones.

### ¿Por qué existe esta ruta separada?

Las Cloud Functions también detectan menciones en comentarios (`onTareaCommentCreated`). Esta ruta existe para **casos edge** donde el cliente tiene información adicional sobre las menciones que la Cloud Function podría no resolver correctamente (ej: si el displayName del miembro tiene caracteres especiales).

### Flujo paso a paso

```
1. Verifica Firebase JWT del usuario (solo acepta usuarios, no webhook)
2. Verifica que el usuario es miembro del board (assertBoardMember)
3. loadCommentContext() — lee 4 documentos en paralelo:
   a. boards/{boardId}
   b. boards/{boardId}/lists/{listId}
   c. boards/{boardId}/lists/{listId}/tareas/{tareaId}
   d. el comentario específico
   → Total: 4 lecturas Firestore
4. Combina mentionedEmails del documento con los enviados por el cliente
   (deduplicación con Set)
5. extractMentionTargetsFromComment() — parsea @menciones del texto
6. buildCommentEvents() — construye el evento de tipo "mention"
7. Si no hay eventos: retorna { ok: true, sent: 0, reason: "no_mentions" }
8. dispatchNotification() para cada evento
9. Retorna { ok: true, sent: N, results: [...] }
```

### Body del request

```json
{
  "boardId": "boardId_abc",
  "listId": "listId_xyz",
  "tareaId": "tareaId_123",
  "commentId": "commentId_456",
  "subtaskId": null,
  "mentionedEmails": ["maria@empresa.com"]
}
```

---

## GET|POST /api/notifications/task-completed

**Archivo:** `app/api/notifications/task-completed/route.js`

```javascript
export { GET, POST } from "../dispatch/route";
```

Es simplemente un alias de la ruta dispatch. Existe por compatibilidad con integraciones anteriores que llamaban a esta URL específica.

---

## Módulo: firebaseAdmin.js

**Archivo:** `src/lib/firebaseAdmin.js`

Inicializa el SDK de Firebase Admin para uso en el servidor.

### Inicialización

```javascript
const buildCredential = () => {
  // Opción 1: Variable de entorno con el JSON completo del service account
  const serviceAccount = parseServiceAccount();
  if (serviceAccount) return cert(serviceAccount);

  // Opción 2: Variables separadas
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return cert({ projectId, clientEmail, privateKey });
};
```

El `getFirebaseAdminApp()` verifica si ya existe una instancia (`getApps().length > 0`) para no inicializar múltiples veces entre llamadas serverless tibias (warm instances).

### Verificación JWT sin Admin SDK completo

La verificación de tokens usa `jose` en lugar del método oficial del Admin SDK (`admin.auth().verifyIdToken()`). Esto es intencional:
- El Admin SDK descarga el certificado completo del proyecto
- `jose` usa el endpoint JWKS público de Google, que es más ligero
- Reduce el tiempo de cold start de las funciones serverless

```javascript
export const verifyFirebaseIdToken = async (token) => {
  const { payload } = await jwtVerify(token, await getRemoteJwks(), {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  return payload; // { email, uid, name, ... }
};
```

---

## Variables de entorno requeridas

| Variable | Uso | Dónde configurar |
|---|---|---|
| `FIREBASE_PROJECT_ID` | ID del proyecto Firebase | Vercel + .env.local |
| `FIREBASE_CLIENT_EMAIL` | Email del service account | Vercel |
| `FIREBASE_PRIVATE_KEY` | Clave privada del service account | Vercel |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Alternativa: JSON completo | Vercel |
| `RESEND_FROM_EMAIL` | Email remitente para notificaciones | Vercel |
| `RESEND_API_KEY` | Clave API de Resend | Vercel |
| `NOTIFICATION_WEBHOOK_SECRET` | Secret compartido con Cloud Functions | Vercel + Firebase Secrets |
| `NEXT_PUBLIC_APP_URL` | URL de la app (para links en emails) | Vercel |

---

*Ver también: [[07-notificaciones]] para el pipeline completo | [[06-cloud-functions]] para los triggers que llaman a estas rutas*

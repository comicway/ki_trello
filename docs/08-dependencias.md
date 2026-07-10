# Dependencias y Librerías

#dependencias #librerias #npm #stack

← [[07-notificaciones]] | Siguiente: [[09-infra-capacity]]

---

## Resumen del package.json

```json
{
  "dependencies": {
    "@hello-pangea/dnd": "^18.0.1",
    "ajv": "^8.12.0",
    "autoprefixer": "^10.5.2",
    "dayjs": "^1.11.21",
    "firebase": "^8.2.3",
    "firebase-admin": "^14.1.0",
    "jose": "^5.9.6",
    "moment": "^2.30.1",
    "next": "^15.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^6.0.3",
    "remark-gfm": "^1.0.0",
    "resend": "^6.17.1",
    "tailwindcss": "^3.4.19"
  },
  "devDependencies": {
    "eslint": "^8.57.0",
    "eslint-config-next": "^15.1.0",
    "postcss": "^8.5.16"
  },
  "overrides": {
    "jwks-rsa": "3.2.1"
  }
}
```

---

## Dependencias de producción

### `next` — ^15.1.0
**¿Qué es?** Framework full-stack de React. Gestiona el routing, bundling, optimización de imágenes, y funciones serverless (API Routes).

**¿Por qué se usa?**
- App Router (carpeta `app/`) permite mezclar Server y Client Components en el mismo proyecto
- Las API Routes de `/api/notifications/*` se despliegan automáticamente como funciones serverless en Vercel sin configuración extra
- Next.js 15 incluye Turbopack para builds más rápidos en desarrollo

**En el proyecto:** Toda la estructura de páginas, el layout raíz, las rutas API y la configuración de imágenes remotas (`next.config.js`).

---

### `react` + `react-dom` — ^18.3.1
**¿Qué es?** Librería de UI. React 18 introduce el modo concurrent y el Strict Mode mejorado.

**¿Por qué se usa?** Es la base de Next.js. Los componentes, hooks (`useState`, `useEffect`, `useContext`, `useMemo`, `useCallback`), y el Context API son el motor de toda la UI de Kitrello.

**En el proyecto:** Todos los archivos `.jsx` y `.js` de `src/components/`, `src/views/`, `src/providers/`.

---

### `firebase` — ^8.2.3
**¿Qué es?** Firebase SDK para el navegador. La versión 8 usa la API "compat" (compatible con versiones anteriores) en lugar del SDK modular v9+.

**¿Por qué la versión 8 y no v9?**
- El proyecto fue iniciado cuando v8 era la versión estándar
- La API compat de v8 (`firebase.auth`, `db.collection().doc()`) es más concisa para operaciones simples
- La migración a v9 modular (`getFirestore`, `collection`, `doc`) requeriría refactorizar toda la capa `src/firebase/db.js`
- v8 está en modo mantenimiento pero sigue siendo funcional

**En el proyecto:**
- `src/firebase/firebase.js` — inicialización
- `src/firebase/db.js` — todas las operaciones Firestore del cliente
- `src/firebase/auth.js` — Google OAuth + Email/Password

**Impacto en bundle size:** v8 es un bundle monolítico más grande que v9 modular. Con v9 se podría reducir significativamente el tamaño del JavaScript enviado al cliente.

---

### `firebase-admin` — ^14.1.0
**¿Qué es?** SDK de Firebase para el servidor (Node.js). Tiene privilegios de administrador — omite las Security Rules de Firestore.

**¿Por qué se necesita?**
- Las API Routes de Next.js se ejecutan en el servidor
- Necesitan leer/escribir Firestore sin pasar por las reglas de seguridad del cliente
- Permite verificar tokens JWT de Firebase Auth

**En el proyecto:** `src/lib/firebaseAdmin.js` — inicialización del Admin App y función `getAdminFirestore()`. Usado en todas las rutas `/api/notifications/*`.

**Nota:** `firebase-admin` está en `serverExternalPackages` en `next.config.js` para evitar que Next.js intente bundlearlo (es solo para Node.js, no para el browser).

---

### `jose` — ^5.9.6
**¿Qué es?** Librería JavaScript/TypeScript para operaciones con JWT, JWK, JWE, JWS. Es isomórfica (funciona en Node.js y en el browser).

**¿Por qué se usa en lugar del Admin SDK para verificar tokens?**
- `firebase-admin.auth().verifyIdToken()` requiere instanciar el Admin SDK completo
- `jose` verifica el JWT directamente contra el endpoint JWKS público de Google
- Es más ligero → menor tiempo de cold start en las funciones serverless de Vercel
- Soporta Edge Runtime (aunque las rutas actuales usan Node.js runtime)

**En el proyecto:** `src/lib/firebaseAdmin.js`, función `verifyFirebaseIdToken()`.

---

### `@hello-pangea/dnd` — ^18.0.1
**¿Qué es?** Librería de drag and drop para React. Es un fork activamente mantenido de `react-beautiful-dnd` (que fue discontinuado por Atlassian).

**¿Por qué este fork y no otros?**
- `react-beautiful-dnd` fue la librería estándar para DnD en Trello-like apps
- Fue discontinuada y no soporta React 18 sin warnings
- `@hello-pangea/dnd` es el reemplazo oficial con soporte para React 18+
- Mantiene la misma API (`DragDropContext`, `Droppable`, `Draggable`)

**En el proyecto:** `src/views/Board/index.jsx` (contexto DnD), `src/components/List/index.jsx` (Droppable de tareas + Draggable de listas), `src/components/Tarea/index.jsx` (Draggable de tarjetas).

**Configuración especial:** En `next.config.js` está en `transpilePackages` porque el paquete distribuye código ESM que Next.js necesita transpilar para el bundle del servidor.

---

### `tailwindcss` — ^3.4.19
**¿Qué es?** Framework CSS utilitario. En lugar de escribir CSS en archivos separados, se aplican clases directamente en el JSX.

**¿Por qué se usa?**
- Elimina la necesidad de nombrar y mantener clases CSS personalizadas
- Genera solo el CSS que se usa (tree-shaking automático)
- Consistencia visual con el design system de Ki Marca

**En el proyecto:** Todas las clases de estilo en los componentes JSX. El tema personalizado (colores `ki-purple`, `ki-black`, `pearl-white`, etc.) está configurado en `tailwind.config.js`.

**Con `autoprefixer` y `postcss`:** Tailwind necesita PostCSS para procesar las clases. `autoprefixer` añade prefijos de vendor (`-webkit-`, `-moz-`) automáticamente.

---

### `moment` — ^2.30.1
**¿Qué es?** Librería de manipulación de fechas. Es una de las más antiguas y conocidas del ecosistema JS.

**¿Por qué está en modo mantenimiento?** Los autores recomiendan usar `date-fns` o `dayjs` para proyectos nuevos. Pero como ya está en uso, migrarla tiene costo sin beneficio inmediato.

**En el proyecto:** `src/components/TareaModal/index.jsx` y `src/components/Comments/index.jsx` — formateo de fechas de due date y timestamps de comentarios.

---

### `dayjs` — ^1.11.21
**¿Qué es?** Alternativa moderna y ligera a Moment.js. API casi idéntica pero pesa ~2 KB vs ~67 KB de Moment.

**¿Por qué hay dos librerías de fechas?** El proyecto usa `moment` en algunos componentes legados y `dayjs` en partes más recientes. En una refactorización futura se podría unificar todo en `dayjs`.

**En el proyecto:** Usado en partes más recientes del código para formateo de fechas.

---

### `react-markdown` — ^6.0.3 + `remark-gfm` — ^1.0.0
**¿Qué es?** `react-markdown` renderiza texto Markdown como componentes React. `remark-gfm` añade soporte para GitHub Flavored Markdown (tablas, tachado, listas de tareas).

**¿Por qué se usa?**
- Las descripciones de tareas y comentarios aceptan Markdown
- Permite a los usuarios formatear texto con `**negrita**`, `_cursiva_`, listas, etc.
- Sin esta librería, el Markdown se mostraría como texto plano

**En el proyecto:** Componente `MarkdownContent` (usado en `TareaModal` para la descripción y en `Comments` para el cuerpo de cada comentario).

---

### `resend` — ^6.17.1
**¿Qué es?** SDK oficial del servicio de email transaccional Resend. Alternativa moderna a SendGrid o Mailgun.

**¿Por qué Resend?**
- API simple: `resend.emails.send({ from, to, subject, html })`
- Plan gratuito generoso: 3,000 emails/mes y 100/día
- Mejor deliverability que SMTP directo
- Documentación excelente

**En el proyecto:** `src/lib/notifications/orchestrator.js` — envío de todos los emails de notificación.

---

### `ajv` — ^8.12.0
**¿Qué es?** JSON Schema validator. Permite validar que un objeto JSON cumple un esquema definido.

**En el proyecto:** Está en las dependencias pero su uso directo es mínimo en el código fuente visible. Puede estar como dependencia transitiva de otros paquetes o reservado para validación futura de payloads de notificaciones.

---

## Dependencias de desarrollo

### `eslint` + `eslint-config-next`
Linter de JavaScript/TypeScript. `eslint-config-next` incluye las reglas específicas de Next.js (accesibilidad en `<Image>`, reglas de hooks, etc.).

### `postcss`
Procesador CSS requerido por Tailwind CSS para transformar las directivas `@tailwind`.

---

## Override: `jwks-rsa: 3.2.1`

```json
"overrides": {
  "jwks-rsa": "3.2.1"
}
```

Este override fuerza una versión específica de `jwks-rsa` (un cliente para JWKS — JSON Web Key Sets) en todas las dependencias. Probablemente resuelve un conflicto de versiones o una vulnerabilidad de seguridad en versiones anteriores que alguna dependencia traía transitivamente.

---

## Dependencias de Cloud Functions

**Archivo:** `functions/package.json` (paquete separado)

```json
{
  "dependencies": {
    "firebase-admin": "^12.x",
    "firebase-functions": "^6.x"
  }
}
```

Las Cloud Functions tienen su propio `node_modules` y `package.json`. Se despliegan de forma independiente al frontend con `firebase deploy --only functions`.

---

## Árbol de decisiones: ¿por qué este stack?

```
¿Necesito un framework full-stack con deploy sencillo?
  → Next.js en Vercel ✓

¿Necesito una base de datos en tiempo real sin backend propio?
  → Firebase Firestore ✓

¿Necesito autenticación social (Google) rápida de implementar?
  → Firebase Auth ✓

¿Necesito lógica backend reactiva sin servidores propios?
  → Firebase Cloud Functions ✓

¿Necesito enviar emails transaccionales?
  → Resend ✓ (mejor DX que SendGrid, plan gratuito suficiente)

¿Necesito DnD en React 18?
  → @hello-pangea/dnd ✓ (único fork activo de react-beautiful-dnd)

¿Necesito estilos rápidos y consistentes?
  → Tailwind CSS ✓
```

---

*Ver también: [[01-arquitectura]] para el stack en contexto | [[09-infra-capacity]] para el impacto de estas elecciones en los costos*

# Autenticación y Navegación

#autenticacion #firebase-auth #rutas #navegacion #react

← [[04-vistas-y-componentes]] | Ver también: [[01-arquitectura]] | [[00-indice]]

---

## Visión general

Kitrello usa Firebase Auth como capa de autenticación. Soporta dos métodos de login: Google OAuth y Email/Password. La navegación usa el App Router de Next.js 15, con el componente `PrivateRoute` como guarda de rutas protegidas.

---

## Módulo: src/firebase/firebase.js — Inicialización del SDK

Este es el archivo raíz de toda la integración Firebase en el cliente.

```javascript
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isBrowser = typeof window !== "undefined";
const isConfigValid = Boolean(config.apiKey && config.projectId);

if (isBrowser && isConfigValid && !firebase.apps.length) {
  firebase.initializeApp(config);
}

export const auth    = isBrowser && isConfigValid ? firebase.auth()      : null;
export const db      = isBrowser && isConfigValid ? firebase.firestore() : null;
export const storage = isBrowser && isConfigValid ? firebase.storage()   : null;
```

**Paso a paso:**
1. Lee las variables de entorno `NEXT_PUBLIC_*` (disponibles en el browser)
2. Verifica que estamos en el browser (`isBrowser`) — el código también corre en el servidor (SSR/SSG) donde `window` no existe
3. Verifica que la config es válida (evita inicializar con config vacía en builds de CI/CD)
4. Si no hay instancia previa (`!firebase.apps.length`), inicializa Firebase
5. Exporta las tres instancias: `auth`, `db` (Firestore), `storage`

**¿Por qué `null` en el servidor?** El Firebase SDK v8 no soporta SSR. Si se intentara inicializar en Node.js, lanzaría errores. `null` es el valor seguro; los componentes que usan estas instancias son todos Client Components.

---

## Módulo: src/firebase/user.js — Helpers de usuario

```javascript
export const getUser = () => auth.currentUser;

export const requireAuthUser = () => {
  const user = auth.currentUser;
  if (!user?.uid || !user?.email) throw new Error("Usuario no autenticado.");
  return user;
};

export const waitForAuthUser = () =>
  new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      if (user?.uid && user?.email) resolve(user);
      else reject(new Error("Usuario no autenticado."));
    });
  });
```

**`getUser()`** — sincrónico. Puede devolver `null` si Firebase aún no resolvió el estado de auth al montar.

**`requireAuthUser()`** — sincrónico, lanza error si no hay usuario. Usado en operaciones que definitivamente requieren autenticación (`doUploadProfilePhoto`, `doUpdateProfile`).

**`waitForAuthUser()`** — asíncrono. Resuelve la race condition donde `auth.currentUser` es `null` brevemente al hacer login. Lo usa `doCreateBoard` para esperar a que Firebase confirme la sesión antes de escribir en Firestore.

---

## Módulo: src/firebase/auth.js — Operaciones de autenticación

### Google OAuth

```javascript
const googleProvider = new firebase.auth.GoogleAuthProvider();
export const doSignInWithGoogle = () => auth.signInWithPopup(googleProvider);
```

Abre un popup de Google. Firebase maneja el flujo OAuth completo internamente.

### Email/Password

```javascript
export const doSignUpWithEmail = async ({ email, password, displayName }) => {
  const { user } = await auth.createUserWithEmailAndPassword(email, password);
  await user.updateProfile({ displayName });
  // Guarda el perfil en Firestore para que otros miembros puedan resolverlo
  await db.collection("users").doc(user.uid).set({
    uid: user.uid, email, displayName, photoURL: null,
    createdAt: new Date().toISOString(),
  }, { merge: true });
  return user;
};
```

Al registrar con email: crea la cuenta → actualiza el `displayName` → escribe el perfil en Firestore. Este perfil es leído por otros componentes para mostrar el nombre del usuario en comentarios y asignaciones.

### Perfil y foto

```javascript
export const doUploadProfilePhoto = async (file) => {
  const user = requireAuthUser();
  const ref = storage.ref(`users/${user.uid}/profile`);
  await ref.put(file);
  return ref.getDownloadURL();
};
```

La foto se guarda en Firebase Storage en la ruta `users/{uid}/profile`. No incluye extensión en el nombre — Firebase Storage permite sobreescribir el mismo archivo para actualizar la foto sin acumular versiones.

```javascript
export const doUpdateProfile = async ({ firstName, lastName, photoURL }) => {
  const user = requireAuthUser();
  const displayName = `${firstName} ${lastName}`.trim() || user.email;
  await user.updateProfile({ displayName, photoURL });
  await db.collection("users").doc(user.uid).set({ ... }, { merge: true });
};
```

Actualiza en dos lugares: el perfil de Firebase Auth (para `currentUser.displayName`) y el documento en Firestore (para que otros miembros vean el nombre actualizado).

---

## Vista: SignIn — Login y registro

**Archivo:** `src/views/SignIn/index.jsx`

Pantalla de autenticación con doble modo: login y registro.

### Estado local

| Estado | Tipo | Descripción |
|---|---|---|
| `mode` | `"login"` \| `"register"` | Controla qué formulario se muestra |
| `form` | object | `{ displayName, email, password }` |
| `showPass` | boolean | Toggle visibilidad de la contraseña |
| `error` | string \| null | Mensaje de error amigable |
| `loading` | boolean | Deshabilita botones durante la operación |

### Manejo de errores de Firebase Auth

```javascript
const ERROR_MESSAGES = {
  "auth/email-already-in-use": "Este correo ya está registrado.",
  "auth/user-not-found": "No existe una cuenta con ese correo.",
  "auth/wrong-password": "Contraseña incorrecta.",
  "auth/popup-closed-by-user": null, // null = silencioso, el usuario cerró el popup
};

const friendlyError = (code) =>
  ERROR_MESSAGES[code] ?? "Ocurrió un error. Intenta de nuevo.";
```

Convierte los códigos de error técnicos de Firebase en mensajes comprensibles. Los errores con valor `null` se ignoran silenciosamente.

### Flujo de login

```
handleEmailSubmit()
    ↓
auth.doSignInWithEmail({ email, password })
    ↓ éxito
router.push("/boards")   ← navega al home
    ↓ error
setError(friendlyError(err.code))
```

### Flujo de registro

```
handleEmailSubmit() cuando mode === "register"
    ↓
Valida que displayName no esté vacío
    ↓
auth.doSignUpWithEmail({ email, password, displayName })
    ├── crea cuenta en Firebase Auth
    ├── actualiza profile.displayName
    └── escribe users/{uid} en Firestore
    ↓ éxito
router.push("/boards")
```

---

## Vista: Account — Perfil de usuario

**Archivo:** `src/views/Account/index.jsx`

Permite al usuario actualizar su nombre, apellido, foto de perfil y contraseña (solo si tiene proveedor email/password).

### Carga de datos

```javascript
useEffect(() => {
  firebase.auth.onAuthStateChanged(async (authUser) => {
    setUser(authUser);
    // Intenta leer el perfil extendido de Firestore
    const profile = await db.onceGetUserProfile(authUser.uid);
    if (profile) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
    } else {
      // Fallback: separa displayName en nombre y apellido
      const parts = (authUser.displayName || "").split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
  });
}, []);
```

Primero intenta cargar el perfil extendido de Firestore (que tiene `firstName` y `lastName` separados). Si no existe (ej: usuario de Google que nunca editó su perfil), hace fallback al `displayName` de Firebase Auth.

### Cambio de contraseña

```javascript
const canChangePassword = user && auth.hasPasswordProvider(user);
```

Solo muestra el formulario de contraseña si el usuario tiene el proveedor `password` (no aplica para usuarios de Google). `hasPasswordProvider` revisa `user.providerData`:

```javascript
export const hasPasswordProvider = (user) =>
  user?.providerData?.some((p) => p.providerId === "password") ?? false;
```

---

## Componente: PrivateRoute

**Archivo:** `src/components/PrivateRoute/index.jsx`

Guarda de rutas que redirige al login si el usuario no está autenticado.

```javascript
export default function PrivateRoute({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = firebase.auth.onAuthStateChanged((user) => {
      setAuthenticated(!!user);
      setLoadingAuth(false);
    });
    return unsubscribe; // limpia el listener al desmontar
  }, []);

  useEffect(() => {
    if (!loadingAuth && !authenticated) {
      router.replace("/sign-in");
    }
  }, [loadingAuth, authenticated, router]);

  if (loadingAuth) return <Loader />;
  if (!authenticated) return null;
  return children;
}
```

**Paso a paso:**
1. Al montar, suscribe a `onAuthStateChanged`
2. Mientras espera la respuesta: muestra `<Loader />`
3. Si el usuario está autenticado: renderiza `children`
4. Si no está autenticado: redirige a `/sign-in` con `router.replace` (sin historial — no se puede volver atrás con el botón del browser)
5. Al desmontar, cancela la suscripción con el `return unsubscribe`

**Uso en las páginas protegidas:**
```jsx
// app/account/page.jsx
export default function AccountPage() {
  return (
    <PrivateRoute>
      <Nav />
      <Account />
    </PrivateRoute>
  );
}
```

---

## Componente: Nav — Barra de navegación

**Archivo:** `src/components/Nav/index.jsx`

Barra superior fija con tres zonas: botón home (izquierda), logo centrado (absoluto), avatar + logout (derecha).

```javascript
const currentUser = useContext(UserContext);
```

Usa `UserContext` para mostrar el avatar del usuario y decidir si mostrar los controles de sesión.

**Elementos:**
- Botón home → enlace a `/boards`
- Logo Ki Technologies → posicionado absolutamente en el centro, `pointer-events-none` para no interferir con clicks
- Avatar → enlace a `/account`
- Botón logout → llama `auth.doSignOut()` directamente

---

## Variables de entorno del cliente

Todas empiezan con `NEXT_PUBLIC_` para que Next.js las exponga al browser:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Clave pública del proyecto Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de autenticación (`project.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID del proyecto |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket de Storage |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ID del sender (para FCM, no usado actualmente) |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ID de la app Firebase |

**Seguridad:** Estas variables son públicas por diseño — Firebase Auth y Firestore tienen sus propias capas de seguridad (Security Rules, verificación de JWT). La API key no otorga acceso administrativo.

---

*Ver también: [[01-arquitectura]] | [[02-modelo-datos]] (Firestore Security Rules) | [[05-api-routes]] (verificación JWT en el servidor)*

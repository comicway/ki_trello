import { useState } from "react";
import { auth } from "../../firebase";
import { useRouter } from "next/navigation";
import { GoogleOutlined, EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "Este correo ya está registrado.",
  "auth/invalid-email": "El correo no es válido.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/user-not-found": "No existe una cuenta con ese correo.",
  "auth/wrong-password": "Contraseña incorrecta.",
  "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
  "auth/popup-closed-by-user": null, // silenciar
};

const friendlyError = (code) =>
  ERROR_MESSAGES[code] ?? "Ocurrió un error. Intenta de nuevo.";

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ displayName: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        if (!form.displayName.trim()) {
          setError("El nombre de usuario es requerido.");
          return;
        }
        await auth.doSignUpWithEmail({
          email: form.email.trim(),
          password: form.password,
          displayName: form.displayName.trim(),
        });
      } else {
        await auth.doSignInWithEmail({
          email: form.email.trim(),
          password: form.password,
        });
      }
      router.push("/boards");
    } catch (err) {
      const msg = friendlyError(err.code);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await auth.doSignInWithGoogle();
      router.push("/boards");
    } catch (err) {
      const msg = friendlyError(err.code);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-[420px]">
        {/* Header */}
        <h1 className="text-3xl font-bold mb-2 text-pearl-white text-center">
          {isRegister ? "Crear cuenta" : "Iniciar sesión"}
        </h1>
        <p className="text-light-gray text-sm text-center mb-8">
          {isRegister
            ? "¿Ya tienes cuenta? "
            : "¿No tienes cuenta? "}
          <button
            type="button"
            onClick={() => { setMode(isRegister ? "login" : "register"); setError(null); }}
            className="text-ki-purple hover:text-ki-pastel transition-colors bg-transparent border-none cursor-pointer p-0 text-sm"
          >
            {isRegister ? "Inicia sesión" : "Regístrate"}
          </button>
        </p>

        {/* Form */}
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3 mb-4">
          {isRegister && (
            <input
              name="displayName"
              type="text"
              placeholder="Nombre de usuario"
              value={form.displayName}
              onChange={handleChange}
              required
              className="w-full bg-ki-black text-pearl-white border border-border-ki rounded px-4 py-3 text-sm outline-none focus:border-ki-purple hover:border-ki-purple transition-colors placeholder-light-gray"
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="Correo electrónico"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full bg-ki-black text-pearl-white border border-border-ki rounded px-4 py-3 text-sm outline-none focus:border-ki-purple hover:border-ki-purple transition-colors placeholder-light-gray"
          />
          <div className="relative">
            <input
              name="password"
              type={showPass ? "text" : "password"}
              placeholder="Contraseña"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full bg-ki-black text-pearl-white border border-border-ki rounded px-4 py-3 text-sm outline-none focus:border-ki-purple hover:border-ki-purple transition-colors placeholder-light-gray pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-light-gray hover:text-pearl-white transition-colors bg-transparent border-none cursor-pointer"
            >
              {showPass ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[50px] bg-ki-purple border border-border-ki text-pearl-white rounded text-base font-medium hover:bg-ki-pastel transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Cargando…" : isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border-ki" />
          <span className="text-light-gray text-xs">o continúa con</span>
          <div className="flex-1 h-px bg-border-ki" />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full h-[50px] flex items-center justify-center gap-2 bg-transparent border border-border-ki text-pearl-white rounded text-base font-medium hover:border-ki-purple hover:bg-ki-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <GoogleOutlined />
          Google
        </button>
      </div>
    </div>
  );
}

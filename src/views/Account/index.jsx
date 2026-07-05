import { useEffect, useState, useRef } from "react";
import { firebase, auth, db } from "../../firebase";
import MemberAvatar from "../../components/MemberAvatar";
import { inputDarkClass, btnPrimary } from "../../components/ui/styles";
import { CameraIcon, UserIcon, EyeIcon, EyeOffIcon } from "../../components/ui/icons";

export default function Account() {
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [photoURL, setPhotoURL] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const canChangePassword = user && auth.hasPasswordProvider(user);

  useEffect(() => {
    const unsubscribe = firebase.auth.onAuthStateChanged(async (authUser) => {
      setUser(authUser);
      if (!authUser) return;

      setPhotoURL(authUser.photoURL || null);

      try {
        const profile = await db.onceGetUserProfile(authUser.uid);
        if (profile) {
          setFirstName(profile.firstName || "");
          setLastName(profile.lastName || "");
          if (profile.photoURL) setPhotoURL(profile.photoURL);
        } else {
          const parts = (authUser.displayName || "").split(" ");
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
        }
      } catch (err) {
        console.error("Error cargando perfil:", err);
      }
    });
    return () => unsubscribe();
  }, []);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const url = await auth.doUploadProfilePhoto(file);
      setPhotoURL(url);
      setMessage("Foto subida. Guarda los cambios para aplicar.");
    } catch (err) {
      setError("Error al subir la foto.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await auth.doUpdateProfile({ firstName, lastName, photoURL });
      if (password) {
        await auth.doUpdatePassword(password);
        setPassword("");
        setConfirmPassword("");
      }
      setMessage("Perfil actualizado correctamente.");
    } catch (err) {
      setError(err.message || "Error al actualizar el perfil.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-65px)] text-light-gray">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-10 px-4 mx-auto w-full max-w-lg">
      <h2 className="text-2xl font-bold mb-6 text-pearl-white">Mi cuenta</h2>

      <form onSubmit={handleSubmit} className="w-full bg-ki-black border border-border-ki p-6 rounded-xl space-y-5">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <MemberAvatar
              member={{ photoURL, displayName: `${firstName} ${lastName}` }}
              size={80}
              borderClass="border-border-ki"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-ki-purple border border-border-ki flex items-center justify-center text-pearl-white hover:bg-ki-pastel transition-colors cursor-pointer disabled:opacity-50"
            >
              <CameraIcon className="h-4 w-4" />
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
          <p className="text-light-gray text-xs">{user.email}</p>
        </div>

        <div>
          <label className="block text-light-gray text-sm mb-1">Nombre</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-light-gray" />
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Nombre"
              className={`${inputDarkClass} pl-9`}
            />
          </div>
        </div>

        <div>
          <label className="block text-light-gray text-sm mb-1">Apellido</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Apellido"
            className={inputDarkClass}
          />
        </div>

        {canChangePassword ? (
          <>
            <div>
              <label className="block text-light-gray text-sm mb-1">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Dejar vacío para no cambiar"
                  className={`${inputDarkClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-light-gray hover:text-pearl-white bg-transparent border-none cursor-pointer"
                >
                  {showPass ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-light-gray text-sm mb-1">Confirmar contraseña</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetir contraseña"
                  className={`${inputDarkClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-light-gray hover:text-pearl-white bg-transparent border-none cursor-pointer"
                >
                  {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-light-gray text-xs italic">
            Iniciaste sesión con Google. La contraseña no aplica en esta cuenta.
          </p>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {message && <p className="text-green-400 text-sm">{message}</p>}

        <button type="submit" disabled={loading} className={`${btnPrimary} w-full h-10`}>
          {loading ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

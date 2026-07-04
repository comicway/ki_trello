import { useEffect, useState, useRef } from "react";
import { Input, Button } from "antd";
import { CameraOutlined, UserOutlined } from "@ant-design/icons";
import { firebase, auth, db } from "../../firebase";
import MemberAvatar from "../../components/MemberAvatar";

export default function Account() {
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [photoURL, setPhotoURL] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
        {/* Foto de perfil */}
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
              <CameraOutlined className="text-sm" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
          <p className="text-light-gray text-xs">{user.email}</p>
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-light-gray text-sm mb-1">Nombre</label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Nombre"
            prefix={<UserOutlined className="text-light-gray" />}
            className="bg-dark-blue text-pearl-white border-border-ki"
          />
        </div>

        {/* Apellido */}
        <div>
          <label className="block text-light-gray text-sm mb-1">Apellido</label>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Apellido"
            className="bg-dark-blue text-pearl-white border-border-ki"
          />
        </div>

        {/* Contraseña */}
        {canChangePassword ? (
          <>
            <div>
              <label className="block text-light-gray text-sm mb-1">Nueva contraseña</label>
              <Input.Password
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dejar vacío para no cambiar"
                className="bg-dark-blue text-pearl-white border-border-ki"
              />
            </div>
            <div>
              <label className="block text-light-gray text-sm mb-1">Confirmar contraseña</label>
              <Input.Password
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetir contraseña"
                className="bg-dark-blue text-pearl-white border-border-ki"
              />
            </div>
          </>
        ) : (
          <p className="text-light-gray text-xs italic">
            Iniciaste sesión con Google. La contraseña no aplica en esta cuenta.
          </p>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {message && <p className="text-green-400 text-sm">{message}</p>}

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          className="w-full bg-ki-purple border-ki-purple hover:bg-ki-pastel text-pearl-white font-medium h-10"
        >
          Guardar cambios
        </Button>
      </form>
    </div>
  );
}

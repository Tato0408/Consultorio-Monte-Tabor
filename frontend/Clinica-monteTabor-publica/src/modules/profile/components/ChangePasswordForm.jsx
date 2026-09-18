import { useState } from "react";
import { Loader2 } from "lucide-react";
import InputField from "@/components/ui/InputField";
import { changeMyPassword } from "@/services/profileService";
import { showSuccess, showError } from "@/lib/alerts";

// Misma regla de contraseña que el backend (getPasswordError) y que Register.jsx en este
// mismo portal: 8+ caracteres, una mayúscula, una minúscula, un número y un carácter
// especial. Antes faltaba la minúscula acá: una contraseña como "PASSWORD1!" pasaba este
// formulario pero el servidor la rechazaba, con un error que el usuario no esperaba tras
// "validar" en el cliente. Se valida también acá para no gastar un viaje si el formato ya
// viene mal.
const passwordError = (pw) => {
  if (pw.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (!/[A-Z]/.test(pw)) return "Incluye al menos una letra mayúscula";
  if (!/[a-z]/.test(pw)) return "Incluye al menos una letra minúscula";
  if (!/\d/.test(pw)) return "Incluye al menos un número";
  // Antes aceptaba CUALQUIER carácter no alfanumérico (espacios, acentos, ñ...) como
  // "especial". El backend exige uno de esta lista cerrada específica (getPasswordError);
  // una contraseña con solo un espacio o una ñ como "especial" pasaba aquí pero el
  // servidor la rechazaba igual.
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return "Incluye al menos un carácter especial";
  return null;
};

const ChangePasswordForm = ({ onDone }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const clearError = (key) => setErrors((prev) => (prev[key] ? { ...prev, [key]: null } : prev));

  const validate = () => {
    const next = {};
    if (!oldPassword.trim()) next.oldPassword = "Ingresa tu contraseña actual";
    if (!newPassword.trim()) next.newPassword = "Ingresa una nueva contraseña";
    else {
      const err = passwordError(newPassword);
      if (err) next.newPassword = err;
      else if (oldPassword.trim() && newPassword === oldPassword) next.newPassword = "La nueva contraseña debe ser diferente a la actual";
    }
    if (!confirmPassword.trim()) next.confirmPassword = "Confirma tu nueva contraseña";
    else if (confirmPassword !== newPassword) next.confirmPassword = "Las contraseñas no coinciden";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    try {
      const res = await changeMyPassword(oldPassword.trim(), newPassword.trim(), confirmPassword.trim());
      showSuccess(res?.message || "Contraseña actualizada correctamente.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onDone?.();
    } catch (err) {
      const msg = err.message || "No se pudo cambiar la contraseña.";
      if (msg === "La contraseña actual es incorrecta") setErrors({ oldPassword: msg });
      else if (msg === "Las contraseñas no coinciden") setErrors({ confirmPassword: msg });
      else if (msg === "La nueva contraseña debe ser diferente a la actual") setErrors({ newPassword: msg });
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-7 mb-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Seguridad de la cuenta</p>
        <h2 className="text-base font-bold text-gray-900 mb-5">Cambiar contraseña</h2>
        <div className="flex flex-col gap-4">
          <InputField
            label="Contraseña actual"
            type="password"
            value={oldPassword}
            onChange={(e) => { setOldPassword(e.target.value); clearError("oldPassword"); }}
            placeholder="Ingresa tu contraseña actual"
            error={errors.oldPassword}
          />
          <div>
            <InputField
              label="Nueva contraseña"
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); clearError("newPassword"); }}
              placeholder="Ingresa tu nueva contraseña"
              error={errors.newPassword}
            />
            <p className="text-xs text-gray-400 mt-1.5">Mínimo 8 caracteres, con una mayúscula, una minúscula, un número y un carácter especial.</p>
          </div>
          <InputField
            label="Confirmar nueva contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); clearError("confirmPassword"); }}
            placeholder="Repite tu nueva contraseña"
            error={errors.confirmPassword}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar cambios
        </button>
      </div>
    </form>
  );
};

export default ChangePasswordForm;

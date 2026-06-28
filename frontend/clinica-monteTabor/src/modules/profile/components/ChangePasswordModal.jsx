import { useState } from "react";
import { Lock, CheckCircle2, Circle, X } from "lucide-react";
import Swal from "sweetalert2";
import InputField from "@/components/ui/InputField";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

/**
 * ChangePasswordModal — Modal para cambiar la contraseña del usuario logueado.
 * Se activa desde el botón "Modificar contraseña" en ProfilePage.
 *
 * Props:
 *  - isOpen:   boolean
 *  - onClose:  function
 */
const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { user, userType } = useAuth();

  const [formData, setFormData] = useState({
    contrasena:        "",
    confirmContrasena: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // ── Reglas de validación en tiempo real ──────────────────────────────────
  const passwordRules = [
    {
      id:    "length",
      label: "La contraseña tiene más de 8 dígitos",
      test:  (p) => p.length > 8,
    },
    {
      id:    "uppercase",
      label: "La contraseña contiene mayúsculas y minúsculas",
      test:  (p) => /[A-Z]/.test(p) && /[a-z]/.test(p),
    },
    {
      id:    "number",
      label: "La contraseña incluye números",
      test:  (p) => /[0-9]/.test(p),
    },
    {
      id:    "special",
      label: "Las contraseñas incluyen caracteres especiales",
      test:  (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
    },
    {
      id:    "match",
      label: "Las contraseñas coinciden",
      test:  (p, c) => p.length > 0 && p === c,
    },
  ];

  const allRulesPassed = passwordRules.every((r) =>
    r.test(formData.contrasena, formData.confirmContrasena)
  );

  // ── Endpoint dinámico según el rol ────────────────────────────────────────
  const getEndpoint = () => {
    const routes = {
      admin:        `/admin/${user?.id}`,
      doctor:       `/doctors/${user?.id}`,
      nurse:        `/nurses/${user?.id}`,
      receptionist: `/receptionist/${user?.id}`,
    };
    return routes[userType];
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!allRulesPassed) {
      Swal.fire({
        icon:               "warning",
        title:              "Contraseña inválida",
        text:               "Por favor verifica que tu contraseña cumpla con todos los requisitos.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    try {
      setSubmitting(true);
      await apiClient(getEndpoint(), {
        method: "PUT",
        body:   { password: formData.contrasena },
      });

      await Swal.fire({
        icon:            "success",
        title:           "¡Contraseña actualizada!",
        text:            "Tu contraseña fue cambiada correctamente.",
        confirmButtonColor: "#2563eb",
        timer:           2500,
        timerProgressBar: true,
      });

      // Limpiar y cerrar
      setFormData({ contrasena: "", confirmContrasena: "" });
      onClose();
    } catch (err) {
      Swal.fire({
        icon:               "error",
        title:              "Error",
        text:               err.message || "No se pudo actualizar la contraseña.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Título */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">Cambiar contraseña</h2>
        <p className="text-xs text-gray-500 mb-6">
          Ingresa tu nueva contraseña y asegúrate de que cumpla con los requisitos.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Contraseña */}
          <InputField
            label="Contraseña"
            id="contrasena"
            type="password"
            placeholder="Ingresa tu contraseña"
            value={formData.contrasena}
            onChange={handleChange("contrasena")}
            icon={<Lock className="w-4 h-4" />}
            disabled={submitting}
          />

          {/* Confirmación */}
          <InputField
            label="Confirmación de Contraseña"
            id="confirmContrasena"
            type="password"
            placeholder="Confirma tu contraseña"
            value={formData.confirmContrasena}
            onChange={handleChange("confirmContrasena")}
            icon={<Lock className="w-4 h-4" />}
            disabled={submitting}
          />

          {/* Indicadores de reglas */}
          <div className="flex flex-col gap-2 px-1">
            {passwordRules.map((rule) => {
              const passed = rule.test(formData.contrasena, formData.confirmContrasena);
              return (
                <div key={rule.id} className="flex items-center gap-2">
                  {passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  )}
                  <span className={`text-xs transition-colors duration-200 ${passed ? "text-emerald-600" : "text-gray-400"}`}>
                    {rule.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !allRulesPassed}
              className="px-5 py-2.5 text-sm font-semibold bg-[#3B6FCA] text-white rounded-xl hover:bg-[#2d5ab5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Guardando..." : "Registrate"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
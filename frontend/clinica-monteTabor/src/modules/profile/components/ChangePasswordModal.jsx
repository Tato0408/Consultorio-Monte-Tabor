import { useState } from "react";
import { Lock, CheckCircle2, Circle, X } from "lucide-react";
import Swal from "sweetalert2";
import InputField from "@/components/ui/InputField";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { user, userType } = useAuth();

  const [formData, setFormData] = useState({
    contrasena:        "",
    confirmContrasena: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const passwordRules = [
    {
      id:    "length",
      label: "La contraseña tiene al menos 8 caracteres",
      test:  (p) => p.length >= 8,
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

  // admin usa /admin/:id porque ahí solo depende de validateAuthCookie (ya es autoservicio);
  // doctor/nurse/receptionist usan su ruta de autoservicio dedicada (/profile/update) — el
  // endpoint genérico /:id de esos tres exige el permiso de ADMINISTRAR a otros usuarios de ese
  // rol, que no tienen sobre sí mismos, y devolvía 403 (mismo criterio que useProfile.js).
  const getEndpoint = () => {
    const routes = {
      admin:        `/admin/${user?.id}`,
      doctor:       `/doctors/profile/update`,
      nurse:        `/nurses/profile/update`,
      receptionist: `/receptionist/profile/update`,
    };
    return routes[userType];
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">

        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-1">Cambiar contraseña</h2>
        <p className="text-xs text-gray-500 mb-6">
          Ingresa tu nueva contraseña y asegúrate de que cumpla con los requisitos.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          <InputField
            label="Contraseña"
            id="contrasena"
            type="password"
            placeholder="Ingresa tu contraseña"
            value={formData.contrasena}
            onChange={handleChange("contrasena")}
            maxLength={100}
            icon={<Lock className="w-4 h-4" />}
            disabled={submitting}
          />

          <InputField
            label="Confirmación de Contraseña"
            id="confirmContrasena"
            type="password"
            placeholder="Confirma tu contraseña"
            value={formData.confirmContrasena}
            onChange={handleChange("confirmContrasena")}
            maxLength={100}
            icon={<Lock className="w-4 h-4" />}
            disabled={submitting}
          />

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
              {submitting ? "Guardando..." : "Actualizar"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
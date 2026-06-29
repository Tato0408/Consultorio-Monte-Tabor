import { useState } from "react";
import { Lock, CheckCircle2, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "../../components/AuthLayout";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";

import InputField from "../../../../components/ui/InputField";
import FooterLogin from "../../components/Footer";

import { useRecoveryDoctor } from "../../hooks/useRecoveryDoctor";
import { useRecoveryReceptionist } from "../../hooks/useRecoveryReceptionist";
import { useRecoveryAdmin } from "../../hooks/useRecoveryAdmin";
import { useRecoveryNurse } from "../../hooks/useRecoveryNurse";
import { showSuccess } from "@/lib/alerts";

const NewPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const recoveryType = localStorage.getItem("recoveryType");

  const doctorRecovery = useRecoveryDoctor();
  const receptionistRecovery = useRecoveryReceptionist();
  const adminRecovery = useRecoveryAdmin();
  const nurseRecovery = useRecoveryNurse();

  let recovery;
  switch (recoveryType) {
    case "doctor":       recovery = doctorRecovery;       break;
    case "receptionist": recovery = receptionistRecovery; break;
    case "admin":        recovery = adminRecovery;        break;
    case "nurse":        recovery = nurseRecovery;        break;
    default:             recovery = doctorRecovery;       break;
  }

  const loading = recovery.loading;

  const passwordRules = [
    {
      id: "length",
      label: "La contraseña tiene más de 8 dígitos",
      test: (p) => p.length > 8,
    },
    {
      id: "uppercase",
      label: "La contraseña contiene mayúsculas y minúsculas",
      test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p),
    },
    {
      id: "number",
      label: "La contraseña incluye números",
      test: (p) => /[0-9]/.test(p),
    },
    {
      id: "special",
      label: "La contraseña incluye caracteres especiales",
      test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
    },
    {
      id: "match",
      label: "Las contraseñas coinciden",
      test: (p, c) => p.length > 0 && p === c,
    },
  ];

  const allRulesPassed = passwordRules.every((r) =>
    r.test(password, confirmPassword)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!allRulesPassed) {
      setError("Verifica que tu contraseña cumpla con todos los requisitos");
      return;
    }

    try {
      const response = await recovery.newPassword(password, confirmPassword);
      console.log("RESPUESTA CAMBIO PASSWORD:", response);

      localStorage.removeItem("recoveryType");
      localStorage.removeItem("recoveryEmail");
      showSuccess("Contraseña actualizada correctamente");
      navigate("/password-updated");
    } catch (error) {
      console.log("Error cambiando contraseña:", error);
      setError("No se pudo cambiar la contraseña");
    }
  };

  return (
    <AuthLayout
      title="REESTABLECE TU CONTRASEÑA"
      subtitle="Crea una nueva contraseña segura para proteger tu cuenta"
    >
      <div className="flex-1 flex flex-col justify-between px-8 sm:px-12 py-5">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[450px]">

            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900">
                Confirma tu contraseña
              </h2>
              <p className="text-gray-400 text-sm mt-4">
                Confirma con tu nueva contraseña para completar el proceso
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              <InputField
                label="Contraseña"
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                disabled={loading}
              />

              <InputField
                label="Confirmación"
                id="confirmPassword"
                type="password"
                placeholder="Ingresa tu contraseña de nuevo"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                disabled={loading}
              />

              {/* Validaciones */}
              <div className="flex flex-col gap-2 px-1">
                {passwordRules.map((rule) => {
                  const passed = rule.test(password, confirmPassword);
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

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <PrimaryButton
                loading={loading}
                type="submit"
                disabled={!allRulesPassed || loading}
              >
                Reestablecer contraseña
              </PrimaryButton>

              <SecondaryButton to="/login">
                Volver al inicio de sesión
              </SecondaryButton>

            </form>
          </div>
        </div>

        <FooterLogin />
      </div>
    </AuthLayout>
  );
};

export default NewPassword;
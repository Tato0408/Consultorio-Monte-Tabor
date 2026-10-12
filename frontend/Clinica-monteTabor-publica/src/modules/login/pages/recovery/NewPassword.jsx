import { useState } from "react";
import { Lock, CheckCircle2, Circle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import InputField from "@/components/ui/InputField";
import FooterLogin from "../../components/Footer";
import { usePatientRecovery } from "../../hooks/usePatientRecovery";
import { showSuccess } from "@/lib/alerts";

const NewPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const recovery = usePatientRecovery();
  const loading = recovery.loading;

  const passwordRules = [
    { id: "length", label: "La contraseña tiene al menos 8 caracteres", test: (p) => p.length >= 8 },
    { id: "uppercase", label: "La contraseña contiene mayúsculas y minúsculas", test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
    { id: "number", label: "La contraseña incluye números", test: (p) => /[0-9]/.test(p) },
    { id: "special", label: "La contraseña incluye caracteres especiales", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
    { id: "match", label: "Las contraseñas coinciden", test: (p, c) => p.length > 0 && p === c },
  ];
  const allRulesPassed = passwordRules.every((r) => r.test(password, confirmPassword));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");

    if (!allRulesPassed) {
      setError("Verifica que tu contraseña cumpla con todos los requisitos");
      return;
    }

    try {
      await recovery.newPassword(password, confirmPassword);
      localStorage.removeItem("recoveryEmail");
      showSuccess("Contraseña actualizada correctamente");
      navigate("/password-updated");
    } catch (err) {
      setError(err.message || "No se pudo cambiar la contraseña");
    }
  };

  return (
    <AuthLayout title="Restablece tu contraseña" subtitle="Crea una nueva contraseña segura para proteger tu cuenta">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Confirma tu contraseña</h2>
        <p className="text-gray-400 text-sm mt-2">Confirma con tu nueva contraseña para completar el proceso</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <fieldset disabled={loading} className="flex flex-col gap-5 border-0 p-0 m-0 min-w-0">
          <InputField
            label="Contraseña"
            id="password"
            type="password"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={100}
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
            maxLength={100}
            icon={<Lock className="w-4 h-4" />}
            disabled={loading}
          />

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

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={!allRulesPassed || loading}
            className="w-full py-3 rounded-lg bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#3B6FCA]/25"
          >
            {loading ? "Guardando..." : "Restablecer contraseña"}
          </button>
        </fieldset>

        <Link
          to="/login"
          onClick={(e) => { if (loading) e.preventDefault(); }}
          className={`text-center text-sm text-[#3B6FCA] font-medium hover:underline ${loading ? "opacity-50 pointer-events-none" : ""}`}
        >
          Volver al inicio de sesión
        </Link>
      </form>

      <FooterLogin />
    </AuthLayout>
  );
};

export default NewPassword;

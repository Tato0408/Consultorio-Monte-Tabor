import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import AuthLayout from "../../components/AuthLayout";
import FooterLogin from "../../components/Footer";
import { usePatientRecovery } from "../../hooks/usePatientRecovery";
import { showSuccess } from "@/lib/alerts";

const VerifyCode = () => {
  const [code, setCode] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const recovery = usePatientRecovery();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codeString = code.join("");

  const codeRules = [
    { id: "length", label: "El código tiene 6 caracteres", test: (c) => c.length === 6 },
    { id: "hex", label: "El código solo contiene caracteres válidos (0-9, a-f)", test: (c) => /^[a-fA-F0-9]*$/.test(c) && c.length > 0 },
  ];
  const allRulesPassed = codeRules.every((r) => r.test(codeString));

  const handleChange = (value, index) => {
    if (!/^[a-fA-F0-9]*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");

    if (!allRulesPassed) {
      setError("Ingresa el código completo");
      return;
    }

    setIsSubmitting(true);
    try {
      await recovery.verifyCode(codeString);
      showSuccess("Código verificado correctamente");
      navigate("/new-password");
    } catch {
      setError("Código incorrecto o expirado");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const savedEmail = localStorage.getItem("recoveryEmail");
      if (!savedEmail) {
        setError("No se encontró el correo. Vuelve a iniciar el proceso.");
        return;
      }
      await recovery.requestCode(savedEmail);
      showSuccess("Código reenviado correctamente");
    } catch {
      setError("Error al reenviar el código");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Un último paso" subtitle="Hemos enviado un código de 6 dígitos a tu correo electrónico">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Verifica tu correo</h2>
        <p className="text-gray-400 text-sm mt-2">Ingresa el código de verificación</p>
      </div>

      <form onSubmit={handleVerify} className="flex flex-col gap-5">
        <fieldset disabled={isSubmitting} className="flex flex-col gap-5 border-0 p-0 m-0 min-w-0">
          <div className="flex justify-center gap-3">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-12 h-12 border rounded-lg text-center text-xl outline-none focus:border-[#3B6FCA] transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50"
              />
            ))}
          </div>

          <div className="flex flex-col gap-2 px-1">
            {codeRules.map((rule) => {
              const passed = rule.test(codeString);
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
            disabled={!allRulesPassed || isSubmitting}
            className="w-full py-3 rounded-lg bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#3B6FCA]/25"
          >
            {isSubmitting ? "Verificando..." : "Verificar código"}
          </button>

          <div className="text-sm text-gray-400 text-center">
            ¿No recibiste el código?
            <button
              type="button"
              className="text-[#3B6FCA] font-medium ml-1 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleResendCode}
            >
              Reenviar código
            </button>
          </div>
        </fieldset>

        <Link
          to="/login"
          onClick={(e) => { if (isSubmitting) e.preventDefault(); }}
          className={`text-center text-sm text-[#3B6FCA] font-medium hover:underline ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}
        >
          Volver al inicio de sesión
        </Link>
      </form>

      <FooterLogin />
    </AuthLayout>
  );
};

export default VerifyCode;

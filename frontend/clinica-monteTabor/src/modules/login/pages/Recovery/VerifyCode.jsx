import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";

import AuthLayout from "../../components/AuthLayout";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";
import FooterLogin from "../../components/Footer";

import { useRecoveryDoctor } from "../../hooks/useRecoveryDoctor";
import { showSuccess } from "@/lib/alerts";

const VerifyCode = () => {
  const [code, setCode] = useState(Array(6).fill(""));
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const doctorRecovery = useRecoveryDoctor();
  const loading = doctorRecovery.loading;

  const codeString = code.join("");

  const codeRules = [
    {
      id: "length",
      label: "El código tiene 6 caracteres",
      test: (c) => c.length === 6,
    },
    {
      id: "hex",
      label: "El código solo contiene caracteres válidos (0-9, a-f)",
      test: (c) => /^[a-fA-F0-9]*$/.test(c) && c.length > 0,
    }
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
    setError("");

    if (!allRulesPassed) {
      setError("Ingresa el código completo");
      return;
    }

    try {
      await doctorRecovery.verifyCode(codeString);
      showSuccess("Código verificado correctamente");
      navigate("/new-password");
    } catch (error) {
      console.log("Error código:", error);
      setError("Código incorrecto o expirado");
    }
  };

  return (
    <AuthLayout
      title="UN ÚLTIMO PASO"
      subtitle="Hemos enviado un código de 6 dígitos a tu correo electrónico"
    >
      <div className="flex-1 flex flex-col justify-between px-8 sm:px-12 py-5">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[450px]">

            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900">
                Verifica tu correo
              </h2>
              <p className="text-gray-400 text-sm mt-4">
                Ingresa el código de verificación
              </p>
            </div>

            <form onSubmit={handleVerify} className="flex flex-col gap-5">

              {/* Inputs del código */}
              <div className="flex justify-center gap-3">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="w-12 h-12 border rounded-lg text-center text-xl outline-none focus:border-blue-500 transition-colors"
                  />
                ))}
              </div>

              {/* Validaciones */}
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

              {/* Error del backend */}
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <PrimaryButton
                loading={loading}
                type="submit"
                disabled={!allRulesPassed || loading}
              >
                Verificar código
              </PrimaryButton>

              <div className="text-sm text-gray-400 text-center">
                ¿No recibiste el código?
                <button
                  type="button"
                  className="text-blue-600 font-medium ml-1"
                >
                  Reenviar código
                </button>
              </div>

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

export default VerifyCode;
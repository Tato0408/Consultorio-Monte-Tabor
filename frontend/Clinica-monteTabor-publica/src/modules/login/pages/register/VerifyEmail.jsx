import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import FooterLogin from "../../components/Footer";
import { useAuth } from "@/context/AuthContext";
import { showSuccess, showError } from "@/lib/alerts";

const VerifyEmail = () => {
  const [code, setCode] = useState(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const { verifyPatientCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

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
    if (!allRulesPassed) return;

    setIsLoading(true);
    try {
      await verifyPatientCode(codeString);
      await showSuccess("Cuenta verificada correctamente, ya puedes iniciar sesión.");
      navigate("/login");
    } catch (error) {
      showError(error.message || "Código incorrecto o expirado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">
      <div className="relative hidden lg:flex lg:w-[45%] xl:w-[42%] overflow-hidden bg-white">
        <div
          className="absolute rounded-full"
          style={{
            width: "130%", paddingBottom: "130%", top: "-30%", left: "-30%",
            background: "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)",
          }}
        >
          <div className="absolute inset-0 flex flex-col justify-center items-center px-16 pt-[18%]">
            <div className="text-white max-w-[280px] text-center">
              <h1 className="text-4xl font-extrabold tracking-tight leading-tight">UN ÚLTIMO PASO</h1>
              <p className="mt-4 text-sm text-white/75 leading-relaxed">
                Hemos enviado un código de 6 dígitos a tu correo electrónico
              </p>
            </div>
          </div>
        </div>
        <div className="absolute rounded-full" style={{
          width: "75%", paddingBottom: "75%", bottom: "-20%", left: "-20%",
          background: "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)",
        }} />
        <div className="absolute rounded-full" style={{
          width: "32%", paddingBottom: "32%", bottom: "12%", right: "8%",
          background: "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)",
        }} />
      </div>

      <div className="flex-1 flex flex-col justify-between px-8 sm:px-14 py-10">
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="w-full max-w-[450px]">

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Verifica tu correo</h2>
              <p className="text-gray-400 text-sm mt-4">
                {email
                  ? <>Ingresa el código enviado a <span className="font-medium text-gray-600">{email}</span></>
                  : "Ingresa el código de verificación que recibiste por correo"}
              </p>
            </div>

            <form onSubmit={handleVerify} className="flex flex-col gap-5">

              <div className="flex justify-center gap-3">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    disabled={isLoading}
                    className="w-12 h-12 border rounded-lg text-center text-xl outline-none focus:border-blue-500 transition-colors disabled:opacity-60"
                  />
                ))}
              </div>

              <div className="flex flex-col gap-2 px-1">
                {codeRules.map((rule) => {
                  const passed = rule.test(codeString);
                  return (
                    <div key={rule.id} className="flex items-center gap-2">
                      {passed
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                      <span className={`text-xs transition-colors duration-200 ${passed ? "text-emerald-600" : "text-gray-400"}`}>
                        {rule.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={!allRulesPassed || isLoading}
                className="w-full py-3 rounded-lg bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#3B6FCA]/25"
              >
                {isLoading ? "Verificando..." : "Verificar código"}
              </button>

              <p className="text-center text-sm text-gray-500">
                ¿No recibiste el código?{" "}
                <Link to="/register" className="text-[#3B6FCA] font-medium hover:underline">
                  Volver a registrarte
                </Link>
              </p>
            </form>
          </div>
        </div>

        <FooterLogin />
      </div>
    </div>
  );
};

export default VerifyEmail;

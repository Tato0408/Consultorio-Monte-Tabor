import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import InputField from "@/components/ui/InputField";
import AuthLayout from "../../components/AuthLayout";
import FooterLogin from "../../components/Footer";
import { usePatientRecovery } from "../../hooks/usePatientRecovery";
import { showSuccess, showError } from "@/lib/alerts";

const Recovery = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const recovery = usePatientRecovery();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (recovery.loading) return;
    setError("");

    if (!email.trim()) {
      setError("Ingresa tu correo electrónico");
      return;
    }

    try {
      // El backend siempre responde igual exista o no la cuenta (ver GENERIC_MESSAGE en
      // recoveryPasswordPatientController.js), para no permitir enumerar correos reales.
      await recovery.requestCode(email);
      localStorage.setItem("recoveryEmail", email);
      showSuccess("Correo enviado", "Si el correo está registrado, te enviamos un código de verificación.");
      navigate("/verify-code");
    } catch (err) {
      showError("Error", err.message || "No se pudo procesar la solicitud. Intenta de nuevo.");
    }
  };

  return (
    <AuthLayout title="¿Olvidaste tu contraseña?" subtitle="Te ayudaremos a restablecerla">
      <div className="flex flex-col items-center mb-8">
        <img
          src="/logoConsultorioSInFondo.png"
          alt="Consultorio Médico Familiar Monte Tabor"
          className="object-contain mb-4"
          style={{ width: "200px", height: "auto" }}
        />
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight text-center">Recupera tu contraseña</h2>
        <p className="text-gray-400 text-sm mt-2 text-center">Ingresa tu correo electrónico y te enviaremos un código</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <fieldset disabled={recovery.loading} className="flex flex-col gap-5 border-0 p-0 m-0 min-w-0">
          <InputField
            label="Correo electrónico"
            id="email"
            type="email"
            placeholder="Ingresa tu correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={100}
            icon={<Mail className="w-4 h-4" />}
            error={error}
            disabled={recovery.loading}
          />

          <button
            type="submit"
            disabled={recovery.loading}
            className="w-full py-3 rounded-lg mt-1 bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#3B6FCA]/25"
          >
            {recovery.loading ? "Enviando..." : "Enviar código"}
          </button>
        </fieldset>

        <Link
          to="/login"
          onClick={(e) => { if (recovery.loading) e.preventDefault(); }}
          className={`text-center text-sm text-[#3B6FCA] font-medium hover:underline ${recovery.loading ? "opacity-50 pointer-events-none" : ""}`}
        >
          Volver al inicio de sesión
        </Link>
      </form>

      <FooterLogin />
    </AuthLayout>
  );
};

export default Recovery;

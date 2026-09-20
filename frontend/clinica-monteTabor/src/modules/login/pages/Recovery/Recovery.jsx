import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";

import InputField from "../../components/InputField";
import AuthLayout from "../../components/AuthLayout";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";
import FooterLogin from "../../components/Footer";

import { useStaffRecovery } from "../../hooks/useStaffRecovery";

import { showError, showSuccess } from "../../../../lib/alerts";

const RecoveryPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const staffRecovery = useStaffRecovery();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");

    //Valida que el input no este vacio o solo con espacios
    if (!email.trim()) {
      setError("Ingresa tu correo electrónico");
      return;
    }

    setIsSubmitting(true);
    try {
      // Un solo endpoint revisa las 4 colecciones de staff (admin, doctor, enfermera,
      // recepcionista) y SIEMPRE responde igual, exista o no la cuenta: antes se probaban
      // 4 endpoints en secuencia y el 404/200 de cada uno permitía enumerar por API
      // directa qué rol tiene cada correo (ver staffRecoveryController.js).
      await staffRecovery.requestCode(email);
      localStorage.setItem("recoveryEmail", email);
      showSuccess("Correo enviado", "Si el correo está registrado, te enviamos un código de verificación.");
      navigate("/verify-code");
    } catch (error) {
      showError("Error", error.message || "No se pudo procesar la solicitud. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="¿Olvidaste tu contraseña?"
      subtitle="Te ayudaremos a restablecerla"
    >
      <div className="flex-1 flex flex-col justify-between px-8 sm:px-12 py-5">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[450px]">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900">
                Recupera tu contraseña
              </h2>

              <p className="text-gray-400 text-sm mt-4">
                Ingresa tu correo electrónico y te enviaremos un código
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* fieldset nativo: al desactivarse, desactiva TODOS los controles de formulario
                  que contiene (input, button) de un solo golpe, sin tener que marcar cada uno */}
              <fieldset disabled={isSubmitting} className="space-y-6 border-0 p-0 m-0 min-w-0">
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
                  disabled={isSubmitting}
                />

                <PrimaryButton type="submit" loading={isSubmitting}>
                  Enviar código
                </PrimaryButton>
              </fieldset>

              {/* Un <Link> no es un control de formulario: fieldset no lo alcanza, se desactiva aparte */}
              <SecondaryButton to="/login" disabled={isSubmitting}>
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

export default RecoveryPassword;

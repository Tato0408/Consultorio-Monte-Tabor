import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";

import InputField from "../../components/InputField";
import AuthLayout from "../../components/AuthLayout";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";
import FooterLogin from "../../components/Footer";

import { useRecoveryDoctor } from "../../hooks/useRecoveryDoctor";
import { useRecoveryReceptionist } from "../../hooks/useRecoveryReceptionist";
import { useRecoveryAdmin } from "../../hooks/useRecoveryAdmin";
import { useRecoveryNurse } from "../../hooks/useRecoveryNurse";

import { showError, showSuccess } from "../../../../lib/alerts";

const RecoveryPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  // Este formulario prueba hasta 4 peticiones seguidas (doctor,
  // recepcionista, admin, enfermera) antes de saber si el correo
  // existe. Este estado evita que un doble clic dispare esa cadena
  // completa dos veces en paralelo.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const doctorRecovery = useRecoveryDoctor();
  const receptionistRecovery = useRecoveryReceptionist();
  const adminRecovery = useRecoveryAdmin();
  const nurseRecovery = useRecoveryNurse();

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
      // 1. Intenta autenticar el correo como doctor.
      try {
        const doctorRes = await doctorRecovery.requestCode(email);
        // Continúa solo si la respuesta indica éxito.
        if (doctorRes.message === "Correo enviado") {
          localStorage.setItem("recoveryType", "doctor");
          localStorage.setItem("recoveryEmail", email);
          showSuccess("Correo enviado", "Se ha enviado un código de confirmación a tu correo electrónico.");
          navigate("/verify-code");
          // Ya tuvo éxito, así que la función se detiene aquí.
          return;
        }
      } catch (e) {
        console.log("No es doctor:", e.message);
      }

      // 2. Intenta autenticar el correo como recepcionista.
      try {
        const recRes = await receptionistRecovery.requestCode(email);
        if (recRes.message === "Correo enviado") {
          localStorage.setItem("recoveryType", "receptionist");
          localStorage.setItem("recoveryEmail", email);
          showSuccess("Correo enviado", "Se ha enviado un código de confirmación a tu correo electrónico.");
          navigate("/verify-code");
          return;
        }
      } catch (e) {
        console.log("No es recepcionista:", e.message);
      }

      // 3. Intenta autenticar el correo como administrador.
      try {
        const adminRes = await adminRecovery.requestCode(email);
        if (adminRes.message === "Correo enviado") {
          localStorage.setItem("recoveryType", "admin");
          localStorage.setItem("recoveryEmail", email);
          showSuccess("Correo enviado", "Se ha enviado un código de confirmación a tu correo electrónico.");
          navigate("/verify-code");
          return;
        }
      } catch (e) {
        console.log("No es admin:", e.message);
      }

      // 4. Intenta autenticar el correo como enfermera.
      try {
        const nurseRes = await nurseRecovery.requestCode(email);
        if (nurseRes.message === "Correo enviado") {
          localStorage.setItem("recoveryType", "nurse");
          localStorage.setItem("recoveryEmail", email);
          showSuccess("Correo enviado", "Se ha enviado un código de confirmación a tu correo.");
          navigate("/verify-code");
          return;
        }
      } catch (e) {
        console.log("No es enfermera:", e.message);
      }

      // 5. Si el flujo llega hasta aquí, significa que ninguno de
      // los intentos anteriores tuvo éxito y el correo no existe en
      // ninguna de las colecciones de usuarios.
      showError(
        "Correo incorrecto",
        "No se ha encontrado una cuenta con ese correo electrónico."
      );
    } finally {
      // Se ejecuta siempre, incluso en los return de éxito. Así el
      // formulario nunca queda bloqueado si algo falla de forma
      // inesperada antes de que la navegación desmonte la página.
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
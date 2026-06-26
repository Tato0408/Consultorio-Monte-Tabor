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

import { showError } from "../../../../lib/alerts";

const RecoveryPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const doctorRecovery = useRecoveryDoctor();
  const receptionistRecovery = useRecoveryReceptionist();
  const adminRecovery = useRecoveryAdmin();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Ingresa tu correo electrónico");
      return;
    }

    // Doctor
    try {
      const doctorRes = await doctorRecovery.requestCode(email);

      if (doctorRes.message === "email sent") {
        localStorage.setItem("recoveryType", "doctor");
        localStorage.setItem("recoveryEmail", email);
        navigate("/verify-code");
        return;
      }
    } catch (e) {}

    // Receptionist
    try {
      const recRes = await receptionistRecovery.requestCode(email);

      if (recRes.message === "email sent") {
        localStorage.setItem("recoveryType", "receptionist");
        localStorage.setItem("recoveryEmail", email);
        navigate("/verify-code");
        return;
      }
    } catch (e) {}

    // Admin
    try {
      const adminRes = await adminRecovery.requestCode(email);

      if (adminRes.message === "email sent") {
        localStorage.setItem("recoveryType", "admin");
        localStorage.setItem("recoveryEmail", email);
        navigate("/verify-code");
        return;
      }
    } catch (e) {}

    showError(
      "Correo no encontrado",
      "No existe ninguna cuenta registrada con ese correo electrónico."
    );
  };

  return (
    <AuthLayout
      title="¿OLVIDASTE TU CONTRASEÑA?"
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
              <InputField
                label="Correo"
                id="email"
                type="email"
                placeholder="Ingresa tu correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                error={error}
              />

              <PrimaryButton type="submit">
                Enviar código
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

export default RecoveryPassword;
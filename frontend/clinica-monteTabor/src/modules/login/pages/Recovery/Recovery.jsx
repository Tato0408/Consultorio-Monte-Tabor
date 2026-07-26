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

  const navigate = useNavigate();

  const doctorRecovery = useRecoveryDoctor();
  const receptionistRecovery = useRecoveryReceptionist();
  const adminRecovery = useRecoveryAdmin();
  const nurseRecovery = useRecoveryNurse();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    //Valida que el input no este vacio o solo con espacios
    if (!email.trim()) {
      setError("Ingresa tu correo electrónico");
      return;
    }

    //1. Intentamos con Doctor
    try {
      const doctorRes = await doctorRecovery.requestCode(email);
      // Solo entramos al IF si fue exitoso
      if (doctorRes.message === "email sent") {
        localStorage.setItem("recoveryType", "doctor");
        localStorage.setItem("recoveryEmail", email);
        showSuccess("Correo Enviado", "Se ha enviado un código de confirmación a tu correo electrónico.");
        navigate("/verify-code");
        return; //Como fue exitoso, se deitene la función aquí
      }
    } catch (e) {
      console.log("No es doctor:", e.message);
    }

    //2. Intentamos con Receptionist
    try {
      const recRes = await receptionistRecovery.requestCode(email);
      if (recRes.message === "email sent") {
        localStorage.setItem("recoveryType", "receptionist");
        localStorage.setItem("recoveryEmail", email);
        showSuccess("Correo Enviado", "Se ha enviado un código de confirmación a tu correo electrónico.");
        navigate("/verify-code");
        return; 
      }
    } catch (e) {
      console.log("No es recepcionista:", e.message);
    }

    //3. Intentamos con Admin
    try {
      const adminRes = await adminRecovery.requestCode(email);
      if (adminRes.message === "email sent") {
        localStorage.setItem("recoveryType", "admin");
        localStorage.setItem("recoveryEmail", email);
        showSuccess("Correo Enviado", "Se ha enviado un código de confirmación a tu correo electrónico.");
        navigate("/verify-code");
        return; 
      }
    } catch (e) {
      console.log("No es admin:", e.message);
    }

    // 4.Intentamos con Nurse
    try {
      const nurseRes = await nurseRecovery.requestCode(email);
      if (nurseRes.message === "email sent") {
        localStorage.setItem("recoveryType", "nurse");
        localStorage.setItem("recoveryEmail", email);
        showSuccess("Correo Enviado", "Se ha enviado un código de confirmación a tu correo.");
        navigate("/verify-code");
        return; 
      }
    } catch (e) {
      console.log("No es enfermera:", e.message);
    }

    // 5.Si el código llega hasta esta linea, significa que todos los intentos anteriores fallaron 
    //por lo tanto el correo no existe en ninguna de las colecciones wuaooow 
    showError(
      "Correo incorrecto",
      "No se ha encontrado una cuenta con ese correo electrónico."
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
                label="Correo electrónico"
                id="email"
                type="email"
                placeholder="Ingresa tu correo electrónico"
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
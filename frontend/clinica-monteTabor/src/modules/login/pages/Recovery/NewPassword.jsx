import { useState } from "react";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "../../components/AuthLayout";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";

import InputField from "../../../../components/ui/InputField";
import FooterLogin from "../../components/Footer";

import { useRecoveryDoctor } from "../../hooks/useRecoveryDoctor";
import { useRecoveryReceptionist } from "../../hooks/useRecoveryReceptionist";

const NewPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // 🔥 SOLO LEEMOS EL TIPO REAL GUARDADO EN EL PASO ANTERIOR
  const recoveryType = localStorage.getItem("recoveryType");

  const doctorRecovery = useRecoveryDoctor();
  const receptionistRecovery = useRecoveryReceptionist();

  const recovery =
    recoveryType === "receptionist"
      ? receptionistRecovery
      : doctorRecovery;

  const loading = recovery.loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Completa todos los campos");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      const response = await recovery.newPassword(
        password,
        confirmPassword
      );

      console.log("RESPUESTA CAMBIO PASSWORD:", response);

      // limpiar flujo
      localStorage.removeItem("recoveryType");
      localStorage.removeItem("recoveryEmail");

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

            <form onSubmit={handleSubmit} className="space-y-5">

              <InputField
                label="Contraseña"
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
              />

              <InputField
                label="Confirmación"
                id="confirmPassword"
                type="password"
                placeholder="Ingresa tu contraseña de nuevo"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
              />

              {error && (
                <p className="text-red-500 text-sm text-center">
                  {error}
                </p>
              )}

              <PrimaryButton loading={loading} type="submit">
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
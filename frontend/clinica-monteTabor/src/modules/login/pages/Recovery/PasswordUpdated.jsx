import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import PrimaryButton from "../../components/PrimaryButton";
import FooterLogin from "../../components/Footer";

const PasswordUpdated = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Contraseña actualizada"
      subtitle="Tu contraseña ha sido restablecida exitosamente"
    >
      <div className="flex-1 flex flex-col justify-between px-8 sm:px-12 py-5">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[450px] text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ¡Listo!
            </h2>

            <p className="text-gray-400 text-sm mb-10">
              Ya puedes iniciar sesión en tu cuenta
            </p>

            {/* Botón simple que redirige al login al hacer click usando la función de react router */}
            <PrimaryButton onClick={() => navigate("/login")}>
              ← Ir al inicio de sesión
            </PrimaryButton>
          </div>
        </div>

        <FooterLogin />
      </div>
    </AuthLayout>
  );
};

export default PasswordUpdated;
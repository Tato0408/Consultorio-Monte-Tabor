import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import FooterLogin from "../../components/Footer";

const PasswordUpdated = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout title="Contraseña actualizada" subtitle="Tu contraseña ha sido restablecida exitosamente">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight mb-3">¡Listo!</h2>
        <p className="text-gray-400 text-sm mb-8">Ya puedes iniciar sesión en tu cuenta</p>

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="w-full py-3 rounded-lg bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-md shadow-[#3B6FCA]/25"
        >
          ← Ir al inicio de sesión
        </button>
      </div>

      <FooterLogin />
    </AuthLayout>
  );
};

export default PasswordUpdated;

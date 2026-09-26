import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import InputField from "@/components/ui/InputField";
import FooterLogin from "../../components/Footer";
import { useAuth } from "@/context/AuthContext";
import { showSuccess, showError } from "@/lib/alerts";

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoggedIn, isLoading: sessionLoading } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // Si ya hay una sesión activa (ej. el usuario navegó manualmente a /login estando
  // logueado), lo manda directo al dashboard en vez de mostrarle el formulario de nuevo
  useEffect(() => {
    if (!sessionLoading && isLoggedIn) navigate("/dashboard", { replace: true });
  }, [sessionLoading, isLoggedIn, navigate]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (apiError) setApiError("");
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Ingresa un email válido";
    }
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mínimo 6 caracteres";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsLoading(true);
    setApiError("");

    try {
      // Como tu nuevo AuthContext propaga el error lanzándolo directamente,
      // cualquier respuesta exitosa continuará con las siguientes líneas:
      await login(formData.email, formData.password);
      
      showSuccess("¡Bienvenido de nuevo!");
      navigate("/dashboard");
    } catch (error) {
      // Captura de forma segura el mensaje estructurado de tu apiClient
      const errorMessage = error?.message || "Credenciales incorrectas. Por favor, intenta de nuevo.";
      setApiError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Mientras se confirma si ya hay sesión activa, no se muestra el formulario para
  // evitar el parpadeo de "login -> ya tenía sesión -> dashboard"
  if (sessionLoading || isLoggedIn) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <svg className="animate-spin h-10 w-10 text-[#3B6FCA]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">
      <div className="relative hidden lg:flex lg:w-[45%] xl:w-[42%] overflow-hidden bg-white">
        <div
          className="absolute rounded-full"
          style={{
            width: "130%",
            paddingBottom: "130%",
            top: "-30%",
            left: "-30%",
            background: "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)",
          }}
        >
          <div className="absolute inset-0 flex flex-col justify-center items-center px-16 pt-[18%]">
            <div className="text-white max-w-[260px]">
              <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-3">
                BIENVENIDO
              </h1>
              <h2 className="text-lg font-semibold mb-4 text-white/90">
                Inicia sesión en tu cuenta
              </h2>
              <p className="text-sm text-white/75 leading-relaxed">
                Accede a tu portal de paciente para gestionar tus citas e
                historial médico de forma segura
              </p>
            </div>
          </div>
        </div>
        <div
          className="absolute rounded-full"
          style={{
            width: "75%",
            paddingBottom: "75%",
            bottom: "-20%",
            left: "-20%",
            background: "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: "32%",
            paddingBottom: "32%",
            bottom: "12%",
            right: "8%",
            background: "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)",
          }}
        />
      </div>
      <div className="flex-1 flex flex-col justify-between px-8 sm:px-14 py-10">

        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="w-full max-w-[400px]">

            <div className="flex flex-col items-center mb-8">

              <div className="mb-4 flex items-center justify-center">
                <img
                  src="/logoConsultorioSInFondo.png"
                  alt="Clínica Monte Tabor"
                  className="object-contain"
                  style={{ width: "260px", height: "auto" }}
                />
              </div>

              <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
                Iniciar sesión
              </h2>

            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

              {apiError && (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  {apiError}
                </div>
              )}

              <InputField
                label="Correo electrónico"
                id="email"
                type="email"
                placeholder="Ingresa tu email"
                value={formData.email}
                onChange={handleChange("email")}
                icon={<Mail className="w-4 h-4" />}
                error={errors.email}
                disabled={isLoading}
              />

              <InputField
                label="Contraseña"
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={formData.password}
                onChange={handleChange("password")}
                icon={<Lock className="w-4 h-4" />}
                error={errors.password}
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg mt-1 bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#3B6FCA]/25"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : "Iniciar sesión"}
              </button>

              <p className="text-center text-sm text-gray-500">
                ¿No tienes una cuenta?{" "}
                <Link to="/register" className="text-[#3B6FCA] font-medium hover:underline">
                  Regístrate
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

export default Login;
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import Swal from "sweetalert2";
import InputField from "../../../../components/ui/InputField";
import FooterLogin from "../../components/Footer";
import { useAuth } from "@/context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  //manejador dinámico que actualiza los inputs y limpia los errores en tiempo real
  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (apiError) setApiError("");
  };

  // Valida la estructura del correo. La contraseña solo se exige
  // que no esté vacía, ya que en la pantalla de login no tiene
  // sentido indicar qué requisito le falta a la contraseña (eso es
  // útil al crearla, no al iniciar sesión con una que ya existe).
  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "El correo electrónico es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Ingresa un email válido";
    }
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    }
    return newErrors;
  };

  // Gestiona el envío del formulario, la llamada al contexto y las notificaciones
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Guarda extra por si dos clics llegan antes de que el botón refleje isLoading=true en el DOM
    if (isLoading) return;
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsLoading(true);

    //Configuracion de mensajes de sweetAlert
    const Toast = Swal.mixin({
    toast: true,
    position: "top-end", 
    showConfirmButton: false, 
    // Se cierra automáticamente después de 3 segundos.
    timer: 3000,
    // Muestra la barra de progreso del tiempo restante.
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    }
  });


    try {
      console.log("Login admin:", formData);

      // llama al método global de login y evalúa si fue exitoso
      const succes = await login(formData.email, formData.password);

      // mensaje de bienvenida y redirección al panel principal del sistema
      if (succes) {
        Toast.fire({
        icon: "success",
        title: "¡Bienvenido de nuevo!"
      });
        navigate("/home");
      }
      // Si succes es false, login (desde AuthContext) ya mostró su
      // propia notificación de error. Mostrar otra aquí duplicaría
      // el aviso con un segundo mensaje distinto.

    } catch (error) {
      Toast.fire({
      icon: "warning",
      title: "Error de conexión",
      text: error?.response?.data?.message || "Sin respuesta del servidor."
    });
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
                Bienvenido
              </h1>
              <h2 className="text-lg font-semibold mb-4 text-white/90">
                Inicia sesión en tu cuenta
              </h2>
              <p className="text-sm text-white/75 leading-relaxed">
                Accede a tu panel de trabajo para gestionar el sistema de
                forma segura y responsable
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

              <div className="mb-4 relative flex items-center justify-center" style={{ width: "56px", height: "64px" }}>
                <svg
                  viewBox="0 0 56 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute inset-0 w-full h-full drop-shadow-lg"
                  style={{ filter: "drop-shadow(0 4px 12px rgba(59,111,202,0.35))" }}
                >
                  <polygon
                    points="28,2 54,17 54,47 28,62 2,47 2,17"
                    fill="#3B6FCA"
                  />
                </svg>
                <span className="relative z-10 text-white font-bold text-xl select-none">T</span>
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
                placeholder="Ingresa tu correo electrónico"
                value={formData.email}
                onChange={handleChange("email")}
                maxLength={100}
                icon={<Mail className="w-4 h-4" />}
                error={errors.email}
                disabled={isLoading}
              />

              <div className="flex flex-col gap-1">
                <InputField
                  label="Contraseña"
                  id="password"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={formData.password}
                  onChange={handleChange("password")}
                  maxLength={100}
                  icon={<Lock className="w-4 h-4" />}
                  error={errors.password}
                  disabled={isLoading}
                />
                <div className="flex justify-end mt-1">
                  <Link
                    to="/recovery"
                    onClick={(e) => { if (isLoading) e.preventDefault(); }}
                    aria-disabled={isLoading}
                    tabIndex={isLoading ? -1 : undefined}
                    className={`text-xs text-[#3B6FCA] hover:text-[#2d5ab5] hover:underline transition-colors ${
                      isLoading ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

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
            </form>
          </div>
        </div>

        <FooterLogin />
      </div>
    </div>
  );
};

export default Login;
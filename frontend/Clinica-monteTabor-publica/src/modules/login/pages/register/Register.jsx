import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Calendar, CheckCircle2, Circle } from "lucide-react";
import InputField from "@/components/ui/InputField";
import FooterLogin from "../../components/Footer";
import { useAuth } from "@/context/AuthContext";
import { showSuccess, showError } from "@/lib/alerts";

const Register = () => {
  const navigate = useNavigate();
  const { registerPatient } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    birthdate: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const passwordRules = [
    { id: "length", label: "La contraseña tiene más de 8 dígitos", test: (p) => p.length > 8 },
    { id: "upper", label: "Contiene mayúsculas y minúsculas", test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
    { id: "number", label: "Incluye números", test: (p) => /[0-9]/.test(p) },
    { id: "special", label: "Incluye caracteres especiales", test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
    { id: "match", label: "Las contraseñas coinciden", test: (p, c) => p.length > 0 && p === c },
  ];

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = "Requerido";
    if (!formData.last_name.trim()) e.last_name = "Requerido";

    if (!formData.birthdate) e.birthdate = "Requerido";

    if (!formData.email.trim()) e.email = "Requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Correo inválido";

    if (!formData.password) e.password = "Requerido";
    else if (
      formData.password.length <= 8 ||
      !/[A-Z]/.test(formData.password) ||
      !/[a-z]/.test(formData.password) ||
      !/[0-9]/.test(formData.password) ||
      !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password)
    ) e.password = "La contraseña no cumple con los requisitos indicados";

    if (formData.password !== formData.confirmPassword) e.confirmPassword = "Las contraseñas no coinciden";

    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      await registerPatient({
        name: formData.name,
        last_name: formData.last_name,
        birthdate: formData.birthdate,
        email: formData.email,
        password: formData.password,
      });

      showSuccess("Te enviamos un código de verificación a tu correo.");
      navigate("/register/verify", { state: { email: formData.email } });
    } catch (error) {
      showError(error.message || "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-white overflow-hidden">

      <div className="relative hidden lg:flex lg:w-[45%] xl:w-[42%] overflow-hidden bg-white flex-shrink-0">
        <div className="absolute rounded-full" style={{
          width: "130%", paddingBottom: "130%", top: "-30%", left: "-30%",
          background: "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)",
        }}>
          <div className="absolute inset-0 flex flex-col justify-center items-center px-16 pt-[18%]">
            <div className="text-white max-w-[280px]">
              <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-2">BIENVENIDO</h1>
              <h2 className="text-lg font-semibold mb-3 text-white/90">Crea tu cuenta de paciente</h2>
              <p className="text-sm text-white/75 leading-relaxed">
                Regístrate para agendar citas y acceder a tu historial médico de forma segura
              </p>
            </div>
          </div>
        </div>
        <div className="absolute rounded-full" style={{
          width: "75%", paddingBottom: "75%", bottom: "-20%", left: "-20%",
          background: "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)",
        }} />
        <div className="absolute rounded-full" style={{
          width: "32%", paddingBottom: "32%", bottom: "12%", right: "8%",
          background: "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)",
        }} />
      </div>

      <div className="flex-1 flex flex-col justify-between px-8 sm:px-12 py-5 overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="w-full max-w-[480px]">

            <div className="flex flex-col items-center mb-5">
              <div className="mb-2 relative flex items-center justify-center" style={{ width: "44px", height: "50px" }}>
                <svg viewBox="0 0 56 64" fill="none" xmlns="http://www.w3.org/2000/svg"
                  className="absolute inset-0 w-full h-full"
                  style={{ filter: "drop-shadow(0 4px 12px rgba(59,111,202,0.35))" }}>
                  <polygon points="28,2 54,17 54,47 28,62 2,47 2,17" fill="#3B6FCA" />
                </svg>
                <span className="relative z-10 text-white font-bold text-lg select-none">T</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 tracking-tight">Crear cuenta</h2>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

              <div className="grid grid-cols-2 gap-4">
                <InputField label="Nombre" id="name" type="text" placeholder="Ingresa tu/s nombre/s"
                  value={formData.name} onChange={handleChange("name")}
                  icon={<User className="w-4 h-4" />} error={errors.name} disabled={isLoading} />
                <InputField label="Apellido" id="last_name" type="text" placeholder="Ingresa tu/s apellido/s"
                  value={formData.last_name} onChange={handleChange("last_name")}
                  icon={<User className="w-4 h-4" />} error={errors.last_name} disabled={isLoading} />
              </div>

              <InputField label="Fecha de nacimiento" id="birthdate" type="date"
                value={formData.birthdate} onChange={handleChange("birthdate")}
                icon={<Calendar className="w-4 h-4" />} error={errors.birthdate} disabled={isLoading} />

              <InputField label="Correo electrónico" id="email" type="email" placeholder="Ingresa tu correo electrónico"
                value={formData.email} onChange={handleChange("email")}
                icon={<Mail className="w-4 h-4" />} error={errors.email} disabled={isLoading} />

              <InputField label="Contraseña" id="password" type="password" placeholder="Ingresa tu contraseña"
                value={formData.password} onChange={handleChange("password")}
                icon={<Lock className="w-4 h-4" />} error={errors.password} disabled={isLoading} />

              <InputField label="Confirmación de contraseña" id="confirmPassword" type="password" placeholder="Confirma tu contraseña"
                value={formData.confirmPassword} onChange={handleChange("confirmPassword")}
                icon={<Lock className="w-4 h-4" />} error={errors.confirmPassword} disabled={isLoading} />

              <div className="flex flex-col gap-1.5 px-1">
                {passwordRules.map((rule) => {
                  const passed = rule.test(formData.password, formData.confirmPassword);
                  return (
                    <div key={rule.id} className="flex items-center gap-2">
                      {passed
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      }
                      <span className={`text-xs transition-colors duration-200 ${passed ? "text-emerald-600" : "text-gray-400"}`}>
                        {rule.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#3B6FCA]/25"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Registrando...
                  </span>
                ) : "Regístrate"}
              </button>

              <p className="text-center text-sm text-gray-500">
                ¿Ya tienes una cuenta?{" "}
                <Link to="/login" className="text-[#3B6FCA] font-medium hover:underline">
                  Inicia sesión
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

export default Register;

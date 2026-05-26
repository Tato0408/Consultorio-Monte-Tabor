import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, CreditCard, Calendar, Venus, CheckCircle2, Circle } from "lucide-react";
import InputField from "../../../../components/ui/InputField";
import FooterLogin from "../../components/Footer";

const Register = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        nombre: "", apellido: "", dui: "", edad: "",
        genero: "", correo: "", contrasena: "", confirmContrasena: "",
    });

    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState("");

    //Array de reglas de contraseña
    /**
     * @param {string} p - Hace referencia al valor del campo "Contraseña". Es el que se pasa como primer argumento cuando se llama a la funcion test.
     * @param {string} c - Hace referencia al valor del campo "Confirmar Contraseña". Es el que se pasa como segundo argumento cuando se llama a la funcion test.
     * @param {function} test - Es la funcion que se ejecuta para validar la regla. Recibe p y c como argumentos. Retorna un TRUE o FALSE, dependiendo de ese resultado, es el que dicta si el check de la validación se coloca en verde o en gris.
     */
    const passwordRules = [
        { id: "length", label: "La contraseña tiene más de 8 dígitos", test: (p) => p.length > 8 },
        { id: "upper", label: "Las contraseña contiene mayúsculas y minúsculas", test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
        { id: "number", label: "La contraseña incluye números", test: (p) => /[0-9]/.test(p) },
        { id: "special", label: "La contraseña incluye caracteres especiales", test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
        { id: "match", label: "Las contraseñas coinciden", test: (p, c) => p.length > 0 && p === c },
    ];

    /**
     * Actualiza el campo correspondiente del formulario usando el nombre del campo como clave,
       limpiando automáticamente su error de validación y el error general de la API en cuanto el usuario comienza a escribir.
     */
    const handleChange = (field) => (e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
        if (apiError) setApiError("");
    };

    const validate = () => {
        const e = {};
        if (!formData.nombre.trim()) e.nombre = "Requerido";
        if (!formData.apellido.trim()) e.apellido = "Requerido";
        if (!formData.dui.trim()) e.dui = "Requerido";
        else if (!/^\d{8}-\d$/.test(formData.dui)) e.dui = "Formato: 00000000-0";
        if (!formData.edad.trim()) e.edad = "Requerido";
        else if (isNaN(formData.edad) || +formData.edad < 18 || +formData.edad > 100) e.edad = "18–100";
        if (!formData.genero.trim()) e.genero = "Requerido";
        if (!formData.correo.trim()) e.correo = "Requerido";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) e.correo = "Correo inválido: ejemplo@dominio.com";
        if (!formData.contrasena) e.contrasena = "Requerido";
        else if (
            formData.contrasena.length <= 8 ||
            !/[A-Z]/.test(formData.contrasena) ||
            !/[a-z]/.test(formData.contrasena) ||
            !/[0-9]/.test(formData.contrasena) ||
            !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.contrasena)
        ) e.contrasena = "La contraseña no cumple con los requisitos indicados";
        if (formData.contrasena !== formData.confirmContrasena) e.confirmContrasena = "Las contraseñas no coinciden";
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
        setIsLoading(true);
        try {
            // TODO: POST /api/auth/admin/register
            console.log("Register admin:", formData);
        } catch (error) {
            setApiError(error?.response?.data?.message || "Error al registrar. Intenta de nuevo.");
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
                            <h2 className="text-lg font-semibold mb-3 text-white/90">Crea tu cuenta de administrador</h2>
                            <p className="text-sm text-white/75 leading-relaxed">
                                Crea tu cuenta con tu información personal para comenzar a gestionar el sistema de manera segura y eficiente
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
            <div className="flex-1 flex flex-col justify-between px-8 sm:px-12 py-5 overflow-hidden">

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
                            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Crear Cuenta</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

                            {apiError && (
                                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                                    {apiError}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Nombre" id="nombre" type="text" placeholder="Ingresa tu/s nombre/s"
                                    value={formData.nombre} onChange={handleChange("nombre")}
                                    icon={<User className="w-4 h-4" />} error={errors.nombre} disabled={isLoading} />
                                <InputField label="Apellido" id="apellido" type="text" placeholder="Ingresa tu/s apellido/s"
                                    value={formData.apellido} onChange={handleChange("apellido")}
                                    icon={<User className="w-4 h-4" />} error={errors.apellido} disabled={isLoading} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="DUI" id="dui" type="text" placeholder="Ingresa tu DUI"
                                    value={formData.dui} onChange={handleChange("dui")}
                                    icon={<CreditCard className="w-4 h-4" />} error={errors.dui} disabled={isLoading} />
                                <InputField label="Edad" id="edad" type="text" placeholder="Ingresa tu edad"
                                    value={formData.edad} onChange={handleChange("edad")}
                                    icon={<Calendar className="w-4 h-4" />} error={errors.edad} disabled={isLoading} />
                            </div>

                            <InputField label="Genero" id="genero" type="text" placeholder="Ingresa tu genero"
                                value={formData.genero} onChange={handleChange("genero")}
                                icon={<Venus className="w-4 h-4" />} error={errors.genero} disabled={isLoading} />

                            <InputField label="Correo electrónico" id="correo" type="email" placeholder="Ingresa tu correo electrónico"
                                value={formData.correo} onChange={handleChange("correo")}
                                icon={<Mail className="w-4 h-4" />} error={errors.correo} disabled={isLoading} />

                            <InputField label="Contraseña" id="contrasena" type="password" placeholder="Ingresa tu contraseña"
                                value={formData.contrasena} onChange={handleChange("contrasena")}
                                icon={<Lock className="w-4 h-4" />} error={errors.contrasena} disabled={isLoading} />

                            <InputField label="Confirmación de Contraseña" id="confirmContrasena" type="password" placeholder="Confirma tu contraseña"
                                value={formData.confirmContrasena} onChange={handleChange("confirmContrasena")}
                                icon={<Lock className="w-4 h-4" />} error={errors.confirmContrasena} disabled={isLoading} />

                            {/* Reglas de contraseña, mediante la función passwordRules, cada cjeck se coloca en verde cuando se cumple la regla para que la contraseña sea válida. Si no es valida alguina regla, se queda de color gris. De lo contrario, si alguna regla se cumple, respectivamente se colocará en verde hasta que todas las validaciones sean correctas*/}
                            <div className="flex flex-col gap-1.5 px-1">
                                {passwordRules.map((rule) => {
                                    const passed = rule.test(formData.contrasena, formData.confirmContrasena);
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
                            <button type="submit" disabled={isLoading}
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
                            <p className="text-center text-xs text-gray-400">
                                ¿Ya tienes una cuenta?{" "}
                                <Link to="/admin/login" className="text-[#3B6FCA] font-medium hover:underline">
                                    Inicia sesión
                                </Link>
                            </p>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
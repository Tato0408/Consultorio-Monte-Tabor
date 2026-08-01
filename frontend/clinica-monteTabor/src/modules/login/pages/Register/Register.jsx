import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { User, Mail, Lock, CreditCard, Calendar, Venus, CheckCircle2, Circle, Camera } from "lucide-react";
import InputField from "../../../../components/ui/InputField";
import FooterLogin from "../../components/Footer";
import useRegisterAdmin from "../../hooks/useRegisterAdmin";
import { getMaxAdultBirthDate, validateAdultBirthDate, calculateAge } from "../../../../lib/validators";

const Register = () => {
  const { loading, error: apiError, register } = useRegisterAdmin();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    nombre: "", apellido: "", dui: "", birth_date: "",
    genero: "", correo: "", contrasena: "", confirmContrasena: "",
    imagen: null,       // archivo File
    imagenPreview: null // URL para previsualizar
  });

  // Edad calculada en vivo a partir de la fecha de nacimiento seleccionada
  const computedAge = calculateAge(formData.birth_date);

  const [errors, setErrors] = useState({});

  const passwordRules = [
    { id: "length", label: "La contraseña tiene más de 8 dígitos", test: (p) => p.length > 8 },
    { id: "upper", label: "Las contraseña contiene mayúsculas y minúsculas", test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
    { id: "number", label: "La contraseña incluye números", test: (p) => /[0-9]/.test(p) },
    { id: "special", label: "La contraseña incluye caracteres especiales", test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
    { id: "match", label: "Las contraseñas coinciden", test: (p, c) => p.length > 0 && p === c },
  ];

  /**
   * Actualiza el campo correspondiente del formulario usando el nombre del campo como clave,
   * limpiando automáticamente su error de validación en cuanto el usuario comienza a escribir.
   */
  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Maneja la selección de imagen y genera una preview local
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFormData((prev) => ({
      ...prev,
      imagen: file,
      imagenPreview: URL.createObjectURL(file),
    }));
  };

  const validate = () => {
    const e = {};
    if (!formData.nombre.trim()) e.nombre = "Requerido";
    if (!formData.apellido.trim()) e.apellido = "Requerido";

    if (!formData.dui.trim()) e.dui = "Requerido";
    else if (!/^\d{8}-\d$/.test(formData.dui)) e.dui = "Formato: 00000000-0";

    if (!formData.birth_date) e.birth_date = "Requerido";
    else {
      const adultCheck = validateAdultBirthDate(formData.birth_date);
      if (adultCheck !== true) e.birth_date = adultCheck;
    }

    if (!formData.genero.trim()) e.genero = "Requerido";

    if (!formData.correo.trim()) e.correo = "Requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo))
      e.correo = "Correo inválido: ejemplo@dominio.com";

    if (!formData.contrasena) e.contrasena = "Requerido";
    else if (
      formData.contrasena.length <= 8 ||
      !/[A-Z]/.test(formData.contrasena) ||
      !/[a-z]/.test(formData.contrasena) ||
      !/[0-9]/.test(formData.contrasena) ||
      !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.contrasena)
    ) e.contrasena = "La contraseña no cumple con los requisitos indicados";

    if (formData.contrasena !== formData.confirmContrasena)
      e.confirmContrasena = "Las contraseñas no coinciden";

    if (!formData.imagen) e.imagen = "La foto de perfil es requerida";

    return e;
  };

  const handleDuiChange = (e) => {
    // 1. Obtenemos el valor y quitamos cualquier cosa que no sea un número
    let value = e.target.value.replace(/[^0-9]/g, "");

    // 2. Si tiene más de 8 dígitos, insertamos el guion
    if (value.length > 8) {
      value = value.slice(0, 8) + "-" + value.slice(8, 9);
    }

    // 3. Actualizamos el estado
    setFormData((prev) => ({ ...prev, dui: value }));

    // 4. Limpiamos el error si el usuario escribe
    if (errors.dui) setErrors((prev) => ({ ...prev, dui: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Guarda extra por si dos clics llegan antes de que el botón refleje loading=true en el DOM
    if (loading) return;
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    await register(formData);
  };

  return (
    <div className="h-screen flex bg-white overflow-hidden">

      {/* ── Panel izquierdo ── */}
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

      {/* ── Panel derecho — formulario ── */}
      <div className="flex-1 flex flex-col justify-between px-8 sm:px-12 py-5 overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="w-full max-w-[480px]">

            {/* Logo + título */}
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

              {/* ── Selector de imagen de perfil ── */}
              <div className="flex flex-col items-center gap-2 mb-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  disabled={loading}
                  className="relative w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 hover:border-[#3B6FCA] transition-colors flex items-center justify-center overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {formData.imagenPreview ? (
                    <img
                      src={formData.imagenPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-[#3B6FCA] transition-colors">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                  {/* Overlay al hacer hover */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                    <span className="w-5 h-5 rounded-full bg-[#3B6FCA] flex items-center justify-center">
                      <span className="text-white text-xs font-bold">+</span>
                    </span>
                  </div>
                </button>
                {errors.imagen && (
                  <p className="text-xs text-red-500">{errors.imagen}</p>
                )}
              </div>

              {/* Nombre + Apellido */}
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Nombre" id="nombre" type="text" placeholder="Ingresa tu/s nombre/s"
                  value={formData.nombre} onChange={handleChange("nombre")}
                  icon={<User className="w-4 h-4" />} error={errors.nombre} disabled={loading} />
                <InputField label="Apellido" id="apellido" type="text" placeholder="Ingresa tu/s apellido/s"
                  value={formData.apellido} onChange={handleChange("apellido")}
                  icon={<User className="w-4 h-4" />} error={errors.apellido} disabled={loading} />
              </div>

              {/* DUI + Fecha de nacimiento */}
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="DUI"
                  id="dui"
                  type="text"
                  placeholder="00000000-0"
                  value={formData.dui}
                  onChange={handleDuiChange}
                  icon={<CreditCard className="w-4 h-4" />}
                  error={errors.dui}
                  disabled={loading}
                  maxLength={10}
                />
                <InputField label="Fecha de nacimiento" id="birth_date" type="date"
                  max={getMaxAdultBirthDate()}
                  value={formData.birth_date} onChange={handleChange("birth_date")}
                  icon={<Calendar className="w-4 h-4" />} error={errors.birth_date} disabled={loading} />
              </div>

              {/* Edad calculada en vivo a partir de la fecha elegida */}
              {formData.birth_date && computedAge !== null && (
                <p className="text-xs text-gray-500 -mt-2 px-1">
                  Edad: <span className="font-semibold text-gray-700">{computedAge} años</span>
                </p>
              )}

              {/* Género */}
              <InputField label="Género" id="genero" type="text" placeholder="Ingresa tu género"
                value={formData.genero} onChange={handleChange("genero")}
                icon={<Venus className="w-4 h-4" />} error={errors.genero} disabled={loading} />

              {/* Correo */}
              <InputField label="Correo electrónico" id="correo" type="email" placeholder="Ingresa tu correo electrónico"
                value={formData.correo} onChange={handleChange("correo")}
                icon={<Mail className="w-4 h-4" />} error={errors.correo} disabled={loading} />

              {/* Contraseña */}
              <InputField label="Contraseña" id="contrasena" type="password" placeholder="Ingresa tu contraseña"
                value={formData.contrasena} onChange={handleChange("contrasena")}
                icon={<Lock className="w-4 h-4" />} error={errors.contrasena} disabled={loading} />

              {/* Confirmación */}
              <InputField label="Confirmación de Contraseña" id="confirmContrasena" type="password" placeholder="Confirma tu contraseña"
                value={formData.confirmContrasena} onChange={handleChange("confirmContrasena")}
                icon={<Lock className="w-4 h-4" />} error={errors.confirmContrasena} disabled={loading} />

              {/* Reglas de contraseña */}
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

              {/* Botón submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#3B6FCA]/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Registrando...
                  </span>
                ) : "Regístrate"}
              </button>

            </form>
          </div>
        </div>

        <FooterLogin />
      </div>
    </div>
  );
};

export default Register;
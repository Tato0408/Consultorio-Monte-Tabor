import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { User, Plus, Loader2, Lock, Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { showSuccess, showError } from "@/lib/alerts";

const NurseFormModal = ({ isOpen, onClose, onSave, nurse }) => {
  const isEditMode = !!nurse;
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      last_name: "",
      phone: "",
      email: "",
      dui: "",
      birth_date: "",
      password: "",
      is_active: true,
    },
  });

  const passwordValue = watch("password", "");
  const isActiveValue = watch("is_active");

  const passwordValidations = {
    hasMinLength: passwordValue.length > 8,
    hasMixedCase: /[a-z]/.test(passwordValue) && /[A-Z]/.test(passwordValue),
    hasNumbers: /\d/.test(passwordValue),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(passwordValue),
  };
  const isPasswordValid = Object.values(passwordValidations).every(Boolean);

  useEffect(() => {
    if (!isOpen) return;

    if (nurse) {
      reset({
        name: nurse.name || "",
        last_name: nurse.last_name || "",
        phone: nurse.phone || "",
        email: nurse.email || "",
        dui: nurse.dui || "",
        birth_date: nurse.birth_date ? nurse.birth_date.split("T")[0] : "",
        password: "",
        is_active: nurse.is_active !== undefined ? nurse.is_active : true,
      });
      setImagePreview(nurse.img_url || null);
    } else {
      reset({
        name: "", last_name: "", phone: "", email: "",
        dui: "", birth_date: "", password: "", is_active: true,
      });
      setImagePreview(null);
    }

    setImageFile(null);
    setShowPassword(false);
  }, [nurse, isOpen, reset]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePhoneMask = (e) => {
    let digits = e.target.value.replace(/\D/g, "");
    if (digits.length > 8) digits = digits.slice(0, 8);
    const masked = digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
    setValue("phone", masked, { shouldValidate: true });
  };

  const handleDuiMask = (e) => {
    let digits = e.target.value.replace(/\D/g, "");
    if (digits.length > 9) digits = digits.slice(0, 9);
    const masked = digits.length > 8 ? `${digits.slice(0, 8)}-${digits.slice(8)}` : digits;
    setValue("dui", masked, { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    if (!isEditMode && !isPasswordValid) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("last_name", data.last_name);
    formData.append("phone", data.phone);
    formData.append("email", data.email);
    formData.append("dui", data.dui);
    formData.append("birth_date", data.birth_date);

    if (isEditMode) {
      formData.append("is_active", data.is_active);
    } else {
      formData.append("password", data.password);
    }

    if (imageFile) {
      formData.append("img_url", imageFile);
    }

    const result = await onSave(formData);
    setLoading(false);

    if (result?.success) {
      showSuccess("Enfermera guardada correctamente");
      onClose();
    } else {
      showError(result?.error || "Ocurrió un error al procesar el formulario");
    }
  };

  const ValidationRow = ({ checked, label }) => (
    <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${checked ? "text-green-600" : "text-gray-400"}`}>
      {checked
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
      <span>{label}</span>
    </div>
  );

  const inputClass = (hasError) =>
    `w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none transition-colors placeholder:text-gray-300 ${
      hasError
        ? "border-red-400 focus:border-red-500"
        : "border-gray-200 focus:border-blue-500"
    }`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] w-full max-w-[560px] p-8 flex flex-col items-center shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-150">

        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

        <div
          className="relative mb-6 group cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-24 h-24 rounded-full bg-[#F3F4F6] border border-gray-100 flex items-center justify-center overflow-hidden">
            {imagePreview
              ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              : <User className="w-10 h-10 text-blue-600" strokeWidth={1.5} />}
          </div>
          <div className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 shadow-md group-hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Nombres</label>
              <input
                type="text"
                placeholder="Ingrese los nombres"
                {...register("name", { required: "El nombre es requerido" })}
                className={inputClass(errors.name)}
              />
              {errors.name && <span className="text-[10px] text-red-500 font-medium px-1">{errors.name.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Apellidos</label>
              <input
                type="text"
                placeholder="Ingrese los apellidos"
                {...register("last_name", { required: "El apellido es requerido" })}
                className={inputClass(errors.last_name)}
              />
              {errors.last_name && <span className="text-[10px] text-red-500 font-medium px-1">{errors.last_name.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Teléfono</label>
              <input
                type="text"
                placeholder="0000-0000"
                {...register("phone", {
                  pattern: {
                    value: /^\d{4}-\d{4}$/,
                    message: "Formato de número de teléfono: XXXX-XXXX",
                  },
                })}
                onChange={handlePhoneMask}
                className={inputClass(errors.phone)}
              />
              {errors.phone && <span className="text-[10px] text-red-500 font-medium px-1">{errors.phone.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Correo electrónico</label>
              <input
                type="email"
                placeholder="Correo@gmail.com"
                {...register("email", {
                  required: "El correo es requerido",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Formato de correo electrónico: nombre@dominio.com",
                  },
                })}
                className={inputClass(errors.email)}
              />
              {errors.email && <span className="text-[10px] text-red-500 font-medium px-1">{errors.email.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">DUI</label>
              <input
                type="text"
                placeholder="00000000-0"
                {...register("dui", {
                  pattern: {
                    value: /^\d{8}-\d{1}$/,
                    message: "Formato de DUI: XXXXXXXX-X",
                  },
                })}
                onChange={handleDuiMask}
                className={inputClass(errors.dui)}
              />
              {errors.dui && <span className="text-[10px] text-red-500 font-medium px-1">{errors.dui.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Fecha de nacimiento</label>
              <input
                type="date"
                {...register("birth_date", { required: "La fecha de nacimiento es requerida" })}
                className={inputClass(errors.birth_date)}
              />
              {errors.birth_date && <span className="text-[10px] text-red-500 font-medium px-1">{errors.birth_date.message}</span>}
            </div>

            {/* Estado — solo en edición */}
            {isEditMode && (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-400">Estado de la cuenta</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setValue("is_active", true)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isActiveValue
                        ? "bg-green-50 text-green-700 border-green-200 shadow-sm"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Activo
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("is_active", false)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      !isActiveValue
                        ? "bg-red-50 text-red-700 border-red-200 shadow-sm"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Inactivo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Contraseña — solo en creación */}
          {!isEditMode && (
            <div className="flex flex-col gap-3 w-full border-t border-gray-100 pt-4 mt-2">
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-semibold text-gray-700">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu contraseña"
                    {...register("password", {
                      required: "La contraseña es requerida",
                      // La validación visual la manejan los ValidationRow,
                      // pero bloqueamos el submit si no está completa
                      validate: () =>
                        isPasswordValid || "La contraseña no cumple con los requisitos de seguridad",
                    })}
                    className="w-full pl-9 pr-10 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <span className="text-[10px] text-red-500 font-medium px-1">{errors.password.message}</span>
                )}
              </div>

              {/* Validaciones visuales en tiempo real */}
              <div className="flex flex-col gap-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <ValidationRow checked={passwordValidations.hasMinLength} label="La contraseña tiene más de 8 dígitos" />
                <ValidationRow checked={passwordValidations.hasMixedCase} label="La contraseña contiene mayúsculas y minúsculas" />
                <ValidationRow checked={passwordValidations.hasNumbers} label="La contraseña incluye números" />
                <ValidationRow checked={passwordValidations.hasSpecialChar} label="Las contraseñas incluyen caracteres especiales" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 mt-4 w-full">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="w-32 border border-blue-600 text-blue-600 font-bold py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-xs text-center disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-32 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm text-xs flex items-center justify-center gap-1 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NurseFormModal;
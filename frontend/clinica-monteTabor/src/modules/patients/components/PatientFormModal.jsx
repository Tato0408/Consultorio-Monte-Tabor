import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { User, Loader2, Lock, Eye, EyeOff, CheckCircle2, Circle, X } from "lucide-react";
import { showSuccess, showError } from "@/lib/alerts";
import { maskLettersOnly } from "@/lib/inputMasks";

// Un paciente no puede haber nacido en el futuro (a diferencia del personal, no hay edad mínima).
const TODAY_STR = new Date().toISOString().split("T")[0];

// Nombres legibles de cada campo, para el aviso que identifica qué campo falló al enviar
const FIELD_LABELS = {
  name: "Nombres",
  last_name: "Apellidos",
  phone: "Teléfono",
  email: "Correo electrónico",
  dui: "DUI",
  birth_date: "Fecha de nacimiento",
  gender: "Género",
  referred_by: "Referido por",
  password: "Contraseña",
};

const PatientFormModal = ({ isOpen, onClose, onSave, patient }) => {
  const isEditMode = !!patient;

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      gender: "Masculino",
      referred_by: "",
      password: "",
      is_active: true,
    },
  });

  const passwordValue = watch("password", "");
  const isActiveValue = watch("is_active");

  const passwordValidations = {
    hasMinLength: passwordValue.length >= 8,
    hasMixedCase: /[a-z]/.test(passwordValue) && /[A-Z]/.test(passwordValue),
    hasNumbers: /\d/.test(passwordValue),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(passwordValue),
  };
  const isPasswordValid = Object.values(passwordValidations).every(Boolean);

  useEffect(() => {
    if (!isOpen) return;

    if (patient) {
      reset({
        name: patient.name || "",
        last_name: patient.last_name || "",
        phone: patient.phone || "",
        email: patient.email || "",
        dui: patient.dui || "",
        birth_date: patient.birth_date ? patient.birth_date.split("T")[0] : "",
        gender: patient.gender || "Masculino",
        referred_by: patient.referred_by || "",
        password: "",
        is_active: patient.is_active !== undefined ? patient.is_active : true,
      });
    } else {
      reset({
        name: "", last_name: "", phone: "", email: "", dui: "",
        birth_date: "", gender: "Masculino", referred_by: "",
        password: "", is_active: true,
      });
    }

    setShowPassword(false);
  }, [patient, isOpen, reset]);

  // Mascara de solo letras (nombres, apellidos y referido). Igual que
  // handlePhoneMask y handleDuiMask, el onChange sobreescribe el del
  // register y dispara la validacion manualmente.
  const makeLettersMaskHandler = (field, max) => (e) =>
    setValue(field, maskLettersOnly(e.target.value, max), { shouldValidate: true });

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
    if (loading) return;
    if (!isEditMode && !isPasswordValid) return;

    setLoading(true);

    const payload = {
      name: data.name,
      last_name: data.last_name,
      phone: data.phone,
      email: data.email,
      dui: data.dui,
      birth_date: data.birth_date,
      gender: data.gender,
      referred_by: data.referred_by,
    };

    if (isEditMode) {
      payload.is_active = data.is_active;
    } else {
      payload.password = data.password;
    }

    const result = await onSave(payload);
    setLoading(false);

    if (result?.success) {
      showSuccess("Paciente guardado correctamente");
      onClose();
    } else {
      showError(result?.error || "Ocurrió un error al procesar el formulario");
    }
  };

  // Se dispara cuando el envio falla la validacion (campos vacios o con
  // formato invalido). Ademas del contorno rojo y el mensaje debajo de cada
  // input, avisa arriba a la derecha que campos hay que corregir.
  const onInvalid = (formErrors) => {
    const invalidFields = Object.keys(formErrors).map((key) => FIELD_LABELS[key] || key);
    showError(`Revisa este/estos campo(s): ${invalidFields.join(", ")}`);
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
      <div className="bg-white rounded-[28px] w-full max-w-2xl p-8 flex flex-col items-center shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">

        {/* Cierre */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-24 h-24 rounded-full bg-[#F3F4F6] border border-gray-100 flex items-center justify-center mb-6">
          <User className="w-10 h-10 text-blue-600" strokeWidth={1.5} />
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEditMode ? "Editar paciente" : "Agregar paciente"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="w-full flex flex-col gap-4">
          {/* El fieldset usa display:contents para desactivar de un solo golpe
              todos los inputs y botones que contiene durante el envio, sin
              alterar el layout. */}
          <fieldset disabled={loading} className="contents">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Nombres</label>
              <input
                type="text"
                placeholder="Ingrese los nombres"
                maxLength={50}
                {...register("name", { required: "El nombre es requerido" })}
                onChange={makeLettersMaskHandler("name", 50)}
                className={inputClass(errors.name)}
              />
              <div className="flex items-start justify-between gap-2">
                {errors.name && <span className="text-[10px] text-red-500 font-medium px-1">{errors.name.message}</span>}
                <span className="text-[10px] text-gray-400 ml-auto px-1">{(watch("name") || "").length}/50</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Apellidos</label>
              <input
                type="text"
                placeholder="Ingrese los apellidos"
                maxLength={50}
                {...register("last_name", { required: "El apellido es requerido" })}
                onChange={makeLettersMaskHandler("last_name", 50)}
                className={inputClass(errors.last_name)}
              />
              <div className="flex items-start justify-between gap-2">
                {errors.last_name && <span className="text-[10px] text-red-500 font-medium px-1">{errors.last_name.message}</span>}
                <span className="text-[10px] text-gray-400 ml-auto px-1">{(watch("last_name") || "").length}/50</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Teléfono</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0000-0000"
                maxLength={9}
                {...register("phone", {
                  required: "El teléfono es requerido",
                  pattern: {
                    value: /^\d{4}-\d{4}$/,
                    message: "Formato de número de teléfono: XXXX-XXXX",
                  },
                })}
                onChange={handlePhoneMask}
                className={inputClass(errors.phone)}
              />
              <div className="flex items-start justify-between gap-2">
                {errors.phone && <span className="text-[10px] text-red-500 font-medium px-1">{errors.phone.message}</span>}
                <span className="text-[10px] text-gray-400 ml-auto px-1">{(watch("phone") || "").length}/9</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Correo electrónico</label>
              <input
                type="email"
                placeholder="correo@gmail.com"
                maxLength={100}
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
              <label className="text-xs font-semibold text-gray-400">DUI <span className="font-normal text-gray-300">(opcional)</span></label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="00000000-0"
                maxLength={10}
                {...register("dui", {
                  // Opcional: hay pacientes menores de edad sin DUI. Solo se valida el
                  // formato cuando se escribe algo.
                  validate: (value) =>
                    !value || /^\d{8}-\d{1}$/.test(value) || "Formato de DUI: XXXXXXXX-X",
                })}
                onChange={handleDuiMask}
                className={inputClass(errors.dui)}
              />
              <div className="flex items-start justify-between gap-2">
                {errors.dui && <span className="text-[10px] text-red-500 font-medium px-1">{errors.dui.message}</span>}
                <span className="text-[10px] text-gray-400 ml-auto px-1">{(watch("dui") || "").length}/10</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Fecha de nacimiento</label>
              <input
                type="date"
                max={TODAY_STR}
                {...register("birth_date", {
                  required: "La fecha de nacimiento es requerida",
                  validate: (value) => !value || value <= TODAY_STR || "La fecha de nacimiento no puede ser futura",
                })}
                className={inputClass(errors.birth_date)}
              />
              {errors.birth_date && <span className="text-[10px] text-red-500 font-medium px-1">{errors.birth_date.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Género</label>
              <select
                {...register("gender", { required: "El género es requerido" })}
                className={inputClass(errors.gender)}
              >
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Referido por</label>
              <input
                type="text"
                placeholder="Opcional"
                maxLength={50}
                {...register("referred_by")}
                onChange={makeLettersMaskHandler("referred_by", 50)}
                className={inputClass(errors.referred_by)}
              />
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] text-gray-400 ml-auto px-1">{(watch("referred_by") || "").length}/50</span>
              </div>
            </div>

            {/* Estado: solo en edicion */}
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

          {/* Contraseña: solo en creacion */}
          {!isEditMode && (
            <div className="flex flex-col gap-3 w-full border-t border-gray-100 pt-4 mt-2">
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-semibold text-gray-700">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa la contraseña"
                    maxLength={100}
                    {...register("password", {
                      required: "La contraseña es requerida",
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

              <div className="flex flex-col gap-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <ValidationRow checked={passwordValidations.hasMinLength} label="La contraseña tiene al menos 8 caracteres" />
                <ValidationRow checked={passwordValidations.hasMixedCase} label="La contraseña contiene mayúsculas y minúsculas" />
                <ValidationRow checked={passwordValidations.hasNumbers} label="La contraseña incluye números" />
                <ValidationRow checked={passwordValidations.hasSpecialChar} label="La contraseña incluye caracteres especiales" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center mt-4 w-full">
            <button
              type="submit"
              disabled={loading}
              className="w-48 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm text-xs flex items-center justify-center gap-1 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Guardar
            </button>
          </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
};

export default PatientFormModal;

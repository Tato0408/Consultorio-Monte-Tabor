import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { User, Plus, X, Loader2, Lock, Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { showError } from "../../../lib/alerts";
import { getMaxAdultBirthDate, validateAdultBirthDate } from "../../../lib/validators";
import { maskLettersOnly } from "../../../lib/inputMasks";
import { useReceptionist } from "../hooks/useRecepcionist";

// Nombres legibles de cada campo, para el aviso que identifica qué campo falló al enviar
const FIELD_LABELS = {
  name: "Nombres",
  last_name: "Apellidos",
  phone: "Teléfono",
  email: "Correo electrónico",
  dui: "DUI",
  birth_date: "Fecha de nacimiento",
  password: "Contraseña",
};

const ReceptionistForm = ({
  isOpen,
  onClose,
  receptionist,
  refreshReceptionists,
}) => {
  //Desestructuramos las funciones que vamos a ocupar del hook
  const { createReceptionist, updateReceptionist } = useReceptionist();

  //Estado para controlar cuando se esta guardando la informacion
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  //Aqui guardamos la imagen seleccionada
  const [imageFile, setImageFile] = useState(null);

  //Estado para mostrar la vista previa de la imagen
  const [profilePreview, setProfilePreview] = useState("");
  //Estado para mostrar el aviso de "imagen requerida" cuando se envía el formulario sin foto
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef(null);

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
    hasMinLength: passwordValue.length >= 8,
    hasMixedCase: /[a-z]/.test(passwordValue) && /[A-Z]/.test(passwordValue),
    hasNumbers: /\d/.test(passwordValue),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(passwordValue),
  };
  const isPasswordValid = Object.values(passwordValidations).every(Boolean);

  //Si estamos editando cargamos los datos
  //Si estamos creando limpiamos el formulario
  useEffect(() => {
    if (receptionist && isOpen) {
      reset({
        name: receptionist.name || "",
        last_name: receptionist.last_name || "",
        phone: receptionist.phone || "",
        email: receptionist.email || "",
        dui: receptionist.dui || "",
        //Cortamos la fecha para que el input date la pueda leer
        birth_date: receptionist.birth_date ? receptionist.birth_date.split("T")[0] : "",
        //Por seguridad no cargamos la contraseña
        password: "",
        is_active: receptionist.is_active !== undefined ? receptionist.is_active : true,
      });
    } else if (!receptionist && isOpen) {
      reset({
        name: "",
        last_name: "",
        phone: "",
        email: "",
        dui: "",
        birth_date: "",
        password: "",
        is_active: true,
      });
    }

    //Limpiamos la imagen seleccionada
    setImageFile(null);
    setImageError("");
    setShowPassword(false);
  }, [receptionist, isOpen, reset]);

  //Actualizamos la vista previa de la imagen
  useEffect(() => {
    //Si no hay imagen nueva mostramos la actual
    if (!imageFile) {
      setProfilePreview(receptionist?.img_url || "");
      return;
    }

    //Creamos una url temporal para mostrar la imagen
    const objectUrl = URL.createObjectURL(imageFile);
    setProfilePreview(objectUrl);

    //Liberamos la memoria cuando cambie la imagen
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile, receptionist]);

  //Guarda la imagen seleccionada
  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setImageError("");
  };

  // Mascara de solo-letras (nombres/apellidos) — mismo patron que handlePhoneMask/handleDuiMask:
  // el onChange sobreescribe el del register y dispara la validacion manualmente.
  const makeLettersMaskHandler = (field, max) => (e) =>
    setValue(field, maskLettersOnly(e.target.value, max), { shouldValidate: true });

  // Mascara de telefono: solo digitos, formato XXXX-XXXX (misma logica que Pacientes/Enfermeras)
  const handlePhoneMask = (e) => {
    let digits = e.target.value.replace(/\D/g, "");
    if (digits.length > 8) digits = digits.slice(0, 8);
    const masked = digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
    setValue("phone", masked, { shouldValidate: true });
  };

  // Mascara de DUI: solo digitos, formato XXXXXXXX-X (misma logica que Pacientes/Enfermeras)
  const handleDuiMask = (e) => {
    let digits = e.target.value.replace(/\D/g, "");
    if (digits.length > 9) digits = digits.slice(0, 9);
    const masked = digits.length > 8 ? `${digits.slice(0, 8)}-${digits.slice(8)}` : digits;
    setValue("dui", masked, { shouldValidate: true });
  };

  //Se ejecuta cuando se envia el formulario
  const onSubmit = async (formValues) => {
    if (loading) return;
    // Al crear, no se permite enviar si la contraseña no cumple los requisitos de seguridad
    if (!receptionist && !isPasswordValid) return;

    // Al crear, la foto de perfil es obligatoria (el backend también lo exige); se avisa
    // aquí antes de mandar la petición
    if (!receptionist && !imageFile) {
      setImageError("La foto de perfil es requerida");
      showError("Revisa este/estos campo(s): Foto de perfil");
      return;
    }

    try {
      setLoading(true);

      //Creamos un FormData para enviar la informacion
      const data = new FormData();

      //Agregamos todos los campos al FormData
      Object.entries(formValues).forEach(([key, value]) => {
        //Si estamos editando y la contraseña esta vacia no la enviamos
        if (key === "password" && receptionist && !value) return;

        if (value !== undefined && value !== null) {
          data.append(key, value);
        }
      });

      //Si hay una imagen la agregamos
      if (imageFile) {
        data.append("receptionistImage", imageFile);
      }

      //Si existe un recepcionista actualizamos
      if (receptionist) {
        await updateReceptionist(receptionist._id, data);
      } else {
        //Si no existe creamos uno nuevo
        await createReceptionist(data);
      }

      //Actualizamos la tabla
      await refreshReceptionists();

      //Cerramos el modal indicando que si se guardo
      onClose(true);
    } catch (error) {
      console.error(error);

      showError(error.message || "No se pudo guardar el recepcionista.");
    } finally {
      //Quitamos el loading
      setLoading(false);
    }
  };

  // Se dispara cuando el envío falla la validación (campos vacíos o con formato inválido);
  // además del contorno rojo y el mensaje debajo de cada input, avisa arriba a la derecha
  // qué campo(s) específicos hay que corregir.
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

  //Si el modal esta cerrado no mostramos nada
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] w-full max-w-2xl p-8 flex flex-col items-center shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-150">

        {/* Cierre */}
        <button
          type="button"
          onClick={() => onClose(false)}
          disabled={loading}
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>

        {/* FOTO DE PERFIL */}
        <input type="file" ref={fileInputRef} onChange={handleImage} accept="image/*" className="hidden" />
        <div
          className={`relative mb-1.5 group ${loading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
          onClick={() => !loading && fileInputRef.current?.click()}
        >
          <div className={`w-24 h-24 rounded-full bg-[#F3F4F6] border flex items-center justify-center overflow-hidden ${imageError ? "border-red-400" : "border-gray-100"}`}>
            {profilePreview ? (
              <img src={profilePreview} alt="Recepcionista" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-blue-600" strokeWidth={1.5} />
            )}
          </div>
          <div className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 shadow-md group-hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
          </div>
        </div>
        {imageError && <span className="text-[10px] text-red-500 font-medium mb-2">{imageError}</span>}

        <h2 className="text-lg font-bold text-gray-900 mb-6 mt-1.5">
          {receptionist ? "Editar recepcionista" : "Agregar recepcionista"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="w-full flex flex-col gap-4">
          {/* fieldset con display:contents — desactiva todos los inputs/botones que contiene
              de un solo golpe durante el envío, sin alterar el layout */}
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
              {errors.name && <span className="text-[10px] text-red-500 font-medium px-1">{errors.name.message}</span>}
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
              {errors.last_name && <span className="text-[10px] text-red-500 font-medium px-1">{errors.last_name.message}</span>}
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
              {errors.phone && <span className="text-[10px] text-red-500 font-medium px-1">{errors.phone.message}</span>}
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
              <label className="text-xs font-semibold text-gray-400">DUI</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="00000000-0"
                maxLength={10}
                {...register("dui", {
                  required: "El DUI es requerido",
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
                max={getMaxAdultBirthDate()}
                {...register("birth_date", {
                  required: "La fecha de nacimiento es requerida",
                  validate: validateAdultBirthDate,
                })}
                className={inputClass(errors.birth_date)}
              />
              {errors.birth_date && <span className="text-[10px] text-red-500 font-medium px-1">{errors.birth_date.message}</span>}
            </div>

            {/* Estado — solo en edición */}
            {receptionist && (
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
          {!receptionist && (
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
              {receptionist ? "Actualizar" : "Guardar"}
            </button>
          </div>
          </fieldset>
        </form>

      </div>
    </div>
  );
};

export default ReceptionistForm;

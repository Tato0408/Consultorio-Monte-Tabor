import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { User, Plus, X, Loader2, Lock, Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { showError } from "../../../lib/alerts";
import { getMaxAdultBirthDate, validateAdultBirthDate } from "../../../lib/validators";
import { maskLettersOnly, maskAlnum } from "../../../lib/inputMasks";
import { useDoctors } from "../hooks/useDoctors";

// Nombres legibles de cada campo, para el aviso que identifica qué campo falló al enviar
const FIELD_LABELS = {
  name: "Nombres",
  last_name: "Apellidos",
  phone: "Teléfono",
  email: "Correo electrónico",
  dui: "DUI",
  birth_date: "Fecha de nacimiento",
  license_number: "Número de licencia",
  password: "Contraseña",
};

const DoctorForm = ({
  isOpen,
  onClose,
  doctor,
  refreshDoctors,
}) => {
  const { createDoctor, updateDoctor } = useDoctors();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [doctorImage, setDoctorImage] = useState(null);
  const [licenseImage, setLicenseImage] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [licensePreview, setLicensePreview] = useState("");
  // Muestran el aviso de imagen requerida cuando se envia el formulario sin
  // foto de perfil o sin documento de licencia.
  const [imageError, setImageError] = useState("");
  const [licenseImageError, setLicenseImageError] = useState("");
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
      dui: "",
      birth_date: "",
      gender: "Masculino",
      phone: "",
      email: "",
      license_number: "",
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

  // Carga los datos del doctor en el formulario al abrir el modal en modo
  // edicion, o limpia los campos si se trata de un registro nuevo.
  useEffect(() => {
    if (doctor && isOpen) {
      reset({
        name: doctor.name || "",
        last_name: doctor.last_name || "",
        dui: doctor.dui || "",
        // Formatear fecha a YYYY-MM-DD para el input HTML5
        birth_date: doctor.birth_date ? doctor.birth_date.split("T")[0] : "",
        gender: doctor.gender || "Masculino",
        phone: doctor.phone || "",
        email: doctor.email || "",
        license_number: doctor.license_number || "",
        // Se deja vacia al editar por seguridad
        password: "",
        is_active: doctor.is_active !== undefined ? doctor.is_active : true,
      });
    } else if (!doctor && isOpen) {
      reset({
        name: "",
        last_name: "",
        dui: "",
        birth_date: "",
        gender: "Masculino",
        phone: "",
        email: "",
        license_number: "",
        password: "",
        is_active: true,
      });
    }

    // Limpia los archivos seleccionados al abrir o cerrar el modal para que
    // no se queden guardados de una sesion anterior.
    setDoctorImage(null);
    setLicenseImage(null);
    setImageError("");
    setLicenseImageError("");
    setShowPassword(false);
  }, [doctor, isOpen, reset]);

  // Genera la url temporal de la vista previa de la foto de perfil. Si no
  // se selecciono una foto nueva, usa la que el doctor ya tiene en Cloudinary.
  useEffect(() => {
    if (!doctorImage) {
      setProfilePreview(doctor?.img_url || "");
      return;
    }

    const objectUrl = URL.createObjectURL(doctorImage);
    setProfilePreview(objectUrl);

    // Libera la url de la memoria del navegador cuando deja de usarse
    return () => URL.revokeObjectURL(objectUrl);
  }, [doctorImage, doctor]);

  // Mismo comportamiento que el efecto anterior, pero para la vista previa
  // del documento de licencia.
  useEffect(() => {
    if (!licenseImage) {
      setLicensePreview(doctor?.license_url || "");
      return;
    }

    const objectUrl = URL.createObjectURL(licenseImage);
    setLicensePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [licenseImage, doctor]);

  // Mascaras de solo letras (nombres y apellidos) y alfanumerica (numero de
  // licencia). Igual que handlePhoneMask y handleDuiMask, el onChange
  // sobreescribe el del register y dispara la validacion manualmente.
  const makeLettersMaskHandler = (field, max) => (e) =>
    setValue(field, maskLettersOnly(e.target.value, max), { shouldValidate: true });

  const handleLicenseMask = (e) =>
    setValue("license_number", maskAlnum(e.target.value, 30), { shouldValidate: true });

  // Mascara de telefono: solo digitos, formato XXXX-XXXX (misma logica que
  // en Pacientes y Enfermeras).
  const handlePhoneMask = (e) => {
    let digits = e.target.value.replace(/\D/g, "");
    if (digits.length > 8) digits = digits.slice(0, 8);
    const masked = digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
    setValue("phone", masked, { shouldValidate: true });
  };

  // Mascara de DUI: solo digitos, formato XXXXXXXX-X (misma logica que en
  // Pacientes y Enfermeras).
  const handleDuiMask = (e) => {
    let digits = e.target.value.replace(/\D/g, "");
    if (digits.length > 9) digits = digits.slice(0, 9);
    const masked = digits.length > 8 ? `${digits.slice(0, 8)}-${digits.slice(8)}` : digits;
    setValue("dui", masked, { shouldValidate: true });
  };

  // Procesa y envia el formulario al guardar o editar un doctor.
  const onSubmit = async (formValues) => {
    if (loading) return;
    // Al crear, no se permite enviar si la contraseña no cumple los
    // requisitos de seguridad.
    if (!doctor && !isPasswordValid) return;

    // Al crear, la foto de perfil y el documento de licencia son
    // obligatorios (el backend tambien lo exige). Se avisa aqui antes de
    // mandar la peticion.
    if (!doctor) {
      const missingImages = [];
      if (!doctorImage) missingImages.push("Foto de perfil");
      if (!licenseImage) missingImages.push("Documento de licencia");

      if (missingImages.length > 0) {
        setImageError(!doctorImage ? "La foto de perfil es requerida" : "");
        setLicenseImageError(!licenseImage ? "El documento de licencia es requerido" : "");
        showError(`Revisa este/estos campo(s): ${missingImages.join(", ")}`);
        return;
      }
    }

    try {
      setLoading(true);

      // FormData es obligatorio para mandar los campos de texto y los
      // archivos en la misma peticion.
      const data = new FormData();

      Object.entries(formValues).forEach(([key, value]) => {
        // Al editar, no se envia la contraseña si se dejo en blanco
        if (key === "password" && doctor && !value) return;

        if (value !== undefined && value !== null) {
          data.append(key, value);
        }
      });

      if (doctorImage) {
        data.append("doctorImage", doctorImage);
      }

      if (licenseImage) {
        data.append("licenseImage", licenseImage);
      }

      if (doctor) {
        await updateDoctor(doctor._id, data);
      } else {
        await createDoctor(data);
      }

      await refreshDoctors();
      // El true indica que si se guardo, para que el llamador muestre el
      // mensaje de exito correspondiente.
      onClose(true);
    } catch (error) {
      console.error(error);
      showError(error.message || "No se pudo guardar el doctor.");
    } finally {
      setLoading(false);
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
      <div className="bg-white rounded-[28px] w-full max-w-4xl p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">

        {/* Cierre */}
        <button
          type="button"
          onClick={() => onClose(false)}
          disabled={loading}
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado centrado: foto y titulo */}
        <div className="flex flex-col items-center mb-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              setDoctorImage(e.target.files[0]);
              setImageError("");
            }}
            accept="image/*"
            className="hidden"
          />
          <div
            className={`relative mb-1.5 group ${loading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
            onClick={() => !loading && fileInputRef.current?.click()}
          >
            <div className={`w-20 h-20 rounded-full bg-[#F3F4F6] border flex items-center justify-center overflow-hidden ${imageError ? "border-red-400" : "border-gray-100"}`}>
              {profilePreview ? (
                <img src={profilePreview} alt="Doctor" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
              )}
            </div>
            <div className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 shadow-md group-hover:bg-blue-700 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </div>
          </div>
          {imageError && <span className="text-[10px] text-red-500 font-medium mb-2">{imageError}</span>}

          <h2 className="text-lg font-bold text-gray-900 mt-2.5">
            {doctor ? "Editar doctor" : "Agregar doctor"}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="w-full">
          {/* El fieldset usa display:contents para desactivar de un solo golpe
              todos los inputs, selects y botones que contiene durante el
              envio, sin alterar el layout de grid. */}
          <fieldset disabled={loading} className="contents">
          {/* Cuerpo horizontal: datos a la izquierda, licencia y contraseña a la derecha */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* IZQUIERDA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
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
                <div className="flex items-start justify-between gap-2">
                  {errors.dui && <span className="text-[10px] text-red-500 font-medium px-1">{errors.dui.message}</span>}
                  <span className="text-[10px] text-gray-400 ml-auto px-1">{(watch("dui") || "").length}/10</span>
                </div>
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

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400">Género</label>
                <select {...register("gender")} className={inputClass(errors.gender)}>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400">Número de licencia</label>
                <input
                  type="text"
                  placeholder="Ingrese el número de licencia"
                  maxLength={30}
                  {...register("license_number", { required: "El número de licencia es requerido" })}
                  onChange={handleLicenseMask}
                  className={inputClass(errors.license_number)}
                />
                <div className="flex items-start justify-between gap-2">
                  {errors.license_number && <span className="text-[10px] text-red-500 font-medium px-1">{errors.license_number.message}</span>}
                  <span className="text-[10px] text-gray-400 ml-auto px-1">{(watch("license_number") || "").length}/30</span>
                </div>
              </div>

              {/* Estado: solo en edicion */}
              {doctor && (
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

            {/* DERECHA */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-gray-400">Documento de licencia</label>
                <div className={`relative border rounded-xl h-40 flex items-center justify-center bg-gray-50/50 overflow-hidden ${licenseImageError ? "border-red-400" : "border-gray-200"}`}>
                  {licensePreview ? (
                    <>
                      <img src={licensePreview} className="w-full h-full object-cover" alt="Licencia" />
                      <label className="absolute bottom-2 right-2 bg-blue-600 text-white rounded-full p-2 cursor-pointer shadow-md hover:bg-blue-700 transition-colors">
                        <Plus size={16} />
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={(e) => {
                            setLicenseImage(e.target.files[0]);
                            setLicenseImageError("");
                          }}
                        />
                      </label>
                    </>
                  ) : (
                    <label className="text-blue-600 text-xs font-semibold cursor-pointer">
                      Subir documento de licencia
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => {
                          setLicenseImage(e.target.files[0]);
                          setLicenseImageError("");
                        }}
                      />
                    </label>
                  )}
                </div>
                {licenseImageError && <span className="text-[10px] text-red-500 font-medium px-1">{licenseImageError}</span>}
              </div>

              {/* Contraseña: solo en creacion */}
              {!doctor && (
                <div className="flex flex-col gap-3 w-full border-t border-gray-100 pt-4 mt-1">
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
            </div>
          </div>

          <div className="flex items-center justify-center mt-6 w-full">
            <button
              type="submit"
              disabled={loading}
              className="w-48 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm text-xs flex items-center justify-center gap-1 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {doctor ? "Guardar cambios" : "Guardar"}
            </button>
          </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
};

export default DoctorForm;

import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { User, Plus, X, Loader2, Lock, Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { showError } from "../../../lib/alerts";
import { getMaxAdultBirthDate, validateAdultBirthDate } from "../../../lib/validators";
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
  //Desestructura las funciones para crear y actualizar que vienen del custom hook
  const { createDoctor, updateDoctor } = useDoctors();

  //useState para manejar el loading de la peticion del formulario
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  //useState para guardar el archivo binario de la imagen del doctor
  const [doctorImage, setDoctorImage] = useState(null);
  //useState para guardar el archivo binario de la imagen de la licencia
  const [licenseImage, setLicenseImage] = useState(null);
  //useState para manejar las rutas de las previsualizaciones en la vista
  const [profilePreview, setProfilePreview] = useState("");
  const [licensePreview, setLicensePreview] = useState("");
  //useState para mostrar el aviso de "imagen requerida" cuando se envía el formulario sin foto
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

  //1. Cargar datos del doctor al editar
  //useEffect sirve para cargar los datos en los inputs de forma automatica al abrir el modal
  useEffect(() => {
    //Si viene un doctor por los parametros y el modal esta abierto carga los datos para editar
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
        password: "", // Se deja vacío al editar por seguridad
        is_active: doctor.is_active !== undefined ? doctor.is_active : true,
      });
    } else if (!doctor && isOpen) {
      // Limpiar si es un doctor nuevo
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

    // Limpiar archivos seleccionados al abrir/cerrar modal para que no se queden guardados
    setDoctorImage(null);
    setLicenseImage(null);
    setImageError("");
    setLicenseImageError("");
    setShowPassword(false);
  }, [doctor, isOpen, reset]); //Se dispara de nuevo si cambia el doctor o el estado de apertura

  //2.previsualizacion de imagenes
  //useEffect para generar la url temporal de la foto de perfil del doctor
  useEffect(() => {
    //Si el usuario no ha seleccionado ninguna foto nueva
    if (!doctorImage) {
      //Pone por defecto la url de la imagen que ya tiene guardada el doctor en cloudinary
      setProfilePreview(doctor?.img_url || "");
      return;
    }

    //Crea una url local y segura del archivo binario cargado desde la computadora
    const objectUrl = URL.createObjectURL(doctorImage);
    setProfilePreview(objectUrl);

    //El return limpia y remueve la url de la memoria del navegador para que no se sature
    return () => URL.revokeObjectURL(objectUrl);
  }, [doctorImage, doctor]);

  useEffect(() => {
    if (!licenseImage) {
      setLicensePreview(doctor?.license_url || "");
      return;
    }

    const objectUrl = URL.createObjectURL(licenseImage);
    setLicensePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [licenseImage, doctor]);

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

  //Funcion asincrona que procesa y envia el formulario al dar click en guardar/editar
  const onSubmit = async (formValues) => {
    if (loading) return;
    // Al crear, no se permite enviar si la contraseña no cumple los requisitos de seguridad
    if (!doctor && !isPasswordValid) return;

    // Al crear, la foto de perfil y el documento de licencia son obligatorios (el backend
    // también lo exige); se avisa aquí antes de mandar la petición
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

    //El try sirve para capturar cualquier error que ocurra durante la peticion api
    try {
      setLoading(true);

      //Instancia el objeto FormData que es obligatorio para mandar textos y archivos juntos
      const data = new FormData();

      //Recorre las propiedades clave y valor que estan dentro de nuestro objeto formValues
      Object.entries(formValues).forEach(([key, value]) => {
        // Al editar, no enviamos la contraseña si se dejó en blanco
        if (key === "password" && doctor && !value) return;

        //Si el valor tiene contenido lo mete dentro del FormData compilado
        if (value !== undefined && value !== null) {
          data.append(key, value);
        }
      });

      //Si el usuario selecciono un archivo binario nuevo de imagen, lo añade al FormData
      if (doctorImage) {
        data.append("doctorImage", doctorImage);
      }

      //Si el usuario selecciono un archivo binario nuevo de licencia, lo añade al FormData
      if (licenseImage) {
        data.append("licenseImage", licenseImage);
      }

      //Evalua si existe el objeto doctor para decidir si va a actualizar o a crear uno nuevo
      if (doctor) {
        //Manda a llamar la funcion updateDoctor pasandole el id unico y los datos del formulario
        await updateDoctor(doctor._id, data);
      } else {
        //Manda a llamar la funcion createDoctor enviando el objeto FormData limpio
        await createDoctor(data);
      }

      //Vuelve a mandar a llamar a la funcion para refrescar la tabla de la vista principal
      await refreshDoctors();
      //Cierra el modal indicando que sí se guardó, para que solo entonces se muestre el mensaje de éxito
      onClose(true);
    } catch (error) {
      console.error(error);
      //Muestra la alerta de error indicando que no se pudo guardar el registro
      showError(error.message || "No se pudo guardar el doctor.");
    } finally {
      //El finally se ejecuta siempre al terminar y cambia el loading a false para activar los botones
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

  //Si isOpen es falso corta la ejecucion de la funcion y devuelve null para ocultar el formulario
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] w-full max-w-4xl p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-150">

        {/* Cierre */}
        <button
          type="button"
          onClick={() => onClose(false)}
          disabled={loading}
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado centrado: foto + titulo */}
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
          {/* fieldset con display:contents — desactiva todos los inputs/selects/botones que
              contiene de un solo golpe durante el envío, sin alterar el layout de grid */}
          <fieldset disabled={loading} className="contents">
          {/* Cuerpo horizontal: datos a la izquierda, licencia/contraseña a la derecha */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* IZQUIERDA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
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
                  {...register("license_number", { required: "El número de licencia es requerido" })}
                  className={inputClass(errors.license_number)}
                />
                {errors.license_number && <span className="text-[10px] text-red-500 font-medium px-1">{errors.license_number.message}</span>}
              </div>

              {/* Estado — solo en edición */}
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

              {/* Contraseña — solo en creación */}
              {!doctor && (
                <div className="flex flex-col gap-3 w-full border-t border-gray-100 pt-4 mt-1">
                  <div className="flex flex-col gap-1.5 relative">
                    <label className="text-xs font-semibold text-gray-700">Contraseña</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Ingresa la contraseña"
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

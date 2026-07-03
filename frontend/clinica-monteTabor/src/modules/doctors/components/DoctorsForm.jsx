import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { showError } from "../../../lib/alerts";
import { useDoctors } from "../hooks/useDoctors";

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
  //useState para guardar el archivo binario de la imagen del doctor
  const [doctorImage, setDoctorImage] = useState(null);
  //useState para guardar el archivo binario de la imagen de la licencia
  const [licenseImage, setLicenseImage] = useState(null);

  //useState con el objeto de todos los campos que se van a mandar en el body
  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    dui: "",
    birth_date: "",
    gender: "Masculino",
    phone: "",
    email: "",
    license_number: "",
    password: "",
  });

  //useState para manejar las rutas de las previsualizaciones en la vista
  const [profilePreview, setProfilePreview] = useState("");
  const [licensePreview, setLicensePreview] = useState("");

  //1. Cargar datos del doctor al editar
  //useEffect sirve para cargar los datos en los inputs de forma automatica al abrir el modal
  useEffect(() => {
    //Si viene un doctor por los parametros y el modal esta abierto carga los datos para editar
    if (doctor && isOpen) {
      setFormData({
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
      });
    } else if (!doctor && isOpen) {
      // Limpiar si es un doctor nuevo
      setFormData({
        name: "",
        last_name: "",
        dui: "",
        birth_date: "",
        gender: "Masculino",
        phone: "",
        email: "",
        license_number: "",
        password: "",
      });
    }

    // Limpiar archivos seleccionados al abrir/cerrar modal para que no se queden guardados
    setDoctorImage(null);
    setLicenseImage(null);
  }, [doctor, isOpen]); //Se dispara de nuevo si cambia el doctor o el estado de apertura

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

  // 3.manejadoresd e eventos
  //Funcion para capturar los cambios escritos en cualquiera de los inputs de texto
  const handleChange = (e) => {
    //Clona el objeto formData original y le actualiza la propiedad dinamicamente usando su name
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  //Funcion asincrona que procesa y envia el formulario al dar click en guardar/editar
  const handleSubmit = async (e) => {
    //Evita que la pagina se recargue por completo al enviar el formulario
    e.preventDefault();

    //El try sirve para capturar cualquier error que ocurra durante la peticion api
    try {
      setLoading(true);

      //Instancia el objeto FormData que es obligatorio para mandar textos y archivos juntos
      const data = new FormData();

      //Recorre las propiedades clave y valor que estan dentro de nuestro objeto formData
      Object.entries(formData).forEach(([key, value]) => {
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
      //Cierra el modal del formulario por completo
      onClose();
    } catch (error) {
      console.error(error);
      //Muestra la alerta de error indicando que no se pudo guardar el registro
      showError(
        "Error",
        error.message || "No se pudo guardar el doctor."
      );
    } finally {
      //El finally se ejecuta siempre al terminar y cambia el loading a false para activar los botones
      setLoading(false);
    }
  };

  //Si isOpen es falso corta la ejecucion de la funcion y devuelve null para ocultar el formulario
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl p-8">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">
            {doctor ? "Editar Doctor" : "Agregar Doctor"}
          </h2>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-8">

            {/* IZQUIERDA */}
            <div>

              {/* FOTO */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border">
                    {profilePreview ? (
                      <img
                        src={profilePreview}
                        alt="Doctor"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        Sin foto
                      </div>
                    )}
                  </div>

                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer shadow-md">
                    <Plus size={18} />
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => setDoctorImage(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input name="name" value={formData.name} onChange={handleChange} placeholder="Nombres" className="border p-2 rounded" />
                <input name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Apellidos" className="border p-2 rounded" />
                <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Teléfono" className="border p-2 rounded" />
                <input name="email" value={formData.email} onChange={handleChange} placeholder="Correo" className="border p-2 rounded" />

                <select name="gender" value={formData.gender} onChange={handleChange} className="border p-2 rounded">
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>

                <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="border p-2 rounded" />

                {!doctor && (
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Contraseña"
                    className="border p-2 rounded col-span-2"
                  />
                )}
              </div>
            </div>

            {/* DERECHA */}
            <div>
              <input name="dui" value={formData.dui} onChange={handleChange} placeholder="DUI" className="border p-2 rounded w-full mb-2" />
              <input name="license_number" value={formData.license_number} onChange={handleChange} placeholder="Licencia" className="border p-2 rounded w-full mb-4" />

              <div className="relative border rounded-xl h-72 flex items-center justify-center bg-slate-50 overflow-hidden">
                {licensePreview ? (
                  <>
                    <img src={licensePreview} className="w-full h-full object-cover" alt="Licencia" />
                    <label className="absolute bottom-2 right-2 bg-blue-600 text-white rounded-full p-2 cursor-pointer shadow-md">
                      <Plus size={18} />
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => setLicenseImage(e.target.files[0])}
                      />
                    </label>
                  </>
                ) : (
                  <label className="text-blue-600 cursor-pointer">
                    Subir licencia
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => setLicenseImage(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </div>

          </div>

          {/* BOTONES */}
          <div className="flex justify-end gap-4 mt-8">
            <button type="button" onClick={onClose} className="border px-6 py-2 rounded">
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded"
            >
              {loading ? "Guardando..." : doctor ? "Editar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorForm;
import React, { useEffect, useState } from "react";
import { User, Plus, X } from "lucide-react";
import { showError } from "../../../lib/alerts";
import { useReceptionist } from "../hooks/useRecepcionist";

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

  //Aqui guardamos la imagen seleccionada
  const [imageFile, setImageFile] = useState(null);

  //Estado donde se guardan los datos del formulario
  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    phone: "",
    email: "",
    dui: "",
    birth_date: "",
    password: "",
  });

  //Estado para mostrar la vista previa de la imagen
  const [profilePreview, setProfilePreview] = useState("");

  //Si estamos editando cargamos los datos
  //Si estamos creando limpiamos el formulario
  useEffect(() => {
    if (receptionist && isOpen) {
      setFormData({
        name: receptionist.name || "",
        last_name: receptionist.last_name || "",
        phone: receptionist.phone || "",
        email: receptionist.email || "",
        dui: receptionist.dui || "",
        //Cortamos la fecha para que el input date la pueda leer
        birth_date: receptionist.birth_date ? receptionist.birth_date.split("T")[0] : "",
        //Por seguridad no cargamos la contraseña
        password: "",
      });
    } else if (!receptionist && isOpen) {
      setFormData({
        name: "",
        last_name: "",
        phone: "",
        email: "",
        dui: "",
        birth_date: "",
        password: "",
      });
    }

    //Limpiamos la imagen seleccionada
    setImageFile(null);
  }, [receptionist, isOpen]);

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

  //Si el modal esta cerrado no mostramos nada
  if (!isOpen) return null;

  //Actualiza los valores de los inputs
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  //Guarda la imagen seleccionada
  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
  };

  //Se ejecuta cuando se envia el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      //Creamos un FormData para enviar la informacion
      const data = new FormData();

      //Agregamos todos los campos al FormData
      Object.entries(formData).forEach(([key, value]) => {
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

      showError(
        "Error",
        error.message || "No se pudo guardar el recepcionista."
      );
    } finally {
      //Quitamos el loading
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl p-8">

        {/* Encabezado del formulario */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">
            {receptionist ? "Editar Recepcionista" : "Agregar Recepcionista"}
          </h2>

          <button onClick={() => onClose(false)}>
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-8">

            {/* Lado izquierdo con los datos */}
            <div>
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border">
                    {profilePreview ? (
                      <img
                        src={profilePreview}
                        alt="Recepcionista"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={50} className="text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Boton para seleccionar una imagen */}
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer shadow-md">
                    <Plus size={18} />
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImage}
                    />
                  </label>
                </div>
              </div>

              {/* Inputs del formulario */}
              <div className="grid grid-cols-2 gap-4">
                <input name="name" value={formData.name} onChange={handleChange} placeholder="Nombres" className="border p-2 rounded" />
                <input name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Apellidos" className="border p-2 rounded" />
                <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Teléfono" className="border p-2 rounded" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Correo" className="border p-2 rounded" />
                <input name="dui" value={formData.dui} onChange={handleChange} placeholder="DUI" className="border p-2 rounded" />

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Fecha de nacimiento
                  </label>

                  <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    className="border p-2 rounded w-full"
                  />
                </div>

                {/* La contraseña solo aparece cuando se crea un recepcionista */}
                {!receptionist && (
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

            {/* Lado derecho con la vista previa */}
            <div className="flex items-center justify-center">
              <div className="w-full h-full rounded-2xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 p-4">
                <div className="text-center">
                  {profilePreview ? (
                    <img
                      src={profilePreview}
                      alt="Preview"
                      className="w-60 h-60 rounded-xl object-cover mx-auto shadow"
                    />
                  ) : (
                    <>
                      <User size={70} className="mx-auto text-slate-400 mb-3" />
                      <p className="text-slate-500">Vista previa</p>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Botones del formulario */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="border px-6 py-2 rounded hover:bg-slate-100"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {loading ? "Guardando..." : receptionist ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default ReceptionistForm;
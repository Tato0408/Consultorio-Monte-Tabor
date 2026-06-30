import React, {
  useEffect,
  useState,
} from "react";

import {
  User,
  Plus,
  X,
} from "lucide-react";

import { showError } from "../../../lib/alerts";
import { useReceptionist } from "../hooks/useRecepcionist";

const ReceptionistForm = ({
  isOpen,
  onClose,
  receptionist,
  refreshReceptionists,
}) => {
  const {
    createReceptionist,
    updateReceptionist,
  } = useReceptionist();

  const [loading, setLoading] =
    useState(false);

  const [imageFile, setImageFile] =
    useState(null);

  const [formData, setFormData] =
    useState({
      name: "",
      last_name: "",
      phone: "",
      email: "",
      dui: "",
      birth_date: "",
      password: "",
    });

  useEffect(() => {
    if (receptionist) {
      setFormData({
        name:
          receptionist.name || "",
        last_name:
          receptionist.last_name ||
          "",
        phone:
          receptionist.phone || "",
        email:
          receptionist.email || "",
        dui:
          receptionist.dui || "",
    birth_date: 
          receptionist?.birth_date || "",
        password: "",
      });
    } else {
      setFormData({
        name: "",
        last_name: "",
        phone: "",
        email: "",
        dui: "",
        birth_date: "",
        password: "",
      });

      setImageFile(null);
    }
  }, [receptionist]);

  useEffect(() => {
    return () => {
      if (imageFile) {
        URL.revokeObjectURL(
          URL.createObjectURL(imageFile)
        );
      }
    };
  }, [imageFile]);

  if (!isOpen) return null;

  const profilePreview = imageFile
    ? URL.createObjectURL(imageFile)
    : receptionist?.img_url;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleImage = (e) => {
    const file =
      e.target.files[0];

    if (!file) return;

    setImageFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const data =
        new FormData();

      Object.entries(formData).forEach(
        ([key, value]) => {
          if (
            value !== undefined &&
            value !== null
          ) {
            data.append(key, value);
          }
        }
      );

      if (imageFile) {
        data.append(
          "receptionistImage",
          imageFile
        );
      }

      if (receptionist) {
        await updateReceptionist(
          receptionist._id,
          data
        );
      } else {
        await createReceptionist(
          data
        );
      }

      await refreshReceptionists();

      onClose();
    } catch (error) {
      console.error(error);

      showError(
        "Error",
        error.message ||
          "No se pudo guardar el recepcionista."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">

      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl p-8">

        {/* HEADER */}

        <div className="flex justify-between items-center mb-8">

          <h2 className="text-2xl font-bold">
            {receptionist
              ? "Editar Recepcionista"
              : "Agregar Recepcionista"}
          </h2>

          <button onClick={onClose}>
            <X />
          </button>

        </div>

        <form onSubmit={handleSubmit}>

          <div className="grid grid-cols-2 gap-8">

            {/* IZQUIERDA */}

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

                        <User
                          size={50}
                          className="text-slate-400"
                        />

                      </div>
                    )}

                  </div>

                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer shadow-md">

                    <Plus size={18} />

                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={
                        handleImage
                      }
                    />

                  </label>

                </div>

              </div>

              <div className="grid grid-cols-2 gap-4">

                <input
                  name="name"
                  value={
                    formData.name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Nombres"
                  className="border p-2 rounded"
                />

                <input
                  name="last_name"
                  value={
                    formData.last_name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Apellidos"
                  className="border p-2 rounded"
                />

                <input
                  name="phone"
                  value={
                    formData.phone
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Teléfono"
                  className="border p-2 rounded"
                />

                <input
                  type="email"
                  name="email"
                  value={
                    formData.email
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Correo"
                  className="border p-2 rounded"
                />
                                <input
                  name="dui"
                  value={
                    formData.dui
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="DUI"
                  className="border p-2 rounded"
                />

              <div>
  <label className="block text-sm text-gray-600 mb-2">
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

                {!receptionist && (
                  <input
                    type="password"
                    name="password"
                    value={
                      formData.password
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Contraseña"
                    className="border p-2 rounded col-span-2"
                  />
                )}

              </div>

            </div>

            {/* DERECHA */}

            <div className="flex items-center justify-center">

              <div className="w-full h-full rounded-2xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-50">

                <div className="text-center">

                  {profilePreview ? (
                    <img
                      src={profilePreview}
                      alt="Preview"
                      className="w-60 h-60 rounded-xl object-cover mx-auto"
                    />
                  ) : (
                    <>
                      <User
                        size={70}
                        className="mx-auto text-slate-400 mb-3"
                      />

                      <p className="text-slate-500">
                        Vista previa
                      </p>
                    </>
                  )}

                </div>

              </div>

            </div>

          </div>

          {/* BOTONES */}

          <div className="flex justify-end gap-4 mt-8">

            <button
              type="button"
              onClick={onClose}
              className="border px-6 py-2 rounded hover:bg-slate-100"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {loading
                ? "Guardando..."
                : receptionist
                ? "Actualizar"
                : "Guardar"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
};

export default ReceptionistForm;
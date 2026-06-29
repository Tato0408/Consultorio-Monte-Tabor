import React, { useState, useEffect } from "react";
import { User, Plus, X } from "lucide-react";

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

  const [loading, setLoading] = useState(false);

  const [imagePreview, setImagePreview] =
    useState("");

  const [imageFile, setImageFile] =
    useState(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    dui: "",
    age: "",
  });

  useEffect(() => {
    if (receptionist) {
      setForm({
        firstName:
          receptionist.firstName || "",
        lastName:
          receptionist.lastName || "",
        phone:
          receptionist.phone || "",
        email:
          receptionist.email || "",
        dui:
          receptionist.dui || "",
        age:
          receptionist.age || "",
      });

      setImagePreview(
        receptionist.image || ""
      );
    } else {
      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        dui: "",
        age: "",
      });

      setImagePreview("");
      setImageFile(null);
    }
  }, [receptionist]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleImage = (e) => {
    const file =
      e.target.files[0];

    if (!file) return;

    setImageFile(file);

    setImagePreview(
      URL.createObjectURL(file)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.firstName ||
      !form.lastName ||
      !form.phone ||
      !form.email ||
      !form.dui ||
      !form.age
    ) {
      return showError(
        "Campos incompletos",
        "Completa toda la información."
      );
    }

    try {
      setLoading(true);

      const data =
        new FormData();

      data.append(
        "firstName",
        form.firstName
      );

      data.append(
        "lastName",
        form.lastName
      );

      data.append(
        "phone",
        form.phone
      );

      data.append(
        "email",
        form.email
      );

      data.append(
        "dui",
        form.dui
      );

      data.append(
        "age",
        form.age
      );

      if (imageFile) {
        data.append(
          "image",
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
      showError(
        "Error",
        error.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">

      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl p-8">

        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-gray-400 hover:text-black"
        >
          <X size={22} />
        </button>

        <form onSubmit={handleSubmit}>

          {/* FOTO */}

          <div className="flex justify-center mb-8">

            <div className="relative">

              <label
                htmlFor="image"
                className="cursor-pointer"
              >

                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt=""
                    className="w-24 h-24 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                    <User
                      size={46}
                      className="text-blue-600"
                    />
                  </div>
                )}

                <div className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg">
                  <Plus size={18} />
                </div>

              </label>

              <input
                id="image"
                type="file"
                hidden
                accept="image/*"
                onChange={handleImage}
              />

            </div>

          </div>

          <div className="grid grid-cols-2 gap-6">
                      {/* NOMBRES */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Nombres
              </label>

              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Ingrese los nombres"
                className="w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

            {/* APELLIDOS */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Apellidos
              </label>

              <input
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Ingrese los apellidos"
                className="w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

            {/* TELEFONO */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Teléfono
              </label>

              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+503"
                className="w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Correo electrónico
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Correo@gmail.com"
                className="w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

            {/* DUI */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                DUI
              </label>

              <input
                type="text"
                name="dui"
                value={form.dui}
                onChange={handleChange}
                placeholder="00000000-0"
                className="w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

                       {/* EDAD */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Edad
              </label>

              <input
                type="number"
                name="age"
                value={form.age}
                onChange={handleChange}
                placeholder="Ingrese la edad"
                className="w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

          </div>

          {/* BOTONES */}

          <div className="flex justify-center gap-6 mt-10">

            <button
              type="button"
              onClick={onClose}
              className="w-40 py-3 rounded-lg border-2 border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-40 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
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
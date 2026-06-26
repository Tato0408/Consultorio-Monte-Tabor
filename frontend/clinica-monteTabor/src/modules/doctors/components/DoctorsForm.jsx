import React, {
  useEffect,
  useState,
} from "react";

import { Plus, X } from "lucide-react";
import { useDoctors } from "../hooks/useDoctors";

const DoctorForm = ({
  isOpen,
  onClose,
  doctor,
}) => {
  const {
    createDoctor,
    updateDoctor,
  } = useDoctors();

  const [loading, setLoading] =
    useState(false);

  const [doctorImage, setDoctorImage] =
    useState(null);

  const [licenseImage, setLicenseImage] =
    useState(null);

  const [formData, setFormData] =
    useState({
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

  useEffect(() => {
    if (doctor) {
      setFormData({
        name: doctor.name || "",
        last_name:
          doctor.last_name || "",
        dui: doctor.dui || "",
        birth_date:
          doctor.birth_date
            ?.split("T")[0] || "",
        gender:
          doctor.gender ||
          "Masculino",
        phone:
          doctor.phone || "",
        email:
          doctor.email || "",
        license_number:
          doctor.license_number ||
          "",
        password: "",
      });
    } else {
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

      setDoctorImage(null);
      setLicenseImage(null);
    }
  }, [doctor]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleSubmit = async (
    e
  ) => {
    e.preventDefault();

    try {
      setLoading(true);

      const data =
        new FormData();

      Object.entries(
        formData
      ).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null
        ) {
          data.append(
            key,
            value
          );
        }
      });

      if (doctorImage) {
        data.append(
          "doctorImage",
          doctorImage
        );
      }

      if (licenseImage) {
        data.append(
          "licenseImage",
          licenseImage
        );
      }

     if (doctor) {
  await updateDoctor(
    doctor._id,
    data
  );
} else {
  await createDoctor(
    data
  );
}

onClose();

setTimeout(() => {
  window.location.reload();
}, 300);

      alert(
        error.message ||
          "Error al guardar"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const profilePreview =
    doctorImage
      ? URL.createObjectURL(
          doctorImage
        )
      : doctor?.img_url;

  const licensePreview =
    licenseImage
      ? URL.createObjectURL(
          licenseImage
        )
      : doctor?.license_url;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">

      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl p-8">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">
            {doctor
              ? "Editar Doctor"
              : "Agregar Doctor"}
          </h2>

          <button
            onClick={onClose}
          >
            <X />
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
        >
          <div className="grid grid-cols-2 gap-8">

            {/* IZQUIERDA */}
            <div>

              {/* FOTO */}
              <div className="flex justify-center mb-8">
                <div className="relative">

                  <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border">

                    {profilePreview ? (
                      <img
                        src={
                          profilePreview
                        }
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
                      accept="image/*"
                      hidden
                      onChange={(
                        e
                      ) =>
                        setDoctorImage(
                          e.target
                            .files[0]
                        )
                      }
                    />
                  </label>

                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label>
                    Nombres
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={
                      formData.name
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>

                <div>
                  <label>
                    Apellidos
                  </label>

                  <input
                    type="text"
                    name="last_name"
                    value={
                      formData.last_name
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>

                <div>
                  <label>
                    Teléfono
                  </label>

                  <input
                    type="text"
                    name="phone"
                    value={
                      formData.phone
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>

                <div>
                  <label>
                    Correo
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={
                      formData.email
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>

                <div>
                  <label>
                    Género
                  </label>

                  <select
                    name="gender"
                    value={
                      formData.gender
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full border rounded-lg p-2"
                  >
                    <option>
                      Masculino
                    </option>

                    <option>
                      Femenino
                    </option>
                  </select>
                </div>

                <div>
                  <label>
                    Fecha de nacimiento
                  </label>

                  <input
                    type="date"
                    name="birth_date"
                    value={
                      formData.birth_date
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>

                {!doctor && (
                  <div className="col-span-2">
                    <label>
                      Contraseña
                    </label>

                    <input
                      type="password"
                      name="password"
                      value={
                        formData.password
                      }
                      onChange={
                        handleChange
                      }
                      className="w-full border rounded-lg p-2"
                      required
                    />
                  </div>
                )}

              </div>
            </div>

            {/* DERECHA */}
            <div>

              <div className="grid grid-cols-2 gap-4 mb-6">

                <div>
                  <label>
                    DUI
                  </label>

                  <input
                    type="text"
                    name="dui"
                    value={
                      formData.dui
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>

                <div>
                  <label>
                    N° Licencia
                  </label>

                  <input
                    type="text"
                    name="license_number"
                    value={
                      formData.license_number
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>

              </div>

              <label className="block mb-2">
                Imagen de Licencia
              </label>

              <div className="border rounded-xl h-72 overflow-hidden bg-slate-50 flex items-center justify-center">

                {licensePreview ? (
                  <img
                    src={
                      licensePreview
                    }
                    alt="Licencia"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <label className="cursor-pointer text-blue-600 font-medium">
                    + Subir imagen

                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(
                        e
                      ) =>
                        setLicenseImage(
                          e.target
                            .files[0]
                        )
                      }
                    />
                  </label>
                )}

              </div>

              {licensePreview && (
                <input
                  type="file"
                  accept="image/*"
                  className="mt-3"
                  onChange={(e) =>
                    setLicenseImage(
                      e.target
                        .files[0]
                    )
                  }
                />
              )}

            </div>

          </div>

          {/* BOTONES */}
          <div className="flex justify-end gap-4 mt-8">

            <button
              type="button"
              onClick={onClose}
              className="border border-blue-600 text-blue-600 px-6 py-2 rounded-lg"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                loading
              }
              className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              {loading
                ? "Guardando..."
                : doctor
                ? "Editar"
                : "Guardar"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
};

export default DoctorForm;
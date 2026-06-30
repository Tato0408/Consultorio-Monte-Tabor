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
  const { createDoctor, updateDoctor } = useDoctors();

  const [loading, setLoading] = useState(false);
  const [doctorImage, setDoctorImage] = useState(null);
  const [licenseImage, setLicenseImage] = useState(null);

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

  const [profilePreview, setProfilePreview] = useState("");
  const [licensePreview, setLicensePreview] = useState("");

  // ==========================================
  // 1. CARGAR DATOS DEL DOCTOR AL EDITAR
  // ==========================================
  useEffect(() => {
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

    // Limpiar archivos seleccionados al abrir/cerrar modal
    setDoctorImage(null);
    setLicenseImage(null);
  }, [doctor, isOpen]);

  // ==========================================
  // 2. PREVISUALIZACIÓN DE IMÁGENES (SEGURO)
  // ==========================================
  useEffect(() => {
    if (!doctorImage) {
      setProfilePreview(doctor?.img_url || "");
      return;
    }

    const objectUrl = URL.createObjectURL(doctorImage);
    setProfilePreview(objectUrl);

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

  // ==========================================
  // 3. MANEJADORES DE EVENTOS
  // ==========================================
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const data = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        // Al editar, no enviamos la contraseña si se dejó en blanco
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
      onClose();
    } catch (error) {
      console.error(error);
      showError(
        "Error",
        error.message || "No se pudo guardar el doctor."
      );
    } finally {
      setLoading(false);
    }
  };

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
import { useState } from "react";
import { X, Loader2, UserPen } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";

// Máscaras de teléfono/DUI: mismo criterio ya usado en Doctors/Nurses/Receptionist/Patients Form
// (solo dígitos, formato fijo con guión).
const maskPhone = (raw) => {
  let digits = raw.replace(/\D/g, "").slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
};
const maskDui = (raw) => {
  let digits = raw.replace(/\D/g, "").slice(0, 9);
  return digits.length > 8 ? `${digits.slice(0, 8)}-${digits.slice(8)}` : digits;
};

const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

// Modal compacto para editar los datos personales del paciente — abierto desde el lápiz
// "Editar expediente" del encabezado (RecordsLayout.jsx). PUT /patients/:id ya acepta todos
// estos campos, no hizo falta backend nuevo.
const EditPatientModal = ({ isOpen, onClose, patient, onSaved }) => {
  const toInputDate = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");
  const [form, setForm] = useState({
    name: patient?.nombre || "",
    last_name: patient?.apellido || "",
    dui: patient?.dui || "",
    phone: patient?.telefono || "",
    email: patient?.email || "",
    birth_date: toInputDate(patient?.birthDate),
    gender: patient?.sexo || "",
    // patient.tipoSangre cae en "—" cuando no está definido (ver useRecords.js) — no es una
    // opción válida del <select>, así que se trata como vacío.
    blood_type: BLOOD_TYPES.includes(patient?.tipoSangre) ? patient.tipoSangre : "",
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const close = () => { if (!loading) onClose(); };

  const handleSave = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await apiClient(`/patients/${patient.id}`, {
        method: "PUT",
        body: form,
      });
      showSuccess("Datos del paciente actualizados correctamente");
      onSaved?.();
      close();
    } catch (err) {
      showError(err.message || "No se pudieron actualizar los datos del paciente");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={close}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <UserPen className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Editar datos del paciente</h2>
        </div>

        <fieldset disabled={loading} className="contents">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Nombres</label>
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Apellidos</label>
              <input type="text" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">DUI</label>
              <input type="text" inputMode="numeric" placeholder="00000000-0" value={form.dui} onChange={(e) => set("dui", maskDui(e.target.value))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Teléfono</label>
              <input type="text" inputMode="numeric" placeholder="0000-0000" value={form.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold text-slate-500">Correo electrónico</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Fecha de nacimiento</label>
              <input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Género</label>
              <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={inputClass}>
                <option value="">Selecciona</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            {/* Dropdown en vez de la grilla de círculos de BloodTypeModal.jsx (la de la interfaz
                de Consultas): aquí ya hay varios otros campos en el mismo modal chico, así que se
                mantiene como una fila más de una sola línea para no hacerlo más alto. */}
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold text-slate-500">Tipo de sangre</label>
              <select value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)} className={inputClass}>
                <option value="">Selecciona</option>
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </button>
        </fieldset>
      </div>
    </div>
  );
};

export default EditPatientModal;
